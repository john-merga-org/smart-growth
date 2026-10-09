"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useUnit } from "../unit/context";
import { useReview } from "../unit/review-context";
import { Badge, Button, InlineMd, cx } from "../ui";
import { commitDrill, markSectionRead, saveBuild, setResource } from "@/lib/actions/learn";

/* ── Card ─────────────────────────────────────────────────────────── */

export function Card({ id, q, children }: { id: string; q: string; children?: ReactNode }) {
  const review = useReview();
  const [open, setOpen] = useState(false);
  const shown = review ? review.revealed : open;
  return (
    <div className="not-prose my-5 rounded-lg border border-accent/30 bg-accent/5" data-block={id}>
      <div className="flex items-start gap-2 p-4">
        <span aria-hidden className="mt-0.5 text-accent">◆</span>
        <div className="flex-1">
          <p className="font-medium"><InlineMd text={q} /></p>
          {shown ? (
            <div className="prose prose-sm mt-2 max-w-none dark:prose-invert">{children}</div>
          ) : (
            <button className="mt-2 text-sm text-accent hover:underline" onClick={() => (review ? review.reveal() : setOpen(true))}>
              Show answer
            </button>
          )}
        </div>
        {!review && <span className="text-xs text-ink-3">card</span>}
      </div>
    </div>
  );
}

/* ── Drill ────────────────────────────────────────────────────────── */

export function Drill({ id, title, children }: { id: string; title?: string; children?: ReactNode }) {
  const { state, blockKey, act } = useUnit();
  const saved = state.responses[id]?.response as { answer?: string; onPaper?: boolean } | undefined;
  const [text, setText] = useState("");
  const committed = !!saved;

  const commit = (onPaper: boolean) =>
    act(
      (s) => ({ ...s, responses: { ...s.responses, [id]: { response: { answer: text, onPaper }, correct: null, at: new Date().toISOString() } } }),
      () => commitDrill(blockKey(id), text, onPaper),
    );

  return (
    <div className="not-prose my-6 rounded-lg border border-line bg-surface" data-block={id}>
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <span className="text-sm font-semibold">Drill{title ? `: ${title}` : ""}</span>
        {committed ? <Badge tone="good">committed</Badge> : <Badge>open</Badge>}
      </div>
      <div className="prose max-w-none px-4 py-3 dark:prose-invert">
        <DrillCtx.Provider value={committed}>{children}</DrillCtx.Provider>
      </div>
      {!committed && (
        <div className="space-y-2 border-t border-line px-4 py-3">
          <textarea
            className="min-h-20 w-full rounded-md border border-line bg-bg p-2 font-mono text-sm"
            placeholder="Commit your answer before you see the key…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" disabled={!text.trim()} onClick={() => commit(false)}>Commit answer</Button>
            <Button size="sm" onClick={() => commit(true)}>I answered on paper</Button>
          </div>
        </div>
      )}
      {committed && saved?.answer && (
        <details className="border-t border-line px-4 py-2 text-sm">
          <summary className="cursor-pointer text-ink-3">Your committed answer</summary>
          <pre className="mt-2 whitespace-pre-wrap font-mono text-xs">{saved.answer}</pre>
        </details>
      )}
    </div>
  );
}

const DrillCtx = createContext(false);

export function Answer({ children }: { children?: ReactNode }) {
  const committed = useContext(DrillCtx);
  if (!committed) return <p className="not-prose text-sm italic text-ink-3">🔒 The answer key unlocks after you commit.</p>;
  return (
    <div className="not-prose my-3 rounded-md border-l-4 border-good bg-good/5 px-4 py-2">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-good">Answer key</div>
      <div className="prose prose-sm max-w-none dark:prose-invert">{children}</div>
    </div>
  );
}

/* ── Section end: mark read ───────────────────────────────────────── */

