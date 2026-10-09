# Smart Growth: Learning Platform Design

A personal learning platform for career growth, built for one user. It replaces Markdown course files and the hand-filled PROGRESS.md files with a web app that enforces the study method from the course READMEs automatically: timers, flags, spaced re-solves, review caps, and checkpoints.

Status: design agreed on 2026-10-09 (grill-me interview). Nothing built yet.

---

## 1. Core architecture

| Decision | Choice |
|---|---|
| Content source of truth | **MDX files in git** (`content/`). Content is code. |
| User activity | **Postgres** (progress, attempts, schedules, highlights, notes, cards, quiz results, flags) |
| Users | **Single user** (just me). Every table still has a `user_id` column, so multi-user later is a migration, not a rewrite |
| Hosting | Vercel + Supabase (Postgres + auth) |
| Access | Installable PWA on phone and laptop. Lesson pages are cached for offline reading; writes need a connection |
| Notifications | Web push (due reviews, timer events) |
| Builder | Claude builds the platform; I use it to learn |

### Stack
Next.js (App Router) + TypeScript · Tailwind + shadcn/ui · MDX via Velite · Supabase (Postgres + auth) + Drizzle ORM · `ts-fsrs` · Anthropic SDK · Sandpack (frontend playgrounds) · Pyodide (later) · Vercel.

### Repo layout
```
smart-growth/
├── app/                     # Next.js app
├── content/                 # all courses (source of truth)
│   ├── dsa/
│   │   ├── course.yaml      # roadmap: parts, units, milestones, hrs/week, timeline targets
│   │   ├── overview.mdx     # README prose (core idea, how to practice, rules)
│   │   └── phase-1-foundations/*.mdx
│   └── frontend/...
├── docs/PLATFORM_DESIGN.md  # this file
└── CLAUDE.md                # authoring guide for writing content with the MDX blocks
```

---

## 2. Content model

- One generic hierarchy: **Course → Part → Unit → Sections**. The UI renames the levels by course type:
  - `course`: Phase / Module (DSA, Frontend)
  - `book`: Part / Chapter (summary, quotes, cards, "apply it")
  - `track`: language tracks (e.g. Golang), with a code playground
- `course.yaml` declares the type, time budget (hrs/week), parts, units, milestones, and timeline targets ("by month 3 you should...").
- Units are MDX files that can use any block:

| Block | Purpose |
|---|---|
| `<Card>` | A spaced-repetition concept card |
| `<Quiz>` | Quiz questions (see §6) |
| `<Drill>` | An exercise with commit-before-reveal answer (replaces `<details>`) |
| `<Problem id pattern difficulty>` | A DSA problem with a timer (links to LeetCode) |
| `<Build>` | The unit project with an acceptance checklist and a repo link |
| `<Checkpoint>` | Out-loud questions with self-grading |
| `<Resource type time required>` | An external link (video, article, book chapter, tool), trackable |
| `<Media>` | A GIF, video, or Lottie |
| `ArrayViz`, `GridViz`, `TreeViz`, `GraphViz`, `StackViz`/`CallStackViz`, `LinkedListViz` | Step-through DSA visualizers |
| `<Playground>` | A Sandpack HTML/CSS/React sandbox |
| `<Quote>`, `<Apply>` | Book-course blocks |

- **Skill tags** (`hashing`, `css-layout`, `react-hooks`, ...) work across all courses.
- **Book ↔ course links**: e.g. a *Grokking* ch. 6 note links to DSA Module 15, and each side shows the other.
- External links are checked at build time; dead links get flagged.

---

## 3. DSA problem attempts (timer state machine)

Problems are solved on LeetCode; the platform tracks the attempt. An in-app Pyodide editor comes later for drills, `dsalib`, and blank-file re-solves.

**Time limits**

| | Easy | Medium | Hard |
|---|---|---|---|
| New problem | 15 min | 25 min | 40 min |
| Hint window (after the limit) | +10 | +10 | +10 |
| Re-solve | 10 min | 15 min | 25 min |

**New problem**
1. Working within the limit, with "Done" pressed and no hints: `alone ✓`, and the ladder starts.
2. At the limit, the platform prompts for ONE hint:
   - **Take hint:** +10 min, flagged `hinted`.
   - **Keep going:** flagged `overtime`.
