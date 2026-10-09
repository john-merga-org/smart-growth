# Frontend Mastery: Backend Engineer → Frontend Specialist

**Student profile:** Strong backend engineer (TypeScript, Node.js, Express). TypeScript is solid, but browser, CSS, and UI experience is close to zero. Styling is the weakest area.
**Target:** Frontend specialist. You should be able to build pixel-accurate, accessible, fast UIs, understand how the browser renders them, and design frontend architecture at scale.
**Pace:** 10–15 hrs/week, about **28 weeks (~6.5 months)**.
**Main stack:** React + TypeScript, then Next.js. Styling: modern CSS first, Tailwind later.

---

## The core idea of this course

You already think like an engineer. What you're missing is three things:

1. **A model of the browser as a runtime.** You know Node's event loop and the request lifecycle. The browser has its own: parse → style → layout → paint → composite. Once you see it, CSS and performance stop feeling like magic.
2. **CSS as a real language.** Most backend devs fail at CSS because they never learn it. They guess and add `!important`. CSS has rules: the cascade, the box model, formatting contexts, and layout algorithms. Learn the rules and it becomes predictable.
3. **Design taste.** "Professional-looking" isn't talent. It comes from a small set of learnable rules: spacing scales, type scales, visual hierarchy, restrained color, and alignment. This is where most engineers' UIs look amateur, so it gets its own module.

**We learn the platform before the framework.** React on top of shaky CSS and DOM knowledge is why so many "React devs" can't center a div or fix a layout bug. Phase 1 is deliberately vanilla.

---

## Roadmap

### Phase 1: The Platform (Weeks 1–8)
*Goal: build any static design you're given, responsive and accessible, with no framework.*

| # | Module | Weeks | Key outcome |
|---|--------|-------|-------------|
| 01 | [How the Browser Works + Semantic HTML](phase-1-platform/01-browser-and-html.md) | 1 | You know what happens between URL and pixels, and you write HTML that means something |
| 02 | CSS Fundamentals: cascade, specificity, box model, units | 1.5 | You can predict which style wins and why an element has the size it does |
| 03 | Layout: flow, Flexbox, Grid, positioning, responsive | 2 | You can lay out any design. No more guessing |
| 04 | Professional Styling: design rules, tokens, typography, color, modern CSS | 1.5 | Your UIs stop looking "developer-made" |
| 05 | DOM, Events, Browser APIs, Forms (vanilla TS) | 1.5 | You can build interactive UI without a framework and know what React abstracts away |
| 🏁 | **Milestone 1:** Multi-page product site + interactive dashboard from a real design file | 0.5 | Portfolio piece #1 |

### Phase 2: React, Properly (Weeks 9–16)
*Goal: build real full-stack apps against your own Express backends.*

| # | Module | Weeks | Key outcome |
|---|--------|-------|-------------|
| 06 | React mental model: components, rendering, reconciliation, keys | 1 | You know *when* and *why* React re-renders |
| 07 | Hooks in depth: state, effects (and when not to use them), refs, context, custom hooks | 1.5 | No more useEffect spaghetti |
| 08 | Styling at scale: CSS Modules, Tailwind, headless UI (Radix), building a component library | 1.5 | You can ship your own design system |
| 09 | Server state & client state: TanStack Query, caching, optimistic UI, Zustand, URL state | 1.5 | Data-heavy UIs feel easy |
| 10 | Routing, forms & validation (React Hook Form + Zod schemas shared with your backend) | 1 | Complex forms, with types end to end |
| 11 | Testing: Vitest, Testing Library, MSW, Playwright | 1 | You test UIs with the same confidence as APIs |
| 🏁 | **Milestone 2:** Full-stack project management app (React + your Express API) | 0.5 | Portfolio piece #2 |

### Phase 3: Production Frontend (Weeks 17–23)
*Goal: ship fast, accessible, production-grade apps.*

