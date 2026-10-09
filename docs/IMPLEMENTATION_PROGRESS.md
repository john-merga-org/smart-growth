# Implementation Progress

A running log of building the platform described in [PLATFORM_DESIGN.md](PLATFORM_DESIGN.md). Update it at the end of every work session: what's done, what's next, and every place the build deviates from the design.

**Current target:** v1 is built and working locally. Next: deploy, then v1.5 (see "Next up").

## Status

| # | v1 item | Status | Where |
|---|---|---|---|
| 0 | Repo: git init, `content/` layout, original Markdown committed | ✅ | |
| 1 | App scaffold, auth, PWA, course structure from MDX, course/module pages | ✅ | `src/proxy.ts`, `src/lib/auth.ts`, `src/app/manifest.ts`, `public/sw.js`, `src/app/(app)/c/` |
| 2 | Lesson reader: TOC, mark read, commit-before-reveal drills, `<Resource>` | ✅ | `src/app/(app)/c/[course]/[unit]`, `src/components/blocks/` |
| 3 | Highlights, margin notes, notebook, Struggles log | ✅ | `src/components/unit/highlights.tsx`, `src/lib/anchoring.ts`, `/notebook`, `/progress` |
| 4 | DSA problem tracker: timer state machine, flags, ladder, mistakes log | ✅ | `src/lib/srs/attempt.ts`, `src/lib/srs/ladder.ts`, `/problems/[key]` |
| 5 | Today queue: caps, backlog mode, session suggestion, time box | ✅ | `src/lib/srs/today.ts`, `src/lib/server/today.ts`, `/` |
| 6 | FSRS cards | ✅ | `src/lib/srs/cards.ts`, `/review` |
| 7 | Quizzes (all auto-graded types + self-graded Explain) | ✅ | `src/components/blocks/quiz.tsx`, `src/lib/grading.ts` |
| 8 | Checkpoint flow + soft gate | ✅ | `src/components/blocks/practice.tsx`, `courseSummary()` in `src/lib/server/learn.ts` |
| 9 | Progress page (replaces PROGRESS.md) | ✅ | `/progress`, `src/lib/server/progress.ts` |
| 10 | Content migration: DSA 00, DSA 01, Frontend 01 → MDX; README → `course.yaml` + `overview.mdx` | ✅ | `content/` |
| — | Deploy to Vercel + Supabase | ⬜ needs the user's accounts | `app/README.md` |

## How it was verified (2026-10-09)

- **Unit tests:** 26 passing (`npm test`). They cover:
  - the ladder: +1/+3/+7/+14/+30/+90, resets, late re-solves, the needed-solution redo
  - the timer: every phase, flags, pause cap, abandon at 2×
  - the Today queue: caps, lateness ordering, backlog, time box
  - grading normalization
  - highlight anchoring: disambiguation, edits elsewhere, whitespace, orphans
- **Type and build checks:** `tsc` clean. `next build` is clean, and every DB-backed route is dynamic.
- **Content checks:** `content:check` passes for all 5 MDX files:
  - DSA 00: 41 cards, 10 quiz, 8 drills, 3 problems, 10 asks
  - DSA 01: 32 cards, 10 quiz, 7 drills, 10 asks
  - Frontend 01: 18 cards, 10 quiz, 6 drills, 10 asks
  - plus both overviews
- **End-to-end:** headless Chrome against both the dev server and `next start`:
  - mark read
  - a wrong quiz answer becomes a card, which shows up in Review and re-renders interactively
  - start an attempt → Done → ladder +1 due tomorrow; the mistake shows in the log
  - highlight → margin note
  - notebook, progress
  - login (wrong / right passcode)
  - mobile (390px): no horizontal overflow on any page
- The test data was deleted afterwards (`app/.data` removed). The first `npm run dev` starts with a fresh database.

## Deviations from the design (and why)

| Design said | Built instead | Why |
|---|---|---|
| Supabase auth (magic link / GitHub) | A single passcode (`APP_PASSWORD`) and an HMAC-signed 90-day session cookie | It's a single-user app, so there's no auth provider to configure. Works with any Postgres host |
| Supabase Postgres | Any Postgres via `DATABASE_URL`. Without it, **PGlite** (embedded Postgres in `app/.data/`) | No local Postgres server was available and disk space was tight. The schema and migrations are the same |
| Velite for MDX | `@mdx-js/mdx` evaluated at request time (cached by source) plus a custom remark plugin (`remark-unit.ts`) shared by the indexer and the renderer | One less build step. Content edits show up without a rebuild, and section ids and block data can never drift apart |
| shadcn/ui | Hand-written Tailwind components (`src/components/ui.tsx`) | Fewer dependencies |
| Highlights "→ Notebook" action | Every highlight already appears in the Notebook automatically | The extra button was redundant |
| Checkpoint audio recording | Recorded and played back in the browser only; nothing is uploaded | Keeps it private and needs no storage. Upload can be added later |
| Re-solving before it's due | Allowed as **practice**: logged, but the ladder doesn't move | So doing it early can't cheat the spacing |
| (not in design) | **Discard** an attempt started by accident (only within its first 3 minutes) | Small, practical addition |

## Known limitations / follow-ups

- Highlights work only in lesson prose. Text inside interactive blocks (quizzes, drills, cards) is excluded, because it changes as you use those blocks.
- Lesson pages are large (~700–900 KB uncompressed) because the RSC payload repeats the MDX output. It's fine on wifi; for mobile data, consider streaming sections or `content-visibility`.
- Grading happens in the browser. That's acceptable for a single user.
- Push notifications aren't wired up yet (v1.5). The timer uses the browser Notification API while its tab is open.
- Milestone pages show a placeholder until exam mode arrives (v2).

## Next up

1. **Deploy:** the user creates Supabase and Vercel accounts, then follows `app/README.md`.
2. **v1.5:**
   - `ArrayViz` + `CallStackViz` steppers (needed from Module 02 on)
   - Sandpack `<Playground>`
   - AI hint ladder, explain-this, and solution review (Anthropic SDK, with the monthly cap from Settings)
   - Web push notifications
   - In-lesson surprise questions
3. **Content:** write DSA Module 02 and Frontend Module 02 in the CLAUDE.md format.

## Log

### 2026-10-09
- Design interview completed and written to `PLATFORM_DESIGN.md`.
- `git init`; moved `dsa/` and `frontend/` into `content/`; committed the original Markdown.
- Scaffolded `app/` (Next.js 16.4, React 19, Tailwind 4, Drizzle, PGlite, ts-fsrs).
- Converted the three existing modules plus both READMEs to MDX and `course.yaml` (done by 3 parallel agents, following the CLAUDE.md authoring spec).
- Built all of v1 (items 1–10) and verified it as described above.