3. At the limit + 10, the platform prompts to read the solution. The attempt is flagged `needed-solution`, and a **blank-file re-solve is auto-scheduled for tomorrow**. That re-solve counts as the real first solve.

**Re-solve**
- Within its limit with no hints: ✓, and the problem moves to the next interval.
- Over the limit or any hint: ✗, and the problem resets to +1.

**Ladder:** +1 → +3 → +7 → +14 → +30. A problem that passes +30 is **retired**. A retired problem gets one silent **+90 re-check**; failing it returns it to the ladder.

**Pause and abandon**
- One pause per attempt, max 10 min.
- An attempt left open auto-fails at 2× the limit and is flagged `abandoned`.

**On "Done"**, the platform asks: solved alone? hints used? mistake category? It then updates the counters and the mistakes log (mistake categories come from the DSA README).

---

## 4. Review engine (all courses)

- A single **review item** model with these types: `dsa-problem`, `concept-card`, `quiz-question`, `highlight-card`.
- DSA problems use the fixed ladder (§3). Cards use **FSRS** with Again/Hard/Good/Easy ratings.
- Card sources:
  - `<Card>` blocks in lessons
  - wrong quiz answers (added automatically)
  - highlights turned into cards
  - failed checkpoint questions

### "Today" queue and load control
- **Caps:** max **4 DSA re-solves/day**, most overdue first, and max **~20 cards/day** across all courses.
- **Review before new:** new problems are offered only after the due re-solves are done.
- **Backlog mode:** turns on when overdue items exceed ~2 days of cap.
  - It shows a catch-up banner and hides new lessons and new problems.
  - Overdue cards are spread over the next few days.
  - DSA re-solves keep their ladder position (no reset for lateness). They're sorted by lateness relative to their interval.
- **Suggested session type** from the weekly rhythm (Learn → Implement → Problems → Problems → Review). It can be overridden.
- **Time box:** "I have 30 min" fills the session with the highest-priority items.

---

## 5. Module completion and gating

**A module is done when:**
1. Every Concepts section is marked read (scroll to the end, then a tap).
2. Every drill was answered (typed, or "answered on paper") **before** its key was revealed.
3. Every module problem has at least one logged attempt. Retiring them is not required.
4. The Build is linked (repo or commit) and self-checked against its acceptance list.
5. The Checkpoint is passed:
   - Answer each question out loud (optional audio recording), reveal the model answer, and self-grade.
   - Every question must be ✓. Any ✗ becomes a card and links to the section to re-read.

**Soft gate:** the next module is readable but marked "🔒 Checkpoint not passed", and its problems don't enter the queue.

**Milestones: exam mode** (v2)
- The platform picks **unseen** problems from the phase's pool.
- One session timer runs, with per-problem limits.
- Scoring against the pass mark (e.g. 7/10) is automatic.
- A failed milestone suggests weak patterns to review.

---

## 6. Quizzes

| Type | Grading |
|---|---|
| Multiple choice / multi-select | Auto |
| Predict the complexity (time + space) | Auto |
| Predict the output | Auto (exact match) |
| Spot the bug (click a line) | Auto |
| Order the steps | Auto |
| Fill the blank in code | Auto |
| Explain (free text) | Self-graded against a model answer (AI grading in v2) |

- **Commit before reveal**, always.
- Every answer comes with an explanation and a link to the section that teaches it.
- Every wrong answer becomes a card automatically.
- **End-of-unit quiz:** 5–10 questions. Under 70%, the platform recommends re-reading specific sections before the Checkpoint.
- **Surprise questions:** inline between lesson sections, max 1 per section, dismissible. They're drawn from **earlier** units' cards and quiz items.

---

## 7. Highlights and notes

**Highlight colors (fixed meanings)**
- 🟨 key idea
- 🟥 confused / revisit
- 🟩 aha
- 🟦 interview-relevant

**Highlight actions**
- **+ Note:** attach a note.
- **→ Card:** create a review card.
- **→ Notebook:** send to the notebook.