| # | Module | Weeks | Key outcome |
|---|--------|-------|-------------|
| 12 | Tooling: Vite, bundlers, ESM, linting, monorepos, CI | 0.5 | You understand your build, not just run it |
| 13 | Next.js & rendering strategies: CSR/SSR/SSG/ISR, Server Components, streaming, Server Actions | 1.5 | You can pick the right rendering model per page |
| 14 | Performance: Core Web Vitals, critical rendering path, profiling, bundle size, images/fonts, React perf | 1.5 | You can measure a slow page and fix it |
| 15 | Accessibility in depth: WCAG 2.2, ARIA patterns, keyboard, screen-reader testing | 1 | You build UIs everyone can use (a big differentiator for specialists) |
| 16 | Motion & interaction polish: transitions, Motion library, View Transitions API | 1 | Your UIs feel premium |
| 🏁 | **Milestone 3:** Deployed Next.js SaaS-style app scoring 95+ on Lighthouse | 1 | Portfolio piece #3 |

### Phase 4: Specialist Level (Weeks 24–28+)
*Goal: think like a staff-level frontend engineer.*

| # | Module | Weeks | Key outcome |
|---|--------|-------|-------------|
| 17 | Browser internals deep dive: event loop, rendering pipeline, compositor, memory leaks | 1 | You debug problems others can't |
| 18 | Frontend architecture: state architecture, design systems at scale, micro-frontends, error handling, observability | 1 | You can lead frontend architecture decisions |
| 19 | Frontend security & advanced APIs: XSS, CSP, auth in the browser, WebSockets, Web Workers, PWA/offline, i18n | 1 | Real-time, offline-ready, secure apps |
| 20 | Frontend system design + UI machine coding (interview prep) | 1.5 | You pass senior frontend interviews |
| 🏆 | **Capstone:** Real-time collaborative app (e.g., Notion-lite or a Trello board with live cursors) built on your own published design system | 2+ | Flagship portfolio piece |

---

## How every module works

Each module file has the same structure:

1. **Why it matters**: the backend analogy, so you're mapping new ideas onto ones you already know.
2. **Concepts**: the lesson itself, written to be read with an editor and browser open.
3. **Drills**: small, focused exercises (15–45 min each). Do them all, because this is where skill comes from.
4. **Build**: one module project that combines everything.
5. **Checkpoint**: questions you must answer *out loud without notes* before moving on. If you can't, re-read; don't skip ahead.
6. **Resources**: the best one or two sources per topic, not a list of twenty.

### Weekly rhythm (12 hrs example)
- **~30% learning** (reading the module, docs, short videos)
- **~70% building** (drills and projects)
- At least one session a week should be **"copy a real site"**: pick a well-designed site (Linear, Stripe, Vercel) and rebuild one section from scratch. It's the fastest way to build design taste.

### Rules
- **Use DevTools constantly.** Elements, Computed, Layout (flex/grid overlays), Network, Performance. It's your debugger, the same way logs and a profiler are on the backend.
- **No `!important`, no magic numbers, no random fixes.** If something looks wrong, find out *why* before changing it.
- **Don't let AI write your CSS during Phase 1.** Ask it to *explain* things, but type the code yourself. Muscle memory matters here.
- **Push everything to GitHub.** By the end you'll have a portfolio.

---

## Core resources (the short list)

| Area | Resource |
|------|----------|
| Reference for everything | [MDN Web Docs](https://developer.mozilla.org) |
| Modern web guidance | [web.dev/learn](https://web.dev/learn) (free courses on CSS, HTML, accessibility, performance) |
| CSS, deeply | *CSS for JavaScript Developers* by Josh W. Comeau (paid; the best CSS course for people like you) or the free Kevin Powell YouTube channel |
| Design for developers | *Refactoring UI* by Adam Wathan & Steve Schoger. **The single most important book for your styling problem.** |
| Real designs to build | [Frontend Mentor](https://www.frontendmentor.io) (free designs with Figma files at different levels) |
| React | [react.dev/learn](https://react.dev/learn) (the official docs are excellent) |
| Patterns | [patterns.dev](https://www.patterns.dev) |
| Accessibility | [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) |
| Interview prep (Phase 4) | [GreatFrontEnd](https://www.greatfrontend.com) |

---

## Running in parallel: DSA

The **Data Structures & Algorithms** track (Python) runs alongside this course at about 4–5 hrs/week. It lives in [`../dsa/`](../dsa/README.md).

Track your progress in [PROGRESS.md](PROGRESS.md).
