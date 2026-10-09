/**
 * Text-quote anchoring (W3C/Hypothesis style): a highlight is { exact, prefix, suffix }, re-found by
 * searching the text and scoring context — so it survives edits elsewhere in the lesson.
 * Pure string functions here; DOM glue lives in the highlight layer.
 */

export interface Quote {
  exact: string;
  prefix: string;
  suffix: string;
}

export const CONTEXT = 32;

export function quoteAt(text: string, start: number, end: number): Quote {
  return { exact: text.slice(start, end), prefix: text.slice(Math.max(0, start - CONTEXT), start), suffix: text.slice(end, end + CONTEXT) };
}

const commonSuffix = (a: string, b: string) => {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
};
const commonPrefix = (a: string, b: string) => {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
};

/** Best match for the quote in `text`, or null if the exact text is gone (→ orphan). */
export function findQuote(text: string, q: Quote): { start: number; end: number } | null {
  if (!q.exact) return null;
  let best: { start: number; score: number } | null = null;
  for (let i = text.indexOf(q.exact); i !== -1; i = text.indexOf(q.exact, i + 1)) {
    const score = commonSuffix(text.slice(Math.max(0, i - q.prefix.length), i), q.prefix) + commonPrefix(text.slice(i + q.exact.length), q.suffix);
    if (!best || score > best.score) best = { start: i, score };
  }
  if (best) return { start: best.start, end: best.start + q.exact.length };

  // Whitespace-tolerant fallback (content re-wrapped or spacing changed).
  const squash = (s: string) => s.replace(/\s+/g, " ").trim();
  const target = squash(q.exact);
  if (target.length < 8) return null;
  const map: number[] = [];
  let flat = "";
  for (let i = 0; i < text.length; i++) {
    const ws = /\s/.test(text[i]);
    if (ws && flat.endsWith(" ")) continue;
    flat += ws ? " " : text[i];
    map.push(i);
  }
  const j = flat.indexOf(target);
  if (j === -1) return null;
  return { start: map[j], end: map[j + target.length - 1] + 1 };
}