**🟥 highlights** go to the **Struggles log** automatically, and they show as "unresolved" on the module until marked resolved.

**Notes**
- **Margin notes** in a side column on desktop and a bottom sheet on mobile.
- A notebook per module plus a global notebook, filterable by course, color, and tag. Notes are Markdown with code highlighting.
- Every highlight and note links back to its exact spot in the lesson. Everything is searchable.

**Anchoring when content changes**
- Highlights are stored as the quoted text plus surrounding context (W3C/Hypothesis style), and fuzzy re-anchored after content edits.
- If re-anchoring fails, the highlight becomes an **orphan**: kept in the notebook and marked "section changed". User data is never deleted because content changed.

---

## 8. Visualizations and media

- **Stepper visualizers** driven by trace data written in MDX (each step holds `{ arr, pointers, note }` and similar fields).
  - Controls: play/pause, step back/forward, speed; swipe to step on mobile.
  - **Code sync:** the matching Python line highlights as you step.
  - Claude writes the trace data when authoring each lesson.
- **Later:** run your own code in Pyodide and visualize its recorded trace.
- `<Media>` covers non-algorithmic concepts (e.g. the browser rendering pipeline).
- `<Playground>` (Sandpack) is used for the Frontend and React courses.

---

## 9. AI features (Claude API)

**Rule:** AI explains concepts and gives hints, but **never outputs a full solution** for an unretired problem (enforced in the system prompt).

**Limits:** there's a monthly spend cap, set by me. All AI conversations are saved to the related problem or note. The platform must be fully usable with AI turned off.

| Version | Feature |
|---|---|
| v1.5 | **Hint ladder** during a timer: pattern → key insight → pseudocode. Never code. Each level used feeds the attempt flags |
| v1.5 | **Explain this**: select text → explain differently / analogy / example |
| v1.5 | **Review my solution**: feedback on complexity, naming, and edge cases, plus a suggested mistakes-log entry to accept with one tap |
| v2 | Grade free-text Explain and Checkpoint answers |
| v2 | Draft cards from 🟨 highlights (I approve them) |
| v2 | Weekly coach report: weak patterns, slow categories, backlog, next-week focus |
| v3 | Mock interviewer (voice or text), scored against the Module 26 rubric |

---

## 10. Progress tracking (no gamification)

**In:**
- Progress per course, phase, and module.
- Milestones as status (passed, with date and score).
- Counters: NeetCode 150 solved and retired, total problems, mocks done and passed.
- Retention % per course and per skill.
- A timeline view against each README's month targets (e.g. "2 weeks behind Phase 1").
- Logs: problems, mistakes, mocks, struggles.
- A reading list from saved `<Resource>` links.

**Out:** streaks, badges, XP and levels, confetti or celebrations, heatmaps, leaderboards.

---

## 11. Roadmap

**v1: start studying on it**
1. Auth, PWA, the Course → Part → Unit structure from MDX, and course and module pages with progress.
2. Lesson reader: TOC, mark sections read, commit-before-reveal drills, `<Resource>` links.
3. Highlights, margin notes, and notebooks (quote anchoring, 4 colors, Struggles log).
4. DSA problem tracker: the full §3 state machine, flags, ladder, and mistakes log.
5. The "Today" queue with caps and backlog mode.
6. FSRS cards: `<Card>` blocks, and wrong quiz answers become cards.
7. Quizzes: all auto-graded types plus self-graded Explain.
8. Checkpoint flow and the soft gate.
9. A progress page that replaces PROGRESS.md.
10. Content migration:
    - DSA 00, DSA 01, and Frontend 01 converted to MDX with blocks (text kept as written; blocks added).
    - The README roadmaps become `course.yaml` + `overview.mdx`.
    - The PROGRESS.md files are retired. They're empty templates, kept in git history.

**v1.5**
- `ArrayViz` and `CallStackViz`
- Sandpack playgrounds
- AI: hint ladder, explain this, solution review
- Push notifications
- In-lesson surprise questions

**v2**
- Milestone exam mode
- The remaining visualizers (Tree, Graph, Grid, LinkedList)
- AI v2 features
- Pyodide drills and re-solves
- Book courses

**v3**
- Mock interviewer
- Golang track
