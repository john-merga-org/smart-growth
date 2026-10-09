import "server-only";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb, schema, USER } from "../db";
import { courseUnits, getUnitIndex } from "../content/courses";
import type { CourseMeta, UnitIndex, UnitMeta } from "../content/types";
import { ladderLabel, type ProblemState } from "../srs/ladder";

export interface ProblemView {
  key: string;
  status: ProblemState["status"];
  label: string;
  due: string | null;
  openAttemptId: number | null;
  attempts: number;
}

export interface HighlightView {
  id: number;
  color: string;
  exact: string;
  prefix: string;
  suffix: string;
  note: string | null;
  orphan: boolean;
  sectionId: string | null;
  resolved: boolean;
}

export interface ResponseView {
  response: unknown;
  correct: boolean | null;
  at: string;
}

export interface UnitState {
  courseId: string;
  unitId: string;
  readSections: string[];
  responses: Record<string, ResponseView>; // by block id
  problems: Record<string, ProblemView>;
  build: { url: string | null; checked: boolean };
  checkpointPassedAt: string | null;
  highlights: HighlightView[];
  resources: Record<string, string>; // href → done|saved
}

export async function problemViews(keys: string[]): Promise<Record<string, ProblemView>> {
  if (!keys.length) return {};
  const db = await getDb();
  const rows = await db.select().from(schema.problems).where(and(eq(schema.problems.userId, USER), inArray(schema.problems.key, keys)));
  const open = await db
    .select({ id: schema.attempts.id, key: schema.attempts.problemKey })
    .from(schema.attempts)
    .where(and(eq(schema.attempts.userId, USER), isNull(schema.attempts.endedAt), inArray(schema.attempts.problemKey, keys)));
  const counts = await db
    .select({ key: schema.attempts.problemKey })
    .from(schema.attempts)
    .where(and(eq(schema.attempts.userId, USER), inArray(schema.attempts.problemKey, keys)));
  const out: Record<string, ProblemView> = {};
  for (const key of keys) {
    const r = rows.find((x) => x.key === key);
    const state: ProblemState = r
      ? { status: r.status as ProblemState["status"], step: r.step, anchor: r.anchor, due: r.due }
      : { status: "new", step: 0, anchor: null, due: null };
    out[key] = {
      key,
      status: state.status,
      label: ladderLabel(state),
      due: state.due,
      openAttemptId: open.find((o) => o.key === key)?.id ?? null,
      attempts: counts.filter((c) => c.key === key).length,
    };
  }
  return out;
}

export async function getUnitState(course: CourseMeta, unit: UnitMeta, index: UnitIndex): Promise<UnitState> {
  const db = await getDb();
  const prefix = `${course.id}/${unit.id}/`;
  const blockKeys = index.blocks.filter((b) => b.kind !== "problem" && b.kind !== "resource").map((b) => prefix + b.id);

  const [reads, resp, progress, hls, res, problems] = await Promise.all([
    db.select().from(schema.sectionReads).where(and(eq(schema.sectionReads.userId, USER), eq(schema.sectionReads.courseId, course.id), eq(schema.sectionReads.unitId, unit.id))),
    blockKeys.length
      ? db.select().from(schema.responses).where(and(eq(schema.responses.userId, USER), inArray(schema.responses.blockKey, blockKeys))).orderBy(desc(schema.responses.id))
      : Promise.resolve([]),
    db.select().from(schema.unitProgress).where(and(eq(schema.unitProgress.userId, USER), eq(schema.unitProgress.courseId, course.id), eq(schema.unitProgress.unitId, unit.id))),
    db.select().from(schema.highlights).where(and(eq(schema.highlights.userId, USER), eq(schema.highlights.courseId, course.id), eq(schema.highlights.unitId, unit.id))).orderBy(schema.highlights.id),
    db.select().from(schema.resources).where(eq(schema.resources.userId, USER)),
    problemViews(index.blocks.flatMap((b) => (b.kind === "problem" ? [b.key] : []))),
  ]);

  const responses: Record<string, ResponseView> = {};
  for (const r of resp) {
    const id = r.blockKey.slice(prefix.length);
    if (!responses[id]) responses[id] = { response: r.response, correct: r.correct, at: r.createdAt.toISOString() };
  }
  const p = progress[0];
  return {
    courseId: course.id,
    unitId: unit.id,
    readSections: reads.map((r) => r.sectionId),
    responses,
    problems,
    build: { url: p?.buildUrl ?? null, checked: p?.buildChecked ?? false },
    checkpointPassedAt: p?.checkpointPassedAt?.toISOString() ?? null,
    highlights: hls.map((h) => ({
      id: h.id, color: h.color, exact: h.exact, prefix: h.prefix, suffix: h.suffix, note: h.note,
      orphan: h.orphan, sectionId: h.sectionId, resolved: !!h.resolvedAt,
    })),
    resources: Object.fromEntries(res.map((r) => [r.href, r.status])),
  };
}

