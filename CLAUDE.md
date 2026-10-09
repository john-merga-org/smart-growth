# Smart Growth

A personal learning platform. Courses live in `content/` as MDX; the Next.js app in `app/` renders them and tracks progress.

- Design: `docs/PLATFORM_DESIGN.md`
- Build log: `docs/IMPLEMENTATION_PROGRESS.md`. **Update it at the end of every work session** (status table, deviations, dated log entry).

## Commands (run in `app/`)

| Command | What it does |
|---|---|
| `npm run dev` | Dev server. Without `DATABASE_URL` it uses embedded PGlite in `app/.data/` |
| `npm run content:check` | Validates all course content. **Run it after every content edit**; it must pass |
| `npm test` | Unit tests (scheduler, timer state machine, queue) |
| `npm run typecheck` | TypeScript |
| `npm run db:generate` | Generate a SQL migration after editing `src/lib/db/schema.ts` |

---

# Authoring content

## Course layout

```
content/<course-id>/
├── course.yaml        # roadmap
├── overview.mdx       # course intro: the "how this course works / how to practice" prose
└── <part-dir>/<unit>.mdx
```

### course.yaml

```yaml
title: Data Structures & Algorithms
type: course            # course | book | track
summary: One sentence.
hoursPerWeek: 5         # drives daily review caps
labels: { part: Phase, unit: Module }   # books: { part: Part, unit: Chapter }
overview: overview.mdx
timeline:               # "by month N you should..." targets, shown on the progress page
  - month: 3
    expect: Solve most easy problems alone...
parts:
  - id: phase-1-foundations
    title: Foundations
    goal: Read and write Python fluently...
    units:
      - id: "00"                     # URL segment: /c/dsa/00. Quote numeric ids
        title: Python for DSA
        weeks: 1
        outcome: You write idiomatic Python...
        file: phase-1-foundations/00-python-for-dsa.mdx   # omit until the unit is written
        skills: [python]
      - id: milestone-1
        kind: milestone
        title: "Milestone 1: Phase 1 timed set + dsalib started"
        weeks: 1
        outcome: ...
```

## Unit files (MDX)

Write normal Markdown: GFM tables, fenced code with a language (`python`, `ts`, `tsx`, `js`, `html`, `css`, `bash`, `json`, `go`, `sql`), and `##` / `###` headings. Then add the interactive blocks below.

**How headings work:**
- `##` and `###` headings define sections.
- An `###` inside an `##` that has `###`s is its own section; otherwise the `##` is the section.
- Each readable section gets a "Mark read" button.
- A section that contains a `<Drill>`, `<Checkpoint>`, `<Build>` or `<Problem>` completes through those blocks instead of "Mark read".
- An `## Answer key` section is ignored.

### MDX gotchas (`content:check` catches these)
- `{` `}` `<` in prose must be escaped: `\{`, `\}`, `&lt;`. Inside code fences and inline code they're fine.
- HTML comments `<!-- -->` are invalid. Use `{/* comment */}`.
- No `<details>`. Use `<Drill>` + `<Answer>`.
- Leave a blank line between a component tag and Markdown inside it:

  ```mdx
  <Card id="x" q="...">

  Answer **with** markdown.

  </Card>
  ```

- Attribute values are plain strings `"..."`, or literals `{217}` / `{true}`. Boolean flags can be bare: `nc`, `required`.
- Every `id` must be unique within its file and must never change after publishing (progress is keyed by it). Use short kebab-case ids, e.g. `amortized-append`.

### Blocks

**`<Card id q>`: a spaced-repetition concept card.**
- `q` is the prompt; the children are the answer.
- It enters the review queue when its section is marked read.
- Add one for every idea worth remembering in 3 months, typically 1–3 per section. Keep answers short (1–4 lines).

```mdx
<Card id="amortized-append" q="Why is list.append amortized O(1)?">

Capacity grows geometrically, so the total copy cost over n appends is O(n): O(1) per append on average.

</Card>
```

**`<Quiz id type ...>`: a single question.**
- The answer is hidden until the learner commits.
- A wrong answer becomes a review card.
- Put an end-of-unit set of 5–10 under a `## Quiz` heading. Use them inline too where useful.
- Always include `<Why>`, ideally with a link to the section that teaches it (`[2.6](#26-amortized-analysis-why-listappend-is-o1)`).

