# Architecture note

## What I prioritized

The brief asks for depth in a few areas over shallow coverage, so I put the time into three things:

1. A complete core loop. Create a document, edit it with formatting, autosave, find it again, and reopen it with formatting intact.
2. Sharing that is enforced, not just displayed. Every read and write goes through one permission table, and tests check it at the API level.
3. A deployable, testable build. Live on Vercel, with seeded accounts so reviewers can test sharing in one browser, and checks running on every push.

I went past basic sharing in one area: role-based permissions (Viewer / Editor / Owner), one of the listed stretch goals. It builds directly on the access-control work and makes sharing realistic.

## System overview

```
Browser (React, Tiptap editor)
   │  fetch / server components
   ▼
Next.js on Vercel
   ├─ Pages (server components): dashboard, editor, sign-in
   ├─ API routes: /api/documents, /api/documents/:id, /shares, /api/import
   └─ lib/: access rules · validation · import conversion · session
   │  Prisma
   ▼
PostgreSQL (Supabase)
   User ── owns ──▶ Document ◀── DocumentShare (userId, role: VIEWER | EDITOR)
```

One Next.js app serves both the UI and the API. That keeps the app to one deploy, one language, and shared types between client and server.

## Key decisions

### 1. Document content stored as Tiptap JSON
Content is saved in a Postgres `Json` column in the editor's own format, not as HTML.
- Why: formatting comes back exactly as saved, with no HTML parsing on reopen. The server can also check the structure before saving.
- Tradeoff: the format is tied to Tiptap. Exporting to HTML or Markdown would need a conversion step, which Tiptap provides.

### 2. Per-document roles, with one permission table
`src/lib/access.ts` defines the roles and what each can do:

| Role | View | Edit / rename | Share | Delete |
|---|---|---|---|---|
| Owner | ✓ | ✓ | ✓ | ✓ |
| Editor | ✓ | ✓ | | |
| Viewer | ✓ | | | |

- Roles live on the share, not the user, so Bob can edit one doc and only view another, as in Google Docs.
- New shares default to Viewer (least privilege).
- The rules are plain functions with no database access, so they're easy to test. Every API route and page uses them, and the UI uses the same permissions to hide or disable controls.

### 3. 404 instead of 403 for documents you can't see
If a user has no access, the API answers "not found", exactly as for a document that doesn't exist. This avoids revealing which documents exist. A 403 is only returned when you can see the document but your role doesn't allow the action, e.g. a viewer trying to save.

### 4. Simulated sign-in
Users pick a seeded account and their id is stored in an HTTP-only cookie. The brief explicitly allows this, and it lets reviewers test sharing in one browser with "Switch user".
- Tradeoff: the cookie isn't signed, so a user could change it by hand. That's acceptable for a demo with seeded accounts but not for production. It's the first thing I'd replace (see "Next steps").

### 5. Autosave instead of real-time collaboration
The editor saves about 1 second after typing stops:
- one request at a time
- edits made during a save go into the next one
- failed saves keep their changes and show a Retry button
- the browser warns before leaving with unsaved changes

- Tradeoff: if two editors type at the same moment, the last save wins. Real-time co-editing (CRDTs such as Yjs, plus a WebSocket server) is a large, separate piece of work. I judged a reliable save model to be more valuable within the timebox.

### 6. File import creates a new document
`.txt`, `.md` and `.docx` are converted to HTML (plain-text escaping, `marked`, `mammoth`), then to Tiptap JSON using the same extension list as the editor.
- Imported content can only contain things the editor supports. Anything else, such as scripts, images or tables, is dropped at that step, which also acts as sanitization.
- Validation: a 2 MB limit, an extension allowlist, a check for binary files renamed to `.txt`, a check that `.docx` files start with the zip signature, and empty and no-text checks. These run both in the browser (for quick feedback) and on the server.
- The upload uses `XMLHttpRequest` so the UI can show a percentage progress bar.

### 7. Validation and errors
- All API input is checked with zod (`src/lib/validation.ts`): title length, document shape and size (1 MB), email and role.
- Every error has the same shape, `{ "error": "message" }`, so the UI can display it directly.
- Unexpected errors are logged on the server and return a generic 500, so internal details aren't exposed.

## Testing

| Layer | What's covered |
|---|---|
| Unit: `access.test.ts` | Every role × every action, users without access, signed-out requests, role changes and removal |
| Unit: `validation.test.ts` | Titles, document shape and size, email normalization, roles |
| Unit: `import.test.ts` | Markdown structure, script removal, plain-text paragraphs, every rejection case |
| Route: `api/documents/api.test.ts` | Calls the real route handlers with an in-memory database: status codes and whether data changed, for owner, editor, viewer and outsider |
| CI | GitHub Actions runs type check, lint, tests and build on every push |

To confirm the route tests catch regressions, I temporarily removed the "viewers can't edit" check. The tests failed as expected, then passed again once it was restored. I also ran scripted end-to-end checks against a running server (the full API lifecycle, and real `.txt`/`.md`/`.docx` uploads) and tested the UI by hand.