export interface Completion {
  sections: [number, number];
  drills: [number, number];
  problems: [number, number];
  build: boolean | null; // null = unit has no build
  checkpoint: boolean | null; // null = unit has no checkpoint
  done: boolean;
  percent: number;
}

/** Design §5: a module is done when all five parts are. */
export function completion(index: UnitIndex, state: Pick<UnitState, "readSections" | "responses" | "problems" | "build" | "checkpointPassedAt">): Completion {
  const readable = index.sections.filter((s) => s.readable);
  const read = readable.filter((s) => state.readSections.includes(s.id)).length;
  const drills = index.blocks.filter((b) => b.kind === "drill");
  const drillsDone = drills.filter((d) => state.responses[d.id]).length;
  const problems = index.blocks.filter((b) => b.kind === "problem");
  const attempted = problems.filter((p) => b(p) && (state.problems[b(p)!]?.attempts ?? 0) > 0).length;
  const hasBuild = index.blocks.some((x) => x.kind === "build");
  const hasCheckpoint = index.blocks.some((x) => x.kind === "ask");
  const build = hasBuild ? !!state.build.url && state.build.checked : null;
  const checkpoint = hasCheckpoint ? !!state.checkpointPassedAt : null;

  const parts = [
    [read, readable.length],
    [drillsDone, drills.length],
    [attempted, problems.length],
    [build ? 1 : 0, hasBuild ? 1 : 0],
    [checkpoint ? 1 : 0, hasCheckpoint ? 1 : 0],
  ];
  const total = parts.reduce((s, [, t]) => s + t, 0);
  const got = parts.reduce((s, [g]) => s + g, 0);
  const done = parts.every(([g, t]) => g >= t) && total > 0;
  return {
    sections: [read, readable.length],
    drills: [drillsDone, drills.length],
    problems: [attempted, problems.length],
    build,
    checkpoint,
    done,
    percent: total ? Math.round((got / total) * 100) : 0,
  };
}
const b = (x: UnitIndex["blocks"][number]) => (x.kind === "problem" ? x.key : null);

export interface UnitSummary {
  unit: UnitMeta & { partId: string };
  written: boolean;
  unlocked: boolean;
  completion: Completion | null;
}

/**
 * Course-wide view: completion per unit + the soft gate (design §5): a unit's problems enter the
 * queue only once the previous written unit's Checkpoint has passed.
 */
export async function courseSummary(course: CourseMeta): Promise<UnitSummary[]> {
  const units = courseUnits(course);
  const out: UnitSummary[] = [];
  let gateOpen = true;
  for (const unit of units) {
    const entry = getUnitIndex(course, unit);
    if (!entry) {
      out.push({ unit, written: false, unlocked: gateOpen, completion: null });
      continue;
    }
    const state = await getUnitState(course, unit, entry.index);
    const c = completion(entry.index, state);
    out.push({ unit, written: true, unlocked: gateOpen, completion: c });
    if (c.checkpoint === false) gateOpen = false;
  }
  return out;
}
