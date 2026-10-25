import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const USERS = [
  { name: "Alice Demo", email: "alice@demo.com" },
  { name: "Bob Demo", email: "bob@demo.com" },
  { name: "Carol Demo", email: "carol@demo.com" },
];

async function main() {
  for (const u of USERS) {
    await prisma.user.upsert({ where: { email: u.email }, update: { name: u.name }, create: u });
  }
  console.log(`Seeded ${USERS.length} users`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
