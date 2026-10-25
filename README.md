# Ajaia Docs

A lightweight collaborative document editor: create and format documents, import files, and share them with other users as "viewers" or "editors".

Live app: `https://ajaia-docs-tawny.vercel.app/` · Demo accounts: Alice, Bob, Carol (no password, see below)


---

## Try it in 2 minutes

1. Open the live app and sign in as Alice.
2. Open "Welcome to Ajaia Docs". Edit it, try the toolbar, and rename it. Changes save automatically.
3. Click Share. Bob is already an Editor and Carol a Viewer. Add or change a role.
4. Click Switch user and sign in as Bob. The doc is under Shared with me, and Bob can edit it.
5. Switch to Carol. The same doc opens read-only.
6. Back on the dashboard, click Import file and upload a `.txt`, `.md`, or `.docx` file. It becomes a new document.

### Demo accounts

Sign-in is simulated: pick an account on the sign-in page. There are no passwords.

| Account | Email | Seeded access |
|---|---|---|
| Alice | `alice@demo.com` | Owns "Welcome to Ajaia Docs"; Viewer on Bob's notes |
| Bob | `bob@demo.com` | Owns "Bob's meeting notes"; Editor on Welcome |
| Carol | `carol@demo.com` | Viewer on Welcome |

## Features

- Documents: create, rename, edit, delete, and reopen documents. Changes autosave about 1 second after you stop typing, with a saved / saving / error status and a Retry button.
- Rich text: bold, italic, underline, headings (H1 to H3), bulleted and numbered lists, and undo/redo. Keyboard shortcuts and Markdown shortcuts (`# `, `- `, `1. `) work too.
- File import: `.txt`, `.md`, and `.docx`, max 2 MB. Each file becomes a new document you own. Headings, lists, bold, italic, and underline are kept. Images, tables, and other unsupported content are dropped.
- Sharing with roles: the owner shares by email as a Viewer (read-only) or Editor (can edit and rename), and can change roles or remove access. Only the owner can share or delete.
- Dashboard: "My documents" and "Shared with me" lists, each showing the owner, your role, and when the doc was last edited.

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Tiptap 2 (editor) · Prisma 6 + PostgreSQL (Supabase) · zod · Vitest · mammoth (.docx) · marked (.md) · Vercel · GitHub Actions

## Run locally

Requirements: Node.js 22+ and a PostgreSQL database. A free [Supabase](https://supabase.com) or [Neon](https://neon.tech) project works, or a local Postgres in Docker:


Steps:

```bash
git clone https://github.com/MounikaMullukuntla/ajaia-docs.git
cd ajaia-docs
npm install

cp .env.example .env
# Edit .env and set DATABASE_URL. For the Docker example:
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"

npx prisma migrate deploy   # create the tables
npm run db:seed             # demo users and documents
npm run dev                 # http://localhost:3000
```

Running `npm run db:seed` again resets the demo documents and their roles. It doesn't touch other documents.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm test` | Run the automated tests (Vitest; no database needed) |
| `npm run lint` | ESLint |
| `npm run build` | Production build |
| `npm run db:migrate` | Create a new migration after changing `prisma/schema.prisma` |
| `npm run db:deploy` | Apply existing migrations |
| `npm run db:seed` | Seed demo users and documents |

## Deployment (Vercel + Supabase)

1. Import the GitHub repo into Vercel.
2. Set the `DATABASE_URL` environment variable to Supabase's Transaction pooler connection string and add `?pgbouncer=true&connection_limit=1`.
   Supabase's direct connection (`db.<project>.supabase.co`) is IPv6-only and Vercel can't reach it.
3. Run migrations and the seed from your machine against the database (`npx prisma migrate deploy && npm run db:seed`).
4. Deploy. Every push to `main` redeploys.

## Project structure

```
prisma/
  schema.prisma          User, Document, DocumentShare (with VIEWER/EDITOR role)
  migrations/            SQL migrations
  seed.ts                Demo users, documents, and shares
src/
  app/
    page.tsx             Dashboard
    login/               Demo sign-in page and actions
    documents/[id]/      Editor page and "not found" page
    api/documents/       Documents and sharing API (+ route tests)
    api/import/          File import endpoint
  components/
    editor/              Editor, toolbar, share panel, autosave hook
  lib/
    access.ts            Roles and permissions (single source of truth)
    documents.ts         Permission-checked database queries
    validation.ts        zod input rules
    import.ts            .txt / .md / .docx to editor content
    session.ts           Demo session (cookie)
```

## More docs

- [ARCHITECTURE.md](ARCHITECTURE.md): design decisions, tradeoffs, and what was cut
- [AI_WORKFLOW.md](AI_WORKFLOW.md): how AI tools were used and checked
- [SUBMISSION.md](SUBMISSION.md): what's included, what works, and what's next
