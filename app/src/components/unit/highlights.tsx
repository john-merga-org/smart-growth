"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useUnit } from "./context";
import { Button, cx } from "../ui";
import { HIGHLIGHT_COLORS } from "@/lib/constants";
import { addHighlight, deleteHighlight, highlightToCard, syncOrphans, updateHighlight } from "@/lib/actions/learn";
import { findQuote, quoteAt } from "@/lib/anchoring";
import type { HighlightView } from "@/lib/server/learn";

/* ── DOM text index: maps the lesson's prose text to text nodes ─────── */

interface TextIndex {
  nodes: Text[];
  starts: number[];
  text: string;
}

// Interactive blocks are excluded: their text changes as you use them.
const EXCLUDE = "[data-block], .not-prose, button, input, textarea, select";

function buildIndex(root: HTMLElement): TextIndex {
  const nodes: Text[] = [];
  const starts: number[] = [];
  let text = "";
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest(EXCLUDE) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    nodes.push(n as Text);
    starts.push(text.length);
    text += (n as Text).data;
  }
  return { nodes, starts, text };
}

function offsetOf(idx: TextIndex, node: Node, offset: number): number | null {
  if (node.nodeType !== Node.TEXT_NODE) {
    // Element boundary: resolve to the first indexed text node at/after the point.
    const probe = document.createRange();
    probe.setStart(node, offset);
    probe.collapse(true);
    for (let i = 0; i < idx.nodes.length; i++) if (probe.comparePoint(idx.nodes[i], 0) >= 0) return idx.starts[i];
    return idx.text.length;
  }
  const i = idx.nodes.indexOf(node as Text);
  return i === -1 ? null : idx.starts[i] + offset;
}

function rangeFor(idx: TextIndex, start: number, end: number): Range | null {
  const locate = (pos: number, preferEnd: boolean) => {
    let lo = 0;
    let hi = idx.starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (idx.starts[mid] < pos || (!preferEnd && idx.starts[mid] === pos)) lo = mid;
      else hi = mid - 1;
    }
    return { node: idx.nodes[lo], offset: pos - idx.starts[lo] };
  };
  if (!idx.nodes.length) return null;
  const a = locate(start, false);
  const b = locate(end, true);
  const r = document.createRange();
  r.setStart(a.node, Math.min(a.offset, a.node.length));
  r.setEnd(b.node, Math.min(b.offset, b.node.length));
  return r;
}

function caretOffset(idx: TextIndex, x: number, y: number): number | null {
  const doc = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
  if (doc.caretPositionFromPoint) {
    const p = doc.caretPositionFromPoint(x, y);
    return p ? offsetOf(idx, p.offsetNode, p.offset) : null;
  }
  const r = document.caretRangeFromPoint?.(x, y);
  return r ? offsetOf(idx, r.startContainer, r.startOffset) : null;
}

function sectionIdAt(root: HTMLElement, range: Range): string | null {
  let id: string | null = null;
  for (const h of root.querySelectorAll("h2[id], h3[id]")) {
    if (range.comparePoint(h, 0) <= 0) id = h.id;
  }
  return id;
}

const supported = () => typeof CSS !== "undefined" && "highlights" in CSS;

/* ── Layer ─────────────────────────────────────────────────────────── */

