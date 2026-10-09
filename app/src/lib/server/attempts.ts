import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema, USER } from "../db";
import { afterFirstAttempt, afterResolve, type ProblemState } from "../srs/ladder";
import { finish, phase, type AttemptTimes } from "../srs/attempt";
import { getToday } from "./session";
import type { Difficulty } from "../content/types";

type AttemptRow = typeof schema.attempts.$inferSelect;

export interface FinishInput {
  readSolution?: boolean;
  notes?: string;
  mistake?: { category: string; what: string; rule: string };
}

export const toTimes = (a: AttemptRow): AttemptTimes => ({
  kind: a.kind as AttemptTimes["kind"],
  difficulty: a.difficulty as Difficulty,
  startedAt: a.startedAt.getTime(),
  pausedAt: a.pausedAt?.getTime() ?? null,
  pauseMs: a.pauseMs,
  pauseUsed: a.pauseUsed,
  hintTaken: a.hintTaken,
  keptGoing: a.keptGoing,
});

/** Ends an attempt and moves the problem along the ladder. `revalidate` is false when called during render. */
export async function closeAttempt(a: AttemptRow, nowMs: number, input: FinishInput, revalidate: boolean) {
  const db = await getDb();
  const { today } = await getToday();
  const result = finish(toTimes(a), nowMs, { readSolution: input.readSolution });
  const endedAt = result.outcome === "abandoned" ? new Date(a.startedAt.getTime() + result.timeMs + a.pauseMs) : new Date(nowMs);

  await db
    .update(schema.attempts)
    .set({
      endedAt, endedOn: today, outcome: result.outcome, passed: result.passed ?? null, alone: result.alone,
      flags: result.flags, timeMs: Math.round(result.timeMs), notes: input.notes?.trim() || null, pausedAt: null,
    })
    .where(eq(schema.attempts.id, a.id));

  const [p] = await db.select().from(schema.problems).where(and(eq(schema.problems.userId, USER), eq(schema.problems.key, a.problemKey)));
  if (p && a.ladderLabel !== "practice") {
    const before: ProblemState = { status: p.status as ProblemState["status"], step: p.step, anchor: p.anchor, due: p.due };
    const next =
      a.kind === "first"
        ? afterFirstAttempt(result.outcome === "failed" ? "needed-solution" : (result.outcome as "solved" | "needed-solution" | "abandoned"), today)
        : afterResolve(before, result.passed === true, today);
    await db
      .update(schema.problems)
      .set({
        status: next.status, step: next.step, anchor: next.anchor, due: next.due,
        firstSolvedOn: p.firstSolvedOn ?? (next.status === "ladder" ? today : null),
        retiredOn: next.status === "retired" && before.status !== "retired" ? today : p.retiredOn,
      })
      .where(and(eq(schema.problems.userId, USER), eq(schema.problems.key, a.problemKey)));
  }

  if (input.mistake?.what.trim()) {
    await db.insert(schema.mistakes).values({
      userId: USER, day: today, problemKey: a.problemKey, problemTitle: p?.title ?? a.problemKey,
      category: input.mistake.category, what: input.mistake.what.trim(), rule: input.mistake.rule.trim(),
    });
  }
  await db.insert(schema.activity).values({ userId: USER, courseId: p?.courseId ?? null, kind: "attempt", day: today, minutes: result.timeMs / 60_000 });

  if (revalidate) {
    for (const path of ["/", "/problems", `/problems/${a.problemKey}`, "/progress"]) revalidatePath(path);
    if (p) revalidatePath(`/c/${p.courseId}/${p.unitId}`);
  }
  return result;
}

export async function sweepAbandonedAttempts(revalidate = false) {
  const db = await getDb();
  const open = await db.select().from(schema.attempts).where(and(eq(schema.attempts.userId, USER), isNull(schema.attempts.endedAt)));
  const now = Date.now();
  for (const a of open) if (phase(toTimes(a), now) === "abandoned") await closeAttempt(a, now, {}, revalidate);
}
