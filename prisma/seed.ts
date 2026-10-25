import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const USERS = [
  { name: "Alice Demo", email: "alice@demo.com" },
  { name: "Bob Demo", email: "bob@demo.com" },
  { name: "Carol Demo", email: "carol@demo.com" },
];

// Tiptap JSON helpers for readable sample content.
const text = (t: string, marks?: { type: string }[]) => ({ type: "text", text: t, ...(marks && { marks }) });
const p = (...content: object[]) => ({ type: "paragraph", content });
const h = (level: number, t: string) => ({ type: "heading", attrs: { level }, content: [text(t)] });
const ul = (...items: string[]) => ({
  type: "bulletList",
  content: items.map((i) => ({ type: "listItem", content: [p(text(i))] })),
});

async function main() {
  const users: Record<string, { id: string }> = {};
  for (const u of USERS) {
    users[u.email] = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name },
      create: u,
    });
  }
  const alice = users["alice@demo.com"];
  const bob = users["bob@demo.com"];
  const carol = users["carol@demo.com"];

  // Fixed ids keep the seed idempotent: re-running resets these demo docs.
  const welcome = await prisma.document.upsert({
    where: { id: "seed-welcome" },
    update: {},
    create: {
      id: "seed-welcome",
      title: "Welcome to Ajaia Docs",
      ownerId: alice.id,
      content: {
        type: "doc",
        content: [
          h(1, "Welcome to Ajaia Docs"),
          p(text("Owned by Alice. Shared with "), text("Bob as editor", [{ type: "bold" }]), text(" and "), text("Carol as viewer", [{ type: "italic" }]), text(".")),
          h(2, "Try it"),
          ul("Sign in as Bob and edit this document", "Sign in as Carol: it is read-only", "Only Alice can share or delete it"),
        ],
      },
    },
  });

  const notes = await prisma.document.upsert({
    where: { id: "seed-bob-notes" },
    update: {},
    create: {
      id: "seed-bob-notes",
      title: "Bob's meeting notes",
      ownerId: bob.id,
      content: { type: "doc", content: [h(1, "Meeting notes"), p(text("Shared with Alice as viewer."))] },
    },
  });

  const shares = [
    { documentId: welcome.id, userId: bob.id, role: "EDITOR" as const },
    { documentId: welcome.id, userId: carol.id, role: "VIEWER" as const },
    { documentId: notes.id, userId: alice.id, role: "VIEWER" as const },
  ];
  for (const s of shares) {
    await prisma.documentShare.upsert({
      where: { documentId_userId: { documentId: s.documentId, userId: s.userId } },
      update: { role: s.role },
      create: s,
    });
  }

  console.log(`Seeded ${USERS.length} users, 2 documents, ${shares.length} shares`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
