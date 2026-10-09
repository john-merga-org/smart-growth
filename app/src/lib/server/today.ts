import "server-only";
import { and, eq, inArray, isNull, lte, ne, sql } from "drizzle-orm";
import { getDb, schema, USER } from "../db";
import { getUnitIndex, listCourses } from "../content/courses";
import type { Difficulty } from "../content/types";
import { buildToday, suggestSession, type DueProblem, type NewProblem } from "../srs/today";
import { completion, courseSummary, getUnitState } from "./learn";
import { getSettings, getToday } from "./session";
import { sweepAbandonedAttempts } from "./attempts";

export async function todayData(minutes?: number) {
  await sweepAbandonedAttempts();
  const db = await getDb();
  const settings = await getSettings();
  const { today, now } = await getToday();

  const [dueRows, resolvesToday, dueCardRows, reviewedTodayRows, problemRows, openRows] = await Promise.all([
    db.select().from(schema.problems).where(and(eq(schema.problems.userId, USER), inArray(schema.problems.status, ["redo", "ladder", "retired"]), lte(schema.problems.due, today))),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.attempts).where(and(
      eq(schema.attempts.userId, USER), eq(schema.attempts.kind, "resolve"), eq(schema.attempts.endedOn, today), ne(schema.attempts.ladderLabel, "practice"),
    )),
    db.select({ id: schema.cards.id, due: schema.cards.due }).from(schema.cards).where(and(eq(schema.cards.userId, USER), eq(schema.cards.suspended, false), lte(schema.cards.due, now))),
    db.selectDistinct({ id: schema.reviewLogs.cardId }).from(schema.reviewLogs).where(and(eq(schema.reviewLogs.userId, USER), eq(schema.reviewLogs.reviewedOn, today))),
    db.select({ key: schema.problems.key, status: schema.problems.status }).from(schema.problems).where(eq(schema.problems.userId, USER)),
    db.select().from(schema.attempts).where(and(eq(schema.attempts.userId, USER), isNull(schema.attempts.endedAt))),
  ]);

  const reviewedToday = new Set(reviewedTodayRows.map((r) => r.id));
  const started = new Map(problemRows.map((r) => [r.key, r.status]));

  // Per-course: current unit (first unlocked, written, incomplete), and new problems from unlocked units.
  const courses = [];
  const newProblems: NewProblem[] = [];
  for (const course of listCourses()) {
    const summary = await courseSummary(course);
    const current = summary.find((s) => s.written && s.unit.kind === "unit" && !s.completion?.done);
    for (const s of summary) {
      if (!s.written || !s.unlocked) continue;
      const entry = getUnitIndex(course, s.unit);
      for (const b of entry?.index.blocks ?? []) {
        if (b.kind === "problem" && (started.get(b.key) ?? "new") === "new" && !newProblems.some((n) => n.key === b.key)) {
          newProblems.push({ key: b.key, title: b.title, difficulty: b.difficulty, courseId: course.id, unitId: s.unit.id });
        }
      }
    }
    let sessionHint = null;
    let nextSection: { id: string; title: string } | null = null;
    if (current) {
      const entry = getUnitIndex(course, current.unit)!;
      const state = await getUnitState(course, current.unit, entry.index);
      const c = completion(entry.index, state);
      const firstUnread = entry.index.sections.find((x) => x.readable && !state.readSections.includes(x.id));
      nextSection = firstUnread ? { id: firstUnread.id, title: firstUnread.title } : null;
      sessionHint = { c, unread: c.sections[1] - c.sections[0], drills: c.drills[1] - c.drills[0], problems: c.problems[1] - c.problems[0] };
    }
    courses.push({ course, current, nextSection, sessionHint, done: summary.filter((s) => s.unit.kind === "unit" && s.completion?.done).length, total: summary.filter((s) => s.unit.kind === "unit").length });
  }

  const dueProblems: DueProblem[] = dueRows.map((r) => ({
    key: r.key, title: r.title, difficulty: r.difficulty as Difficulty, status: r.status as DueProblem["status"], step: r.step, anchor: r.anchor, due: r.due,
  }));

  const plan = buildToday({
    today,
    resolveCap: settings.dailyResolveCap,
    cardCap: settings.dailyCardCap,
    dueProblems,
    resolvesDoneToday: resolvesToday[0]?.n ?? 0,
    dueCards: dueCardRows.map((c) => ({ id: c.id, due: c.due, reviewedToday: reviewedToday.has(c.id) })),
    cardsReviewedToday: reviewedToday.size,
    newProblems,
    minutes,
  });

  const primary = courses.find((c) => c.sessionHint) ?? null;
  const session = suggestSession({
    unreadSections: primary?.sessionHint?.unread ?? 0,
    openDrills: primary?.sessionHint?.drills ?? 0,
    unattemptedProblems: primary?.sessionHint?.problems ?? 0,
    dueReviews: plan.resolves.length + plan.cards.length,
    backlog: plan.backlog,
  });

  return { today, plan, courses, session, open: openRows[0] ?? null, settings, cardsReviewedToday: reviewedToday.size, resolvesDoneToday: resolvesToday[0]?.n ?? 0 };
}
