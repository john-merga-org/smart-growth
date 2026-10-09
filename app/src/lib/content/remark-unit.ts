import GithubSlugger from "github-slugger";
import { toString } from "mdast-util-to-string";
import type { Heading, Root, RootContent } from "mdast";
import type { VFile } from "vfile";
import { QUIZ_TYPES, type Block, type Difficulty, type QuizType, type Section, type UnitIndex } from "./types";

/**
 * Shared by the indexer and the renderer so section ids and block data always agree.
 * - gives every heading a stable slug id
 * - splits the doc into sections (h3 inside an h2 that has h3s, otherwise the h2)
 * - inserts <SectionEnd id/> after each readable section
 * - collects interactive blocks + validation errors into file.data.unit
 */

// Components an author may use, with the attributes each one requires.
const KNOWN: Record<string, string[]> = {
  Card: ["id", "q"],
  Quiz: ["id", "type"],
  Choice: ["id"],
  Step: ["id"],
  Why: [],
  Model: [],
  Drill: ["id"],
  Answer: [],
  Problems: [],
  Problem: ["title", "pattern", "difficulty"],
  Build: ["id", "title"],
  Checkpoint: [],
  Ask: ["id", "q"],
  Resource: ["href", "type"],
  Media: ["src", "alt"],
  Callout: [],
  SectionEnd: ["id"],
};

// A section holding one of these completes through the block, not "mark read".
const SELF_TRACKED = new Set(["Drill", "Checkpoint", "Build", "Problem", "Problems"]);
const SKIP_SECTIONS = new Set(["answer key"]);

type Jsx = Extract<RootContent, { type: "mdxJsxFlowElement" }>;
type Attrs = Record<string, string | number | boolean | null>;

function isJsx(node: unknown): node is Jsx {
  const t = (node as { type?: string })?.type;
  return t === "mdxJsxFlowElement" || t === "mdxJsxTextElement";
}

