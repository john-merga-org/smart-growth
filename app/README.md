# Smart Growth app

The Next.js app that renders `../content/` and tracks your learning. Design: `../docs/PLATFORM_DESIGN.md`. Build log: `../docs/IMPLEMENTATION_PROGRESS.md`.

## Run locally

```bash
cd app
npm install
npm run dev          # http://localhost:3000, passcode: dev
```

No database setup is needed: without `DATABASE_URL`, data lives in embedded Postgres (PGlite) under `app/.data/`. Delete that folder to start fresh.

## Check things

```bash
npm test                 # scheduler, timer, queue, grading, highlight anchoring
npm run typecheck
npm run content:check    # validates every course file
```

## Deploy (Vercel + Supabase)

1. **Supabase:** create a project, then copy the **transaction pooler** connection string (port 6543).
2. **Vercel:** import the repo.
   - Set **Root Directory** to `app`.
   - Keep "Include files outside the root directory" **enabled** (the courses live in `../content`).
3. **Environment variables:**

   | Variable | Value |
   |---|---|
   | `APP_PASSWORD` | your passcode |
   | `SESSION_SECRET` | output of `openssl rand -base64 32` |
   | `DATABASE_URL` | the Supabase URL from step 1 |

4. Deploy. Migrations in `drizzle/` run automatically on the first request.
5. On your phone, open the site → Share/menu → **Add to Home Screen**.

When you change `src/lib/db/schema.ts`, run `npm run db:generate` and commit the new file in `drizzle/`.
