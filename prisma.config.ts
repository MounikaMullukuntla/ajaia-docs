// Prisma CLI settings (replaces the old "prisma" block in package.json).
// With a config file, Prisma no longer reads .env on its own, so load it here.
// On Vercel there is no .env file and DATABASE_URL comes from project settings.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