export function HighlightLayer({ children }: { children: ReactNode }) {
  const { state, act } = useUnit();
  const rootRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState<TextIndex | null>(null);
  const [toolbar, setToolbar] = useState<{ x: number; y: number; start: number; end: number } | null>(null);
  const [focus, setFocus] = useState<number | null>(null);
  const [tops, setTops] = useState<Record<number, number>>({});
  const [sheet, setSheet] = useState(false);

  // (Re)build the text index whenever the rendered lesson changes.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    setIdx(buildIndex(root));
    const obs = new MutationObserver(() => setIdx(buildIndex(root)));
    obs.observe(root, { childList: true, subtree: true, characterData: true });
    return () => obs.disconnect();
  }, []);

  // Anchor every highlight.
  const anchored = useMemo(() => {
    const out = new Map<number, { start: number; end: number }>();
    if (!idx) return out;
    for (const h of state.highlights) {
      const pos = findQuote(idx.text, h);
      if (pos) out.set(h.id, pos);
    }
    return out;
  }, [idx, state.highlights]);

  // Report orphans once per content change.
  const reported = useRef("");
  useEffect(() => {
    if (!idx) return;
    const orphans = state.highlights.filter((h) => h.id > 0 && !anchored.has(h.id)).map((h) => h.id);
    const changed = state.highlights.some((h) => h.id > 0 && h.orphan !== orphans.includes(h.id));
    const key = orphans.join(",");
    if (changed && reported.current !== key) {
      reported.current = key;
      syncOrphans(state.courseId, state.unitId, orphans).catch(() => {});
    }
  }, [anchored, idx, state.highlights, state.courseId, state.unitId]);

  // Paint with the CSS Custom Highlight API + measure margin-note positions.
  const paint = useCallback(() => {
    const root = rootRef.current;
    if (!idx || !root) return;
    const nextTops: Record<number, number> = {};
    const groups: Record<string, Range[]> = { key: [], confused: [], aha: [], interview: [], focus: [] };
    const rootTop = root.getBoundingClientRect().top;
    for (const h of state.highlights) {
      const pos = anchored.get(h.id);
      if (!pos) continue;
      const r = rangeFor(idx, pos.start, pos.end);
      if (!r) continue;
      (h.id === focus ? groups.focus : groups[h.color] ?? groups.key).push(r);
      nextTops[h.id] = r.getBoundingClientRect().top - rootTop;
    }
    if (supported()) {
      for (const [name, ranges] of Object.entries(groups)) CSS.highlights.set(`hl-${name}`, new Highlight(...ranges));
    }
    setTops(nextTops);
  }, [anchored, focus, idx, state.highlights]);

  useLayoutEffect(() => {
    paint();
    const onResize = () => paint();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [paint]);

  useEffect(() => () => {
    if (supported()) for (const n of ["key", "confused", "aha", "interview", "focus"]) CSS.highlights.delete(`hl-${n}`);
  }, []);

  // Selection → toolbar.
  useEffect(() => {
    const onUp = () => {
      setTimeout(() => {
        const root = rootRef.current;
        const sel = window.getSelection();
        if (!root || !idx || !sel || sel.isCollapsed || sel.rangeCount === 0) return setToolbar(null);
        const r = sel.getRangeAt(0);
        if (!root.contains(r.commonAncestorContainer)) return setToolbar(null);
        const s = offsetOf(idx, r.startContainer, r.startOffset);
        const e = offsetOf(idx, r.endContainer, r.endOffset);
        if (s === null || e === null || e - s < 2) return setToolbar(null);
        const rect = r.getBoundingClientRect();
        setToolbar({ x: rect.left + rect.width / 2, y: rect.top, start: s, end: e });
      }, 10);
    };
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchend", onUp);
    };
  }, [idx]);

  const create = (color: string) => {
    const root = rootRef.current;
    if (!toolbar || !idx || !root) return;
    const q = quoteAt(idx.text, toolbar.start, toolbar.end);
    const range = rangeFor(idx, toolbar.start, toolbar.end);
    const sectionId = range ? sectionIdAt(root, range) : null;
    const temp: HighlightView = { id: -Date.now(), color, ...q, note: null, orphan: false, sectionId, resolved: false };
    window.getSelection()?.removeAllRanges();
    setToolbar(null);
    act(
      (s) => ({ ...s, highlights: [...s.highlights, temp] }),
      async () => {
        const id = await addHighlight({ courseId: state.courseId, unitId: state.unitId, sectionId, color, ...q });
        setFocus(id);
      },
    );
  };

  // Click on a painted highlight → focus it (opens its note editor).
  const onClick = (e: React.MouseEvent) => {
    if (!idx || (e.target as HTMLElement).closest(EXCLUDE)) return;
    if (!window.getSelection()?.isCollapsed) return;
    const off = caretOffset(idx, e.clientX, e.clientY);
    if (off === null) return;
    const hit = state.highlights.find((h) => {
      const p = anchored.get(h.id);
      return p && off >= p.start && off <= p.end;
    });
    if (hit) {
      setFocus(hit.id);
      if (window.innerWidth < 1280) setSheet(true);
    } else setFocus(null);
  };

  const ordered = [...state.highlights].sort((a, b) => (tops[a.id] ?? 1e9) - (tops[b.id] ?? 1e9));
  const orphans = state.highlights.filter((h) => h.id > 0 && !anchored.has(h.id));

  // Lay margin notes out next to their highlight without overlapping.
  const placed: { h: HighlightView; top: number }[] = [];
  let floor = 0;
  for (const h of ordered) {
    if (tops[h.id] === undefined) continue;
    const top = Math.max(tops[h.id], floor);
    placed.push({ h, top });
    floor = top + (h.id === focus ? 190 : h.note ? 70 : 34);
  }

  return (
    <>
      <div ref={rootRef} onClick={onClick} className="relative min-w-0">
        {children}
      </div>

      {/* Desktop margin column */}
      <aside className="relative hidden xl:block" aria-label="Margin notes">
        {placed.map(({ h, top }) => (
          <div key={h.id} className="absolute inset-x-0" style={{ top }}>
            <NoteCard h={h} open={focus === h.id} onOpen={() => setFocus(h.id === focus ? null : h.id)} />
          </div>
        ))}
        {orphans.length > 0 && (
          <div className="sticky top-20 mt-4 rounded-md border border-warn/40 bg-warn/5 p-2 text-xs">
            <b>{orphans.length} highlight(s) lost their place</b>: the section changed. They're kept in the Notebook.
          </div>
        )}
      </aside>

      {/* Phone/tablet: floating button + bottom sheet */}
      <button
        onClick={() => setSheet(true)}
        className="fixed bottom-20 right-4 z-30 rounded-full border border-line bg-surface px-4 py-2 text-sm shadow-lg md:bottom-6 xl:hidden"
      >
        ✎ Notes ({state.highlights.length})
      </button>
      {sheet && (
        <div className="fixed inset-0 z-40 xl:hidden" onClick={() => setSheet(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-x-0 bottom-0 max-h-[70dvh] overflow-y-auto rounded-t-2xl border-t border-line bg-bg p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Highlights & notes</h3>
              <button onClick={() => setSheet(false)} className="text-ink-3">Close</button>
            </div>
            {state.highlights.length === 0 && <p className="text-sm text-ink-3">Select text in the lesson to highlight it.</p>}
            <div className="space-y-2">
              {(focus ? [...ordered.filter((h) => h.id === focus), ...ordered.filter((h) => h.id !== focus)] : ordered).map((h) => (
                <NoteCard key={h.id} h={h} open={focus === h.id} onOpen={() => setFocus(h.id === focus ? null : h.id)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {toolbar && (
        <div
          className="fixed z-50 flex -translate-x-1/2 -translate-y-full gap-1 rounded-lg border border-line bg-surface p-1 shadow-lg"
          style={{ left: Math.min(Math.max(toolbar.x, 110), window.innerWidth - 110), top: Math.max(toolbar.y - 8, 60) }}
          onMouseUp={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {HIGHLIGHT_COLORS.map((c) => (
            <button key={c.id} title={c.label} onClick={() => create(c.id)} className="rounded px-2 py-1 text-lg hover:bg-muted">
              {c.emoji}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* ── One highlight's note card ─────────────────────────────────────── */

function NoteCard({ h, open, onOpen }: { h: HighlightView; open: boolean; onOpen: () => void }) {
  const { act } = useUnit();
  const [note, setNote] = useState(h.note ?? "");
  const [back, setBack] = useState("");
  const [cardMode, setCardMode] = useState(false);
  const color = HIGHLIGHT_COLORS.find((c) => c.id === h.color);
  const tint = { key: "border-l-yellow-400", confused: "border-l-red-400", aha: "border-l-green-400", interview: "border-l-blue-400" }[h.color];
  const patch = (set: Partial<HighlightView>, action: () => Promise<unknown>) =>
    act((s) => ({ ...s, highlights: s.highlights.map((x) => (x.id === h.id ? { ...x, ...set } : x)) }), action);

  return (
    <div className={cx("rounded-md border border-l-4 border-line bg-surface text-sm shadow-sm", tint, h.orphan && "opacity-70")}>
      <button onClick={onOpen} className="block w-full px-2.5 py-1.5 text-left">
        <span className="line-clamp-2 text-ink-2">
          {color?.emoji} {h.exact}
        </span>
        {h.note && !open && <span className="mt-1 line-clamp-2 block text-ink">{h.note}</span>}
        {h.color === "confused" && h.resolved && <span className="text-xs text-good">resolved</span>}
      </button>
      {open && h.id > 0 && (
        <div className="space-y-2 border-t border-line p-2.5">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" className="min-h-16 w-full rounded border border-line bg-bg p-1.5 text-sm" />
          <div className="flex flex-wrap items-center gap-1">
            <Button size="sm" variant="primary" onClick={() => patch({ note }, () => updateHighlight(h.id, { note }))}>Save</Button>
            {HIGHLIGHT_COLORS.map((c) => (
              <button key={c.id} title={c.label} onClick={() => patch({ color: c.id }, () => updateHighlight(h.id, { color: c.id }))} className={cx("rounded px-1", h.color === c.id && "bg-muted")}>
                {c.emoji}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="ghost" onClick={() => setCardMode((v) => !v)}>→ Card</Button>
            {h.color === "confused" && (
              <Button size="sm" variant="ghost" onClick={() => patch({ resolved: !h.resolved }, () => updateHighlight(h.id, { resolved: !h.resolved }))}>
                {h.resolved ? "Reopen" : "Mark resolved"}
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-bad" onClick={() => confirm("Delete this highlight?") && act((s) => ({ ...s, highlights: s.highlights.filter((x) => x.id !== h.id) }), () => deleteHighlight(h.id))}>
              Delete
            </Button>
          </div>
          {cardMode && (
            <div className="space-y-1">
              <p className="text-xs text-ink-3">The highlight is the prompt. Write the answer you want to recall:</p>
              <textarea value={back} onChange={(e) => setBack(e.target.value)} className="min-h-14 w-full rounded border border-line bg-bg p-1.5 text-sm" />
              <Button size="sm" disabled={!back.trim()} onClick={() => act(null, async () => { await highlightToCard(h.id, back); setCardMode(false); alert("Card added to your reviews."); })}>
                Create card
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