export function SectionEnd({ id }: { id: string }) {
  const { state, act } = useUnit();
  const read = state.readSections.includes(id);
  const toggle = () =>
    act(
      (s) => ({ ...s, readSections: read ? s.readSections.filter((x) => x !== id) : [...s.readSections, id] }),
      () => markSectionRead(state.courseId, state.unitId, id, !read),
    );
  return (
    <div className="not-prose my-6 flex justify-end">
      {read ? (
        <button onClick={toggle} className="text-sm text-good hover:underline" title="Undo">✓ Section read</button>
      ) : (
        <Button size="sm" onClick={toggle}>Mark section read</Button>
      )}
    </div>
  );
}

/* ── Build ────────────────────────────────────────────────────────── */

export function Build({ id, title, children }: { id: string; title: string; children?: ReactNode }) {
  const { state, act } = useUnit();
  const [url, setUrl] = useState(state.build.url ?? "");
  const [checked, setChecked] = useState(state.build.checked);
  const done = !!state.build.url && state.build.checked;
  return (
    <div className="not-prose my-6 rounded-lg border border-line bg-surface" data-block={id}>
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <span className="text-sm font-semibold">Build: {title}</span>
        {done ? <Badge tone="good">done</Badge> : <Badge>open</Badge>}
      </div>
      <div className="prose max-w-none px-4 py-3 dark:prose-invert">{children}</div>
      <div className="space-y-2 border-t border-line px-4 py-3">
        <input
          className="h-9 w-full rounded-md border border-line bg-bg px-2 text-sm"
          placeholder="https://github.com/you/repo (or a commit link)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          Every acceptance item above is met
        </label>
        <Button
          size="sm"
          variant="primary"
          onClick={() => act((s) => ({ ...s, build: { url: url.trim() || null, checked } }), () => saveBuild(state.courseId, state.unitId, url, checked))}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

/* ── Resource ─────────────────────────────────────────────────────── */

const RES_ICON: Record<string, string> = { video: "▶", article: "📄", book: "📘", docs: "📚", tool: "🛠", course: "🎓" };

export function Resource({ href, type, time, required, children }: { href: string; type: string; time?: string; required?: boolean; children?: ReactNode }) {
  const { state, act } = useUnit();
  const status = state.resources[href];
  const title = typeof children === "string" ? children : href;
  const set = (s: "done" | "saved" | null) =>
    act(
      (st) => {
        const resources = { ...st.resources };
        if (s) resources[href] = s;
        else delete resources[href];
        return { ...st, resources };
      },
      () => setResource({ href, title, type, courseId: state.courseId, unitId: state.unitId }, s),
    );
  return (
    <div className={cx("not-prose my-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-line px-3 py-2", status === "done" && "opacity-70")}>
      <span aria-hidden>{RES_ICON[type] ?? "🔗"}</span>
      <a href={href} target="_blank" rel="noreferrer" className="flex-1 font-medium text-accent hover:underline">{children}</a>
      {required && <Badge tone="accent">required</Badge>}
      {time && <span className="text-xs text-ink-3">{time}</span>}
      <div className="flex gap-1">
        <Button size="sm" variant={status === "done" ? "success" : "ghost"} onClick={() => set(status === "done" ? null : "done")}>
          {status === "done" ? "✓ Done" : "Mark done"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => set(status === "saved" ? null : "saved")}>
          {status === "saved" ? "★ Saved" : "Save for later"}
        </Button>
      </div>
    </div>
  );
}

/* ── Media / Callout ──────────────────────────────────────────────── */

export function Media({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  const isVideo = /\.(mp4|webm)$/i.test(src);
  return (
    <figure className="not-prose my-6">
      {isVideo ? (
        <video src={src} controls loop muted playsInline className="w-full rounded-lg border border-line" aria-label={alt} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" className="w-full rounded-lg border border-line" />
      )}
      {caption && <figcaption className="mt-2 text-center text-sm text-ink-3">{caption}</figcaption>}
    </figure>
  );
}

export function Callout({ type = "note", children }: { type?: "tip" | "warning" | "note"; children?: ReactNode }) {
  const style = { tip: "border-good bg-good/5", warning: "border-warn bg-warn/5", note: "border-accent bg-accent/5" }[type];
  return <div className={cx("my-5 rounded-md border-l-4 px-4 py-1", style)}>{children}</div>;
}
