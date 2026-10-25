// Route-level tests: call the real API handlers and check that RBAC is enforced end to end
// (status codes and what actually changes in the data). The database and session are
// replaced with an in-memory fake, so these run without Postgres.
import { beforeEach, describe, expect, it, vi } from "vitest";

type User = { id: string; name: string; email: string };
type Doc = { id: string; title: string; content: unknown; ownerId: string; updatedAt: Date };
type Share = { documentId: string; userId: string; role: "VIEWER" | "EDITOR" };

const state = vi.hoisted(() => ({
  currentUser: null as User | null,
  users: [] as User[],
  docs: [] as Doc[],
  shares: [] as Share[],
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getCurrentUser: async () => state.currentUser }));
vi.mock("@/lib/db", () => {
  const userById = (id: string) => state.users.find((u) => u.id === id)!;
  const findShare = (key: { documentId: string; userId: string }) =>
    state.shares.find((s) => s.documentId === key.documentId && s.userId === key.userId);
  const shareResult = (s: Share) => ({ role: s.role, user: userById(s.userId) });

  return {
    prisma: {
      document: {
        findUnique: async ({ where }: { where: { id: string } }) => {
          const doc = state.docs.find((d) => d.id === where.id);
          if (!doc) return null;
          return {
            ...doc,
            owner: userById(doc.ownerId),
            shares: state.shares
              .filter((s) => s.documentId === doc.id)
              .map((s) => ({ userId: s.userId, role: s.role, user: userById(s.userId) })),
          };
        },
        update: async ({ where, data }: { where: { id: string }; data: Partial<Doc> }) => {
          const doc = state.docs.find((d) => d.id === where.id)!;
          Object.assign(doc, data, { updatedAt: new Date() });
          return { id: doc.id, title: doc.title, updatedAt: doc.updatedAt };
        },
        delete: async ({ where }: { where: { id: string } }) => {
          state.docs = state.docs.filter((d) => d.id !== where.id);
          state.shares = state.shares.filter((s) => s.documentId !== where.id);
        },
      },
      user: {
        findUnique: async ({ where }: { where: { email: string } }) =>
          state.users.find((u) => u.email === where.email) ?? null,
      },
      documentShare: {
        upsert: async (args: {
          where: { documentId_userId: { documentId: string; userId: string } };
          update: { role: Share["role"] };
          create: Share;
        }) => {
          const existing = findShare(args.where.documentId_userId);
          if (existing) {
            existing.role = args.update.role;
            return shareResult(existing);
          }
          state.shares.push({ ...args.create });
          return shareResult(args.create);
        },
        update: async (args: {
          where: { documentId_userId: { documentId: string; userId: string } };
          data: { role: Share["role"] };
        }) => {
          const share = findShare(args.where.documentId_userId)!;
          share.role = args.data.role;
          return shareResult(share);
        },
        delete: async (args: { where: { documentId_userId: { documentId: string; userId: string } } }) => {
          const key = args.where.documentId_userId;
          state.shares = state.shares.filter(
            (s) => !(s.documentId === key.documentId && s.userId === key.userId),
          );
        },
      },
    },
  };
});

// Import the handlers after the mocks are registered.
const docRoute = await import("./[id]/route");
const sharesRoute = await import("./[id]/shares/route");
const shareRoute = await import("./[id]/shares/[userId]/route");

const alice: User = { id: "alice", name: "Alice", email: "alice@demo.com" }; // owner
const bob: User = { id: "bob", name: "Bob", email: "bob@demo.com" }; // editor
const carol: User = { id: "carol", name: "Carol", email: "carol@demo.com" }; // viewer
const dave: User = { id: "dave", name: "Dave", email: "dave@demo.com" }; // no access

