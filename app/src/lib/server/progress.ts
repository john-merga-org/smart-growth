import "server-only";
import { and, desc, eq, gte, isNotNull, ne } from "drizzle-orm";
import { getDb, schema, USER } from "../db";
import { addDays, daysBetween, type Day } from "../dates";
import { courseUnits } from "../content/courses";
import type { CourseMeta } from "../content/types";
import { courseSummary } from "./learn";

export interface Timeline {
  startedOn: Day | null;
  weeksElapsed: number;
  expectedUnitId: string | null;
  currentUnitId: string | null;
  /** + ahead / − behind, in weeks, versus the roadmap's week estimates */
  deltaWeeks: number | null;
  monthNow: number;
}

/** Where you are versus the course.yaml week estimates (design §10: timeline vs README targets). */
export async function courseTimeline(course: CourseMeta, today: Day): Promise<Timeline> {
  const db = await getDb();
  const [st] = await db.select().from(schema.courseState).where(and(eq(schema.courseState.userId, USER), eq(schema.courseState.courseId, course.id)));
  const startedOn = st?.startedOn ?? null;
  const summary = await courseSummary(course);
  const units = courseUnits(course);
  const weeksElapsed = startedOn ? daysBetween(startedOn, today) / 7 : 0;

  let cum = 0;
  let expectedUnitId: string | null = null;
  const startWeek: Record<string, number> = {};
  for (const u of units) {
    startWeek[u.id] = cum;
    cum += u.weeks ?? 1;
    if (expectedUnitId === null && cum > weeksElapsed) expectedUnitId = u.id;
  }
  const current = summary.find((s) => !(s.completion?.done) && s.unit.kind === "unit") ?? null;
  const currentUnitId = current?.unit.id ?? null;
  const deltaWeeks = startedOn && currentUnitId ? Math.round((startWeek[currentUnitId] - weeksElapsed) * 10) / 10 : null;
  return { startedOn, weeksElapsed, expectedUnitId, currentUnitId, deltaWeeks, monthNow: Math.floor(weeksElapsed / 4.345) + 1 };
}

export async function counters(today: Day) {
  const db = await getDb();
  const [problems, resolves, reviews, mocks] = await Promise.all([
    db.select().from(schema.problems).where(eq(schema.problems.userId, USER)),
    db.select({ passed: schema.attempts.passed }).from(schema.attempts).where(and(
      eq(schema.attempts.userId, USER), eq(schema.attempts.kind, "resolve"), isNotNull(schema.attempts.endedAt), ne(schema.attempts.ladderLabel, "practice"),
    )),
    db.select({ rating: schema.reviewLogs.rating }).from(schema.reviewLogs).where(and(eq(schema.reviewLogs.userId, USER), gte(schema.reviewLogs.reviewedOn, addDays(today, -90)))),
    db.select().from(schema.mocks).where(eq(schema.mocks.userId, USER)),
  ]);
  const solved = problems.filter((p) => p.firstSolvedOn);
  const retired = problems.filter((p) => p.status === "retired" || p.status === "done");
  return {
    ncSolved: solved.filter((p) => p.nc).length,
    ncRetired: retired.filter((p) => p.nc).length,
    totalSolved: solved.length,
    retired: retired.length,
    resolveRetention: resolves.length ? Math.round((resolves.filter((r) => r.passed).length / resolves.length) * 100) : null,
    resolveCount: resolves.length,
    cardRetention: reviews.length ? Math.round((reviews.filter((r) => r.rating > 1).length / reviews.length) * 100) : null,
    reviewCount: reviews.length,
    mocksDone: mocks.length,
    mocksPassed: mocks.filter((m) => /pass|hire/i.test(m.result) && !/no/i.test(m.result)).length,
  };
}

export async function logs() {
  const db = await getDb();
  const [attempts, mistakes, mocks, minutes] = await Promise.all([
    db.select({ a: schema.attempts, p: schema.problems }).from(schema.attempts)
      .leftJoin(schema.problems, and(eq(schema.problems.key, schema.attempts.problemKey), eq(schema.problems.userId, schema.attempts.userId)))
      .where(and(eq(schema.attempts.userId, USER), isNotNull(schema.attempts.endedAt))).orderBy(desc(schema.attempts.id)).limit(200),
    db.select().from(schema.mistakes).where(eq(schema.mistakes.userId, USER)).orderBy(desc(schema.mistakes.id)),
    db.select().from(schema.mocks).where(eq(schema.mocks.userId, USER)).orderBy(desc(schema.mocks.day)),
    db.select().from(schema.activity).where(eq(schema.activity.userId, USER)),
  ]);
  return { attempts, mistakes, mocks, minutes };
}