function readAttrs(node: Jsx, errors: string[]): Attrs {
  const out: Attrs = {};
  for (const a of node.attributes) {
    if (a.type !== "mdxJsxAttribute") continue;
    if (a.value === null || a.value === undefined) out[a.name] = true;
    else if (typeof a.value === "string") out[a.name] = a.value;
    else {
      // Expression attribute: only literals are allowed (lc={217}, required={false}).
      const raw = a.value.value.trim();
      if (/^-?\d+(\.\d+)?$/.test(raw)) out[a.name] = Number(raw);
      else if (raw === "true" || raw === "false") out[a.name] = raw === "true";
      else if (/^(["'`]).*\1$/s.test(raw)) out[a.name] = raw.slice(1, -1);
      else if (node.name === "Media" || node.name?.endsWith("Viz")) out[a.name] = raw;
      else errors.push(`<${node.name}> attribute ${a.name}={${raw}} must be a literal`);
    }
  }
  return out;
}

function walk(node: unknown, fn: (n: Jsx) => void) {
  if (isJsx(node)) fn(node);
  const children = (node as { children?: unknown[] }).children;
  if (children) for (const c of children) walk(c, fn);
}

const str = (v: Attrs[string]) => (v === null || v === undefined || v === false ? undefined : String(v));

export interface RemarkUnitData {
  unit: UnitIndex;
}

export function remarkUnit() {
  return (tree: Root, file: VFile) => {
    const source = String(file.value);
    const errors: string[] = [];
    const slugger = new GithubSlugger();

    // 1. heading ids
    for (const node of tree.children) {
      if (node.type !== "heading") continue;
      const id = slugger.slug(toString(node));
      node.data = { ...node.data, hProperties: { ...(node.data?.hProperties ?? {}), id } };
    }
    const idOf = (h: Heading) => String((h.data?.hProperties as { id?: string } | undefined)?.id);

    // 2. sections: ranges of top-level children
    type Range = { section: Section; start: number; end: number };
    const ranges: Range[] = [];
    const kids = tree.children;
    const headingAt = (i: number, depth: number) => kids[i]?.type === "heading" && (kids[i] as Heading).depth === depth;

    for (let i = 0; i < kids.length; i++) {
      const node = kids[i];
      if (node.type !== "heading" || node.depth !== 2) continue;
      let end = i + 1;
      while (end < kids.length && !(kids[end].type === "heading" && (kids[end] as Heading).depth <= 2)) end++;
      if (SKIP_SECTIONS.has(toString(node).trim().toLowerCase())) continue;

      const h3s: number[] = [];
      for (let j = i + 1; j < end; j++) if (headingAt(j, 3)) h3s.push(j);

      if (h3s.length === 0) {
        ranges.push({ section: { id: idOf(node), title: toString(node), depth: 2, readable: true }, start: i, end });
      } else {
        h3s.forEach((j, k) => {
          const h = kids[j] as Heading;
          const stop = k + 1 < h3s.length ? h3s[k + 1] : end;
          ranges.push({ section: { id: idOf(h), title: toString(h), depth: 3, readable: true }, start: j, end: stop });
        });
      }
    }

    // 3. blocks + validation
    const blocks: Block[] = [];
    const seen = new Set<string>();
    const sectionOfIndex = (i: number) => ranges.find((r) => i >= r.start && i < r.end)?.section ?? null;

    kids.forEach((top, i) => {
      const section = sectionOfIndex(i);
      walk(top, (n) => {
        const name = n.name ?? "";
        if (!(name in KNOWN) && !name.endsWith("Viz") && name !== "Playground") {
          errors.push(`Unknown component <${name}> (line ${n.position?.start.line})`);
          return;
        }
        if (section && SELF_TRACKED.has(name)) section.readable = false;
        const a = readAttrs(n, errors);
        for (const req of KNOWN[name] ?? []) {
          if (a[req] === undefined) errors.push(`<${name}> is missing "${req}" (line ${n.position?.start.line})`);
        }
        const slice =
          n.position?.start.offset !== undefined && n.position?.end.offset !== undefined
            ? source.slice(n.position.start.offset, n.position.end.offset)
            : "";
        const base = { id: str(a.id) ?? "", sectionId: section?.id ?? null, source: slice };
        let block: Block | null = null;

        switch (name) {
          case "Card":
            block = { ...base, kind: "card", q: str(a.q) ?? "" };
            break;
          case "Quiz": {
            const type = str(a.type) as QuizType;
            if (!QUIZ_TYPES.includes(type)) errors.push(`<Quiz id="${base.id}"> has unknown type "${type}"`);
            const needs: Partial<Record<QuizType, string[]>> = {
              mcq: ["answer"], multi: ["answer"], complexity: ["time", "space"], output: ["answer"],
              bug: ["line"], order: ["answer"], blank: ["answer"],
            };
            for (const req of needs[type] ?? []) {
              if (a[req] === undefined) errors.push(`<Quiz id="${base.id}" type="${type}"> needs "${req}"`);
            }
            block = { ...base, kind: "quiz", type };
            break;
          }
          case "Drill":
            block = { ...base, kind: "drill", title: str(a.title) };
            break;
          case "Problem": {
            const lc = a.lc !== undefined ? Number(a.lc) : undefined;
            const slug = str(a.slug);
            const url = str(a.url) ?? (slug ? `https://leetcode.com/problems/${slug}/` : "");
            const key = lc ? `lc-${lc}` : str(a.id);
            if (!key) errors.push(`<Problem title="${a.title}"> needs lc or id`);
            if (!url) errors.push(`<Problem title="${a.title}"> needs slug or url`);
            const difficulty = str(a.difficulty) as Difficulty;
            if (!["E", "M", "H"].includes(difficulty)) errors.push(`<Problem title="${a.title}"> difficulty must be E, M or H`);
            block = {
              ...base, id: key ?? "", kind: "problem", key: key ?? "", lc, slug, url,
              title: str(a.title) ?? "", pattern: str(a.pattern) ?? "", difficulty, nc: a.nc === true,
            };
            break;
          }
          case "Build":
            block = { ...base, kind: "build", title: str(a.title) ?? "" };
            break;
          case "Ask":
            block = { ...base, kind: "ask", q: str(a.q) ?? "", section: str(a.section) };
            break;
          case "Resource": {
            const title = toString(n).trim();
            if (!title) errors.push(`<Resource href="${a.href}"> needs a title as its children`);
            block = {
              ...base, id: str(a.href) ?? "", kind: "resource", href: str(a.href) ?? "", type: str(a.type) ?? "",
              title, time: str(a.time), required: a.required === true,
            };
            break;
          }
        }
        if (!block) return;
        const dupKey = `${block.kind === "problem" || block.kind === "resource" ? block.kind : "block"}:${block.id}`;
        if (block.kind !== "problem" && block.kind !== "resource" && seen.has(dupKey)) {
          errors.push(`Duplicate id "${block.id}" (<${name}>, line ${n.position?.start.line})`);
        }
        seen.add(dupKey);
        if (block.kind === "problem" && blocks.some((b) => b.kind === "problem" && b.key === block!.id)) return;
        blocks.push(block);
      });
    });

    // 4. insert <SectionEnd/> markers for readable sections (back to front so indexes stay valid)
    for (const r of [...ranges].reverse()) {
      if (!r.section.readable) continue;
      const marker: Jsx = {
        type: "mdxJsxFlowElement",
        name: "SectionEnd",
        attributes: [{ type: "mdxJsxAttribute", name: "id", value: r.section.id }],
        children: [],
      };
      kids.splice(r.end, 0, marker);
    }

    (file.data as unknown as RemarkUnitData).unit = { sections: ranges.map((r) => r.section), blocks, errors };
  };
}
