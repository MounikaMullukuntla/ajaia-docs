import { describe, it, expect } from "vitest";
import {
  can,
  canDelete,
  canEdit,
  canShare,
  canView,
  getRole,
  type Action,
  type DocumentAccessInfo,
} from "@/lib/access";

const doc: DocumentAccessInfo = {
  ownerId: "alice",
  shares: [
    { userId: "bob", role: "EDITOR" },
    { userId: "carol", role: "VIEWER" },
  ],
};

const ALL: Action[] = ["view", "edit", "share", "delete"];
const allowed = (userId: string | null) => ALL.filter((a) => can(userId, doc, a));

describe("document RBAC", () => {
  it("resolves each user's role", () => {
    expect(getRole("alice", doc)).toBe("owner");
    expect(getRole("bob", doc)).toBe("editor");
    expect(getRole("carol", doc)).toBe("viewer");
    expect(getRole("dave", doc)).toBeNull();
  });

  it("owner can view, edit, share and delete", () => {
    expect(allowed("alice")).toEqual(["view", "edit", "share", "delete"]);
  });

  it("editor can view and edit, but not share or delete", () => {
    expect(allowed("bob")).toEqual(["view", "edit"]);
    expect(canShare("bob", doc)).toBe(false);
    expect(canDelete("bob", doc)).toBe(false);
  });

  it("viewer can only view", () => {
    expect(allowed("carol")).toEqual(["view"]);
    expect(canEdit("carol", doc)).toBe(false);
  });

  it("users without a share and signed-out requests get nothing", () => {
    expect(allowed("dave")).toEqual([]);
    for (const id of [null, undefined, ""]) {
      expect(canView(id, doc)).toBe(false);
    }
  });

  it("changing or removing a share takes effect immediately", () => {
    const promoted: DocumentAccessInfo = {
      ...doc,
      shares: doc.shares.map((s) => (s.userId === "carol" ? { ...s, role: "EDITOR" } : s)),
    };
    expect(canEdit("carol", promoted)).toBe(true);

    const revoked: DocumentAccessInfo = {
      ...doc,
      shares: doc.shares.filter((s) => s.userId !== "bob"),
    };
    expect(canView("bob", revoked)).toBe(false);
  });
});
