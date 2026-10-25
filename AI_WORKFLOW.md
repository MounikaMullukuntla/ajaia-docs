# AI workflow note

## Tools used

- Claude Code (Claude Opus, in VS Code): planning, writing code, tests, debugging, and docs.


## How I worked with it

I used the AI as a pair programmer and kept the product decisions myself. I:
1. had it produce a step-by-step plan from the brief, then reviewed and reordered it
2. ran one step at a time (login, access control, API, editor, import, tests, dashboard, styling)
3. tried each step in the app, then committed and pushed

## Where AI materially sped things up

- Boilerplate with clear patterns: API route handlers, zod schemas, the error-handling helper, and the Prisma seed.
- UI building blocks: the editor toolbar, share panel, autosave hook, upload progress bar, and the single-palette restyle.
- Tests: a role × action test matrix, route-level tests with an in-memory database, and scripted end-to-end checks against the running server.
- Debugging deployment:
  - The Vercel logs showed "Can't reach database server". It identified that Supabase's direct connection is IPv6-only, which Vercel can't reach, and pointed to the pooler connection string.
  - It explained and fixed the npm `install-scripts` and Prisma config deprecation warnings in the build log.

## What I changed or rejected

- Sharing model: the first version gave every shared user full edit access. I asked for role-based access (viewer / editor / owner) and enforcement on view, edit and delete. That became the design.
- Missing dashboard: the plan had the dashboard as a separate step and I skipped it at first. During manual testing, a document I shared with Bob didn't appear anywhere, which showed the gap. We confirmed the data was saved, then built the dashboard.
- Look and feel: the first UI used default grey and blue styles. I asked for a simple, elegant design with a single colour palette.
- Smaller fixes I asked for: a pointer cursor on buttons and a percentage loader for uploads.


## Corrections made during review

These came up while checking the AI's output:
- Underline lost on .docx import: the Word converter drops underline by default. A style mapping keeps it, and an end-to-end test with a real `.docx` confirms bold, italic and underline all survive.
- Type mismatch: zod's output type didn't match Prisma's JSON column type. It was fixed in the schema instead of being cast away in each route.
- Unverified tool output: the npm warning named a command that differed from npm's own docs. The docs were checked before changing anything, rather than trusting the first answer.

## How I verified correctness and quality

- Automated tests: 30 tests, including route-level checks that each role gets the right status code and that data really doesn't change when an action is blocked.
- Checking the tests: I removed a permission check on purpose, confirmed the tests failed, then restored it.
- End-to-end scripts against the running app: 31 API checks covering the full share / promote / revoke / delete lifecycle, and real `.txt`, `.md` and `.docx` uploads checked in the database.
- Manual testing in the browser: each role's view, sharing between accounts, import, and autosave. This is how I found the missing dashboard.
- CI: type check, lint, tests and production build on every push.