const DOC_ID = "doc1";
const ctx = { params: Promise.resolve({ id: DOC_ID }) };
const shareCtx = (userId: string) => ({ params: Promise.resolve({ id: DOC_ID, userId }) });
const req = (method: string, body?: unknown) =>
  new Request(`http://test/api/documents/${DOC_ID}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const as = (user: User | null) => {
  state.currentUser = user;
};
const doc = () => state.docs.find((d) => d.id === DOC_ID);

beforeEach(() => {
  state.users = [alice, bob, carol, dave];
  state.docs = [
    { id: DOC_ID, title: "Plan", content: { type: "doc", content: [] }, ownerId: "alice", updatedAt: new Date() },
  ];
  state.shares = [
    { documentId: DOC_ID, userId: "bob", role: "EDITOR" },
    { documentId: DOC_ID, userId: "carol", role: "VIEWER" },
  ];
  state.currentUser = null;
});

describe("GET /api/documents/:id", () => {
  it("requires sign-in", async () => {
    as(null);
    expect((await docRoute.GET(req("GET"), ctx)).status).toBe(401);
  });

  it("hides the document from users without access (404, not 403)", async () => {
    as(dave);
    const res = await docRoute.GET(req("GET"), ctx);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Document not found" });
  });

  it("returns the caller's role and permissions", async () => {
    as(carol);
    const body = await (await docRoute.GET(req("GET"), ctx)).json();
    expect(body.role).toBe("viewer");
    expect(body.permissions).toEqual(["view"]);
  });
});

describe("PATCH /api/documents/:id", () => {
  it("lets the editor save changes", async () => {
    as(bob);
    const res = await docRoute.PATCH(req("PATCH", { title: "Plan v2" }), ctx);
    expect(res.status).toBe(200);
    expect(doc()?.title).toBe("Plan v2");
  });

  it("blocks the viewer and leaves the document unchanged", async () => {
    as(carol);
    const res = await docRoute.PATCH(req("PATCH", { title: "Hacked" }), ctx);
    expect(res.status).toBe(403);
    expect(doc()?.title).toBe("Plan");
  });

  it("returns 404 for users without access", async () => {
    as(dave);
    expect((await docRoute.PATCH(req("PATCH", { title: "Hacked" }), ctx)).status).toBe(404);
    expect(doc()?.title).toBe("Plan");
  });

  it("rejects invalid input with a message", async () => {
    as(alice);
    const res = await docRoute.PATCH(req("PATCH", { title: "   " }), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/empty/);
  });
});

describe("DELETE /api/documents/:id", () => {
  it("only the owner can delete", async () => {
    for (const user of [bob, carol]) {
      as(user);
      expect((await docRoute.DELETE(req("DELETE"), ctx)).status).toBe(403);
    }
    expect(doc()).toBeDefined();

    as(alice);
    expect((await docRoute.DELETE(req("DELETE"), ctx)).status).toBe(204);
    expect(doc()).toBeUndefined();
  });
});

describe("sharing", () => {
  it("only the owner can share", async () => {
    as(bob);
    const res = await sharesRoute.POST(req("POST", { email: "dave@demo.com" }), ctx);
    expect(res.status).toBe(403);
    expect(state.shares).toHaveLength(2);
  });

  it("granting editor access lets that user edit", async () => {
    as(alice);
    const res = await sharesRoute.POST(req("POST", { email: "dave@demo.com", role: "EDITOR" }), ctx);
    expect(res.status).toBe(201);

    as(dave);
    expect((await docRoute.PATCH(req("PATCH", { title: "Dave's edit" }), ctx)).status).toBe(200);
  });

  it("rejects sharing with yourself or an unknown email", async () => {
    as(alice);
    expect((await sharesRoute.POST(req("POST", { email: "alice@demo.com" }), ctx)).status).toBe(400);
    expect((await sharesRoute.POST(req("POST", { email: "nobody@demo.com" }), ctx)).status).toBe(404);
  });

  it("downgrading a role takes effect on the next request", async () => {
    as(alice);
    const res = await shareRoute.PATCH(req("PATCH", { role: "VIEWER" }), shareCtx("bob"));
    expect(res.status).toBe(200);

    as(bob);
    expect((await docRoute.PATCH(req("PATCH", { title: "x" }), ctx)).status).toBe(403);
  });

  it("removing access hides the document again", async () => {
    as(alice);
    expect((await shareRoute.DELETE(req("DELETE"), shareCtx("bob"))).status).toBe(204);

    as(bob);
    expect((await docRoute.GET(req("GET"), ctx)).status).toBe(404);
  });
});
