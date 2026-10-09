import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkGfm from "remark-gfm";
import { VFile } from "vfile";
import { remarkUnit, type RemarkUnitData } from "./remark-unit";
import type { CourseMeta, CourseType, PartMeta, UnitIndex, UnitMeta } from "./types";

export const CONTENT_DIR = process.env.CONTENT_DIR ?? path.resolve(/*turbopackIgnore: true*/ process.cwd(), "..", "content");

// mtime-keyed caches: edits to content show up without a restart.
const courseCache = new Map<string, { mtime: number; course: CourseMeta }>();
const unitCache = new Map<string, { mtime: number; index: UnitIndex; source: string }>();

const mtimeOf = (file: string) => fs.statSync(file).mtimeMs;

function asString(v: unknown, field: string, where: string): string {
  if (v === undefined || v === null || v === "") throw new Error(`${where}: "${field}" is required`);
  return String(v);
}

function loadCourse(id: string): CourseMeta {
  const dir = path.join(/*turbopackIgnore: true*/ CONTENT_DIR, id);
  const file = path.join(/*turbopackIgnore: true*/ dir, "course.yaml");
  const mtime = mtimeOf(file);
  const cached = courseCache.get(id);
  if (cached && cached.mtime === mtime) return cached.course;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = parseYaml(fs.readFileSync(file, "utf8")) as any;
  const where = `content/${id}/course.yaml`;
  const parts: PartMeta[] = (raw.parts ?? []).map((p: any, pi: number) => ({
    id: asString(p.id, `parts[${pi}].id`, where),
    title: asString(p.title, `parts[${pi}].title`, where),
    goal: p.goal,
    units: (p.units ?? []).map((u: any, ui: number): UnitMeta => {
      const uid = asString(u.id, `parts[${pi}].units[${ui}].id`, where);
      return {
        id: uid,
        slug: uid,
        title: asString(u.title, `unit ${uid} title`, where),
        kind: u.kind === "milestone" ? "milestone" : "unit",
        weeks: u.weeks,
        outcome: u.outcome,
        file: u.file && fs.existsSync(path.join(/*turbopackIgnore: true*/ dir, u.file)) ? u.file : undefined,
        skills: u.skills ?? [],
      };
    }),
  }));

  const course: CourseMeta = {
    id,
    title: asString(raw.title, "title", where),
    type: (raw.type ?? "course") as CourseType,
    summary: raw.summary,
    hoursPerWeek: Number(raw.hoursPerWeek ?? 5),
    labels: { part: raw.labels?.part ?? "Part", unit: raw.labels?.unit ?? "Unit" },
    overview: raw.overview && fs.existsSync(path.join(/*turbopackIgnore: true*/ dir, raw.overview)) ? raw.overview : undefined,
    parts,
    timeline: raw.timeline ?? [],
    dir,
  };
  courseCache.set(id, { mtime, course });
  return course;
}

export function listCourses(): CourseMeta[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(/*turbopackIgnore: true*/ CONTENT_DIR, d.name, "course.yaml")))
    .map((d) => loadCourse(d.name));
}

export function getCourse(id: string): CourseMeta | null {
  if (!/^[a-z0-9-]+$/.test(id) || !fs.existsSync(path.join(/*turbopackIgnore: true*/ CONTENT_DIR, id, "course.yaml"))) return null;
  return loadCourse(id);
}

/** Units in course order (flattened across parts). */
export function courseUnits(course: CourseMeta): (UnitMeta & { partId: string })[] {
  return course.parts.flatMap((p) => p.units.map((u) => ({ ...u, partId: p.id })));
}

export const OVERVIEW_ID = "overview";

/** Units by id, plus the course overview as a pseudo-unit (it has cards and resources, but isn't in the roadmap). */
export function findUnit(course: CourseMeta, unitId: string): (UnitMeta & { partId: string }) | null {
  if (unitId === OVERVIEW_ID && course.overview) {
    return { id: OVERVIEW_ID, slug: OVERVIEW_ID, title: `${course.title}: overview`, kind: "unit", file: course.overview, skills: [], partId: "" };
  }
  return courseUnits(course).find((u) => u.id === unitId) ?? null;
}

export function readSource(course: CourseMeta, relFile: string): string {
  return fs.readFileSync(path.join(/*turbopackIgnore: true*/ course.dir, relFile), "utf8");
}

export function indexMdx(source: string, filePath = "unit.mdx"): UnitIndex {
  const file = new VFile({ value: source, path: filePath });
  const processor = unified().use(remarkParse).use(remarkMdx).use(remarkGfm).use(remarkUnit);
  processor.runSync(processor.parse(file), file);
  return (file.data as unknown as RemarkUnitData).unit;
}

export function getUnitIndex(course: CourseMeta, unit: UnitMeta): { index: UnitIndex; source: string } | null {
  if (!unit.file) return null;
  const full = path.join(/*turbopackIgnore: true*/ course.dir, unit.file);
  const key = `${course.id}/${unit.id}`;
  const mtime = mtimeOf(full);
  const cached = unitCache.get(key);
  if (cached && cached.mtime === mtime) return cached;
  const source = fs.readFileSync(full, "utf8");
  const entry = { mtime, index: indexMdx(source, full), source };
  unitCache.set(key, entry);
  return entry;
}

/** Find any block anywhere by its key "course/unit/blockId" (server-side lookups for actions). */
export function findBlock(blockKey: string) {
  const [courseId, unitId, ...rest] = blockKey.split("/");
  const blockId = rest.join("/");
  const course = getCourse(courseId);
  const unit = course && findUnit(course, unitId);
  const entry = course && unit ? getUnitIndex(course, unit) : null;
  const block = entry?.index.blocks.find((b) => b.id === blockId);
  return course && unit && block ? { course, unit, block } : null;
}

/** All problems across all written units, in course order, first occurrence wins. */
export function allProblems() {
  const out = new Map<string, { courseId: string; unitId: string; block: Extract<UnitIndex["blocks"][number], { kind: "problem" }> }>();
  for (const course of listCourses()) {
    for (const unit of courseUnits(course)) {
      const entry = getUnitIndex(course, unit);
      for (const b of entry?.index.blocks ?? []) {
        if (b.kind === "problem" && !out.has(b.key)) out.set(b.key, { courseId: course.id, unitId: unit.id, block: b });
      }
    }
  }
  return out;
}