| `type` | Required attributes | Children |
|---|---|---|
| `mcq` | `answer="b"` | prompt, `<Choice id="a">…</Choice>`…, `<Why>` |
| `multi` | `answer="a,c"` | same as mcq; several correct |
| `complexity` | `time="O(n log n)" space="O(1)"` | prompt + code block. Learner picks time and space from a list |
| `output` | `answer="[1, 2, 3]"` (`||` separates accepted alternatives) | prompt + code block. Learner types the output |
| `bug` | `line="4"` (1-based line in the code block) | prompt + code block. Learner clicks the buggy line |
| `order` | `answer="clarify,examples,brute"` (correct order) | `<Step id="clarify">…</Step>`…. Shown shuffled |
| `blank` | `answer="<=||<"` | code block containing `___` |
| `explain` | none | prompt + `<Model>` model answer. Self-graded |

```mdx
<Quiz id="q-log-loop" type="mcq" answer="b">

Which loop runs O(log n) times?

<Choice id="a">`for i in range(n): i += 2`</Choice>
<Choice id="b">`while n > 1: n //= 2`</Choice>
<Choice id="c">`for i in range(n): for j in range(i): ...`</Choice>

<Why>Halving n each step reaches 1 after log₂ n steps. See [2.9](#29-building-intuition-for-log-n).</Why>

</Quiz>
```

Complexity notation: use `O(1)`, `O(log n)`, `O(n)`, `O(n log n)`, `O(n²)`, `O(n³)`, `O(2ⁿ)`, `O(n!)`, `O(√n)`, `O(n + m)`, `O(n · m)`, `O(k)`. For anything else, add `choices="O(1)|O(k log n)|..."`.

**`<Drill id title>` + `<Answer>`: an exercise.**
- The answer unlocks only after the learner commits (types an answer or ticks "answered on paper").
- Put the answer key inside its drill. Don't collect keys at the bottom.

```mdx
<Drill id="d1-count-steps" title="Count the steps">

What is the complexity of ...

<Answer>

O(n²), because ...

</Answer>

</Drill>
```

**`<Problems>` + `<Problem lc slug title pattern difficulty nc>`: practice problems with timers.**
- `difficulty` is `E`, `M` or `H`. `pattern` uses the pattern names from the DSA overview. `nc` marks a NeetCode 150 problem.
- Without a LeetCode number, use `id="..."` and `url="..."`.

```mdx
<Problems>
<Problem lc={217} slug="contains-duplicate" title="Contains Duplicate" pattern="hashing" difficulty="E" nc />
<Problem lc={1929} slug="concatenation-of-array" title="Concatenation of Array" pattern="arrays" difficulty="E" />
</Problems>
```

**`<Build id title>`: the unit project.**
- The children are the description plus an acceptance list (a `- [ ]` checklist).
- The learner links a repo or commit and self-checks the list.

**`<Checkpoint>` + `<Ask id q section>`: questions to answer out loud.**
- The children of `<Ask>` are the model answer. `section` (optional) is the heading id to re-read on failure.

```mdx
<Checkpoint>
<Ask id="cp-amortized" q="Explain amortized O(1) for append without notes." section="26-amortized-analysis-why-listappend-is-o1">

Model answer...

</Ask>
</Checkpoint>
```

**`<Resource href type time required>Title</Resource>`: an external link.**
- `type` is one of `video`, `article`, `book`, `docs`, `tool`, `course`.
- `time` is e.g. `"20m"` or `"2h"`. Use `required` for must-do resources.

**`<Media src alt caption>`:** an image, GIF or video (`src` ending in .mp4/.webm plays as video).

**`<Callout type="tip|warning|note">`:** a highlighted aside.

---

# App code conventions

- Next.js 16 App Router; `src/proxy.ts` (not middleware) does auth.
- Read `node_modules/next/dist/docs/` before using an unfamiliar Next API.
- DB access only in server code (`src/lib/db`). Mutations are server actions in `src/app/**/actions.ts`.
- Scheduling and timer rules are pure functions in `src/lib/srs/` with Vitest tests. Change a rule → update its test.
- Dates: the user's timezone comes from the `tz` cookie. Use the helpers in `src/lib/dates.ts`, never `new Date().toISOString().slice(0, 10)`.
