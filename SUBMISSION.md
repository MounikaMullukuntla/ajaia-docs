# Submission: Ajaia Docs

## Links

| | |
|---|---|
| Live app | `https://ajaia-docs-tawny.vercel.app/login` |
| Walkthrough video | see [VIDEO.txt](VIDEO.txt) |
| Source code | this folder (also at https://github.com/MounikaMullukuntla/ajaia-docs) |

## Test accounts

No passwords. Choose an account on the sign-in page and use Switch user in the header to change accounts.

| Account | Seeded access |
|---|---|
| Alice (`alice@demo.com`) | Owner of "Welcome to Ajaia Docs"; Viewer on "Bob's meeting notes" |
| Bob (`bob@demo.com`) | Owner of "Bob's meeting notes"; Editor on Welcome |
| Carol (`carol@demo.com`) | Viewer on Welcome |

## What's included

| Item | Location |
|---|---|
| Source code | `src/`, `prisma/`, config files |
| Setup and run instructions | [README.md](README.md) |
| Architecture note | [ARCHITECTURE.md](ARCHITECTURE.md) |
| AI workflow note | [AI_WORKFLOW.md](AI_WORKFLOW.md) |
| This file | SUBMISSION.md |
| Walkthrough video URL | [VIDEO.txt](VIDEO.txt) |
| Screenshots | `screenshots/` |
| Automated tests | `src//*.test.ts` (30 tests, `npm test`) |

## What works end to end

- Documents: create, rename, edit, autosave, reopen and delete.
- Rich text: bold, italic, underline, headings H1–H3, bulleted and numbered lists, undo/redo.
- File import: `.txt`, `.md` and `.docx` (max 2 MB) become a new editable document, with a progress bar and clear errors.
- Sharing:
  - the owner shares by email as Viewer or Editor, changes roles and removes access
  - the dashboard separates My documents from Shared with me
- Access control:
  - enforced on every API route
  - viewers get a read-only editor; editors can't share or delete
  - users without access get "not found"
- Persistence: PostgreSQL. Formatting is kept exactly (stored as editor JSON).
- Quality: zod validation, consistent error messages, 30 automated tests, and CI on every push.
- Stretch goal done: role-based sharing permissions beyond basic access.
