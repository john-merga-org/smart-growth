# Implementation Progress

A running log of building the platform described in [PLATFORM_DESIGN.md](PLATFORM_DESIGN.md). Update it at the end of every work session: what's done, what's next, and every place the build deviates from the design.

**Current target:** v1 (see design §11)

## Status

| # | v1 item | Status |
|---|---|---|
| 0 | Repo: git init, `content/` layout, original Markdown committed | ✅ done |
| 1 | App scaffold, auth, PWA, course structure from MDX, course/module pages | ⏳ in progress |
| 2 | Lesson reader: TOC, mark read, commit-before-reveal drills, `<Resource>` | ⬜ |
| 3 | Highlights, margin notes, notebook, Struggles log | ⬜ |
| 4 | DSA problem tracker: timer state machine, flags, ladder, mistakes log | ⬜ |
| 5 | Today queue: caps, backlog mode, session suggestion, time box | ⬜ |
| 6 | FSRS cards | ⬜ |
| 7 | Quizzes (all auto-graded types + self-graded Explain) | ⬜ |
| 8 | Checkpoint flow + soft gate | ⬜ |
| 9 | Progress page (replaces PROGRESS.md) | ⬜ |
| 10 | Content migration: DSA 00, DSA 01, Frontend 01 → MDX; README → `course.yaml` + `overview.mdx` | ⬜ |

## Deviations from the design (and why)

| Design said | Built instead | Why |
|---|---|---|
| Supabase auth (magic link / GitHub) | A single passcode (`APP_PASSWORD`) and an HMAC-signed session cookie | It's a single-user app, so there's no auth provider to configure. Works with any Postgres host |
| Supabase Postgres | Any Postgres via `DATABASE_URL`. Without it, local dev uses **PGlite** (embedded Postgres, data in `app/.data/`) | No local Postgres server or Docker image was available, and disk space was tight. The schema and SQL are the same |
| Velite for MDX | `@mdx-js/mdx` compiled at request time (cached) plus a custom content index | One less build step. Content changes show up without a rebuild |
| shadcn/ui | Hand-written Tailwind components | Fewer dependencies (disk space is tight). Can be swapped in later |

## Log

### 2026-10-09
- Design interview completed and written to `PLATFORM_DESIGN.md`.
- `git init`; moved `dsa/` and `frontend/` into `content/`; committed the original Markdown.
- Scaffolded `app/` (Next.js 16.4, React 19, Tailwind 4, Drizzle, PGlite, ts-fsrs).
