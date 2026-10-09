# Module 01: How the Browser Works + Semantic HTML

**Time:** ~1 week (10–15 hrs)
**Prerequisites:** none
**You'll need:** Chrome or Firefox, VS Code, Node installed (you have it)

---

## 1. Why it matters (the backend analogy)

On the backend you understand the full lifecycle: a request arrives, middleware runs, a handler executes, a response is serialized. When something is slow or broken, you know which layer to look at.

The browser has a lifecycle too, and most frontend confusion comes from not knowing it:

| Backend (what you know) | Browser (what you'll learn) |
|---|---|
| Request → middleware → handler → response | HTML bytes → DOM → CSSOM → render tree → layout → paint → composite |
| Node's event loop, single thread | The browser main thread, *also* single-threaded, shared by your JS **and** rendering |
| Blocking the event loop stalls all requests | Blocking the main thread freezes the page: no clicks, no scrolling, no animation |
| Data model / schema | HTML: the structure and *meaning* of the content |
| Response serialization format | CSS: how that structure is presented |
| API contract consumed by other services | The **accessibility tree**: the API your page exposes to screen readers, search engines, and AI agents |

The last row matters most. **HTML isn't about how things look. It's a data model with semantics.** A `<button>` isn't "a gray box". It's a contract: focusable, activates with Enter and Space, announced as "button". If you use a `<div>` instead, you've broken the contract and have to re-implement it by hand.

---

## 2. Concepts

### 2.1 From URL to pixels

When you type a URL and press Enter:

1. **Network:** DNS → TCP → TLS → HTTP request → the server returns HTML. (You know this part.)
2. **Parse HTML → DOM.** The browser streams the HTML and builds the **DOM** (Document Object Model), a tree of nodes. It's an object graph you can query and mutate from JS.
3. **Discover subresources.** When the parser hits `<link rel="stylesheet">`, `<script>`, or `<img>`, it fetches them. A preload scanner looks ahead and starts these downloads early.
4. **Parse CSS → CSSOM.** All the CSS becomes another tree of rules.
5. **Style calculation.** For every DOM element, the browser works out the final value of every CSS property (the "computed style"). The cascade lives here (Module 02).
6. **Layout (a.k.a. reflow).** It calculates the exact geometry, meaning the x, y, width, and height of every box. This is the expensive part.
7. **Paint.** It fills in pixels: text, colors, borders, shadows, images, split into layers.
8. **Composite.** The GPU stacks the layers into the final frame.

```
HTML ──► DOM ─┐
              ├──► Style ──► Layout ──► Paint ──► Composite ──► 🖥️
CSS ──► CSSOM ┘
```

**Two blocking rules you must know:**

- **CSS is render-blocking.** The browser won't paint anything until it has the CSS. Otherwise you'd see a flash of unstyled content.
- **Plain `<script>` is parser-blocking.** When the parser reaches `<script src="app.js">`, it *stops building the DOM*, downloads the script, and runs it, because the script might call `document.write` or change the DOM. That's why scripts used to go at the bottom of `<body>`.

The modern fix:

```html
<script src="app.js" defer></script>   <!-- download in parallel, run after HTML is parsed, in order -->
<script src="analytics.js" async></script> <!-- download in parallel, run as soon as ready, any order -->
<script type="module" src="main.js"></script> <!-- modules are deferred by default -->
```

Rule of thumb: **use `defer` or `type="module"` for your app code** and `async` for independent third-party scripts.

**Why this matters later:** when you change the DOM or CSS from JS, the browser has to redo some of steps 5–8. Changing `width` re-runs layout → paint → composite, which is expensive. Changing `transform` or `opacity` can skip straight to composite, which is cheap. Every frontend performance and animation technique comes back to this pipeline (Modules 14, 16, 17).

### 2.2 The main thread and the frame budget

At 60 fps the browser has **~16.7 ms per frame**. In that time the main thread must run your JS, recalculate styles, do layout, and paint. If your JS takes 200 ms, the page freezes for 200 ms: clicks don't respond and scrolling stutters.

Backend analogy: it's exactly like doing CPU-heavy sync work in an Express handler. The whole server stalls. The same discipline applies: keep main-thread work short, and move heavy work off-thread (Web Workers, Module 19).

### 2.3 The document skeleton

Every page starts here. Learn what each line does.

```html
<!doctype html>                         <!-- standards mode (without it: "quirks mode", legacy weird rendering) -->
<html lang="en">                        <!-- language: screen-reader pronunciation, translation, hyphenation -->
<head>
  <meta charset="utf-8">                <!-- text encoding; must be early -->
  <meta name="viewport" content="width=device-width, initial-scale=1">
                                        <!-- WITHOUT this, phones render at ~980px wide and zoom out. Responsive design depends on it -->
  <title>Orders · Acme Dashboard</title><!-- tab title, bookmarks, search results, first thing a screen reader announces -->
  <meta name="description" content="Track and manage your Acme orders.">
  <link rel="stylesheet" href="styles.css">
  <script src="main.js" type="module"></script>
</head>
<body>
  <!-- content -->
</body>
</html>
```

### 2.4 Semantic HTML: elements are contracts

**Semantic** means the element describes *what the content is*, not how it looks. Browsers, screen readers, search engines, and browser features like Reader Mode and autofill all rely on it.

#### Page structure (landmarks)

```html
<body>
  <header>            <!-- site banner: logo, main nav -->
    <nav aria-label="Main">...</nav>
  </header>

  <main>              <!-- THE primary content. Exactly one per page -->
    <article>         <!-- self-contained content: a blog post, product card, comment -->
      <h1>...</h1>
    </article>
    <aside>...</aside><!-- tangential: sidebar, related links -->
  </main>

  <footer>...</footer>
</body>
```

Screen-reader users jump between these **landmarks** the way you jump between functions in an IDE outline. Build a page from `<div>`s alone and they're stuck reading it top to bottom.

`<section>` is a thematic group *with a heading*. If it has no heading, it should probably be a `<div>`.

`<div>` and `<span>` are fine. They're the "no meaning" elements, used as hooks for layout and styling. The mistake is using them *instead of* a meaningful element.

#### Headings are an outline, not font sizes

```html
<h1>Account settings</h1>
  <h2>Profile</h2>
    <h3>Avatar</h3>
  <h2>Security</h2>
    <h3>Two-factor authentication</h3>
```

- One `<h1>` per page, describing the page.
- Don't skip levels (h2 → h4).
- **Never choose a heading level for its size.** Size is CSS's job. If you want small text that's structurally an h2, use an h2 and style it smaller.

Screen-reader users navigate by headings more than anything else. It's their table of contents.

#### Interactive elements: the most important rule in this module

| You want... | Use | Never |
|---|---|---|
| Something that **does an action** (submit, open modal, delete) | `<button>` | `<div onclick>` |
| Something that **goes somewhere** (another page or URL) | `<a href="...">` | `<button onclick="location=...">`, `<a>` without href |

What a `<button>` gives you for free, and what a `<div onclick>` doesn't:
- It's focusable with Tab
- It activates with Enter **and** Space
- It's announced as "button" with its label
- It can be `disabled`
- It submits its form (default `type="submit"` inside a form, so set `type="button"` when you don't want that)

What an `<a href>` gives you: open in new tab, copy link, middle-click, a visited state, and announcement as "link".

To make a div behave like a button you'd need `role="button"`, `tabindex="0"`, and keydown handlers for Enter and Space. That's re-implementing a built-in, badly. **Use the native element.**

#### Text-level semantics

```html
<p>Paragraphs are paragraphs, not <br><br> line breaks.</p>
<strong>important</strong> vs <b>just bold styling</b>
<em>stress emphasis</em> vs <i>alternate voice, e.g. a term</i>
<code>inline code</code>, <pre><code>block code</code></pre>
<time datetime="2026-10-06">Oct 6</time>
<abbr title="HyperText Markup Language">HTML</abbr>
<ul>/<ol>/<li> for any list, including nav menus and card grids
<dl><dt>Term</dt><dd>Definition</dd></dl> for key-value pairs (great for "details" panels)
```

#### Images

```html
<img src="chart.png" alt="Revenue grew 40% from Q1 to Q3" width="800" height="400">
<img src="divider.svg" alt="">  <!-- decorative: EMPTY alt, so screen readers skip it -->
```

- `alt` describes the **purpose** of the image, not its pixels. A logo linking home gets `alt="Acme home"`, not "blue logo".
- A missing `alt` means the screen reader may read the filename. An empty `alt=""` explicitly means "decorative".
- Always set `width` and `height`. The browser reserves the space before the image loads, which prevents layout shift (a Core Web Vital, Module 14).
- Use `loading="lazy"` for images below the fold.

#### Tables are for tabular data only

```html
<table>
  <caption>Orders this week</caption>
  <thead><tr><th scope="col">ID</th><th scope="col">Customer</th><th scope="col">Total</th></tr></thead>
  <tbody><tr><td>#1042</td><td>Abebe K.</td><td>$120.00</td></tr></tbody>
</table>
```

Use tables for data that has rows and columns, like an admin grid. Never use them for page layout; that's what CSS Grid is for.

### 2.5 Forms: your backend instincts apply here

Forms are where your backend background helps the most. A form is a **client-side request builder**.

```html
<form action="/api/signup" method="post">
  <label for="email">Email</label>
  <input id="email" name="email" type="email" autocomplete="email" required>

  <label for="pw">Password</label>
  <input id="pw" name="password" type="password" autocomplete="new-password"
         minlength="12" required aria-describedby="pw-hint">
  <p id="pw-hint">At least 12 characters.</p>

  <fieldset>
    <legend>Plan</legend>
    <label><input type="radio" name="plan" value="free" checked> Free</label>
    <label><input type="radio" name="plan" value="pro"> Pro</label>
  </fieldset>

  <label><input type="checkbox" name="terms" required> I accept the terms</label>

  <button type="submit">Create account</button>
</form>
```

Key facts:
- **`name` is the field key** in the request body (`email=...&password=...`). An input without a `name` isn't submitted.
- **Every input needs a `<label>`.** Connect them with `for` and `id`, or wrap the input. Clicking the label focuses the input, and screen readers announce it. A `placeholder` is **not** a label: it disappears when you type and often has poor contrast.
- **Use the right `type`:** `email`, `tel`, `url`, `number`, `date`, `search`, `password`. On mobile each one opens the right keyboard, and you get built-in validation.
- **Use `autocomplete`:** `email`, `name`, `current-password`, `new-password`, `one-time-code`, `street-address`. It makes password managers and autofill work. Getting it wrong is a real UX failure.
- **Built-in validation:** `required`, `minlength`, `maxlength`, `min`, `max`, `pattern`. The browser blocks submission and shows messages. *This is UX, not security. Always validate on the server too.* You already know that.
- `<fieldset>` + `<legend>` group related controls. A radio group should always have one.
- `aria-describedby` links help text and error messages to the input, so they're read when the input gets focus.

### 2.6 The accessibility tree

The browser builds a third tree alongside the DOM: the **accessibility tree**. Each node has:
- **Role:** button, link, heading (level 2), textbox, navigation...
- **Name:** "Create account", which comes from text content, the `<label>`, `alt`, or `aria-label`
- **State:** disabled, checked, expanded, required, invalid...

Screen readers, voice control ("click Create account"), and many AI browsing agents read *this* tree, not your pixels. Semantic HTML fills it in correctly for free.

**ARIA** (`role`, `aria-*` attributes) lets you patch this tree by hand. The **first rule of ARIA**: *don't use ARIA if a native element does the job.* `<button>` is better than `<div role="button">` every time. You'll use ARIA for real later, for custom widgets like tabs, comboboxes, and dialogs (Module 15).

**Try it now:** Chrome DevTools → Elements → **Accessibility** pane (or enable "full accessibility tree" view). Inspect a `<button>` and then a `<div>` with a click handler and compare them.

### 2.7 DevTools: your new debugger

Get comfortable with these this week:
- **Elements:** the live DOM. Edit HTML and CSS in place. Right-click → "Break on subtree modifications".
- **Elements → Accessibility pane:** role, name, and state for any node.
- **Network:** throttle to "Slow 4G" and watch what blocks rendering. Look at the waterfall.
- **Lighthouse:** run an audit and read the Accessibility and SEO sections.
- **Performance:** record a page load and find the Parse HTML, Layout, and Paint entries. You don't need to understand them all yet; just see the pipeline from 2.1 for real.

---

## 3. Drills

Do these in a `drills/01/` folder. Use plain `.html` files, no build tools. Serve them with `npx serve .` (or just open the file).

**D1. Pipeline observation (30 min)**
Make a page with a big `<script>` (no `defer`) in the `<head>` that runs a busy loop for 3 seconds: `const t = Date.now(); while (Date.now() - t < 3000) {}`. Load it. What do you see during those 3 seconds? Now add `defer`. What changes? Record both in the Performance panel and find the difference.

**D2. Div-soup repair (45 min)**
Rewrite this so that it's semantic. Then keyboard-test it using only Tab, Shift+Tab, Enter, and Space.
```html
<div class="header">
  <div class="logo" onclick="location='/'">Acme</div>
  <div class="nav"><div onclick="location='/pricing'">Pricing</div><div onclick="location='/docs'">Docs</div></div>
</div>
<div class="content">
  <div class="big-title">Ship faster</div>
  <div class="title2">Features</div>
  <div class="card"><div class="title3">Fast</div><div>Built on edge infra.</div></div>
  <div class="btn" onclick="signup()">Get started</div>
</div>
<div class="footer">© 2026 Acme</div>
```

**D3. Heading outline (20 min)**
Take any long article on a news site. Open DevTools and run:
```js
[...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => '  '.repeat(+h.tagName[1]-1) + h.tagName + ' ' + h.textContent.trim()).join('\n')
```
Is the outline sensible? Find a site where it isn't.

**D4. The form (60 min)**
Build a **"Create API key"** form: key name (required, 3–40 chars), environment (radio: dev, staging, prod), scopes (checkboxes: read, write, admin), expiry date (`type="date"`, min = today), and an optional description textarea with a 200-character limit. Every control should be labeled and grouped properly, with help text linked by `aria-describedby`. Point it at a tiny Express endpoint that logs `req.body` (use `express.urlencoded()`), so you can see exactly what the browser sends. What's sent for unchecked checkboxes?

**D5. Screen reader test (30 min)**
Turn on a real screen reader: **Orca** on Linux (`orca`, or Super+Alt+S on GNOME), VoiceOver on Mac, or NVDA on Windows. Navigate your D2 and D4 pages using headings and landmarks. Then try the original div-soup version. Write two sentences in PROGRESS.md about the difference.

**D6. Lighthouse (15 min)**
Run Lighthouse (Accessibility + SEO) on your D2 page and fix everything until both score 100.

---

## 4. Build: "Developer Docs" page (3–4 hrs)

Build a **documentation page for one of your own backend APIs**, in HTML only. Use **zero CSS** this week: no `style` attributes and no `<style>` tags.

That's deliberate. If the page is readable and navigable with no CSS at all, your HTML is right. CSS comes next week and goes on top of this exact page.

Requirements:
- Full document skeleton (2.3) with a sensible `<title>` and description
- `<header>` with site name (linking home) and `<nav>` for the main sections
- A sidebar `<nav aria-label="Table of contents">` with in-page anchor links (`href="#authentication"`)
- `<main>` with a correct heading hierarchy: Introduction, Authentication, a section per endpoint (method, path, description), Errors, Rate limits
- At least one `<table>` (e.g., an error codes table) with `<caption>` and `<th scope>`
- Code samples in `<pre><code>`
- At least one `<dl>` (e.g., request parameters: name → description)
- An image or diagram with good `alt` text
- A "Try it" `<form>` for one endpoint that really submits to your Express server
- `<footer>`
- Lighthouse Accessibility = 100
- It works fully with keyboard and with Orca

Put it in a GitHub repo (`frontend-journey`), because you'll keep upgrading this page in Modules 02–04.

---

## 5. Checkpoint

Answer these out loud, without notes. If you get stuck on one, re-read that section.

1. Walk through what happens from receiving HTML bytes to pixels on screen. Name each stage.
2. Why is CSS render-blocking? Why is a plain `<script>` parser-blocking? What do `defer` and `async` each do?
3. Why does a 300 ms synchronous JS function make the page unresponsive? What's the Node equivalent?
4. Changing `width` versus changing `transform`: which pipeline stages does each one re-trigger?
5. When do you use `<button>` and when `<a>`? List four things `<button>` gives you that `<div onclick>` doesn't.
6. What is the accessibility tree? What are role, name, and state? What's the first rule of ARIA?
7. Why is `placeholder` not a label? What does the `name` attribute do?
8. What's the difference between `alt=""` and a missing `alt`?
9. Why should `<img>` have `width` and `height`?
10. What does the viewport meta tag do, and what happens without it?

---

## 6. Resources

**Required**
- web.dev: [*Learn HTML*](https://web.dev/learn/html): read Overview, Document structure, Semantic HTML, Headings and sections, Links, Lists, Images, Tables, Forms
- web.dev: [*Critical rendering path*](https://web.dev/articles/critical-rendering-path)

**Recommended**
- Chrome Developers: [*Inside look at modern web browser*](https://developer.chrome.com/blog/inside-browser-part1) (a 4-part series). Read parts 1–3 now; part 4 matters in Module 05.
- MDN: [*HTML elements reference*](https://developer.mozilla.org/en-US/docs/Web/HTML/Element). Skim the whole list once to learn what exists.

---

**Next:** Module 02, CSS Fundamentals. We'll style your docs page and learn why CSS behaves the way it does.
