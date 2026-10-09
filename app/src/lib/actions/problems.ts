"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema, USER } from "../db";
import { allProblems } from "../content/courses";
import { daysBetween } from "../dates";
import { ladderLabel, type ProblemState } from "../srs/ladder";
import { pause, resume } from "../srs/attempt";
import { closeAttempt, sweepAbandonedAttempts, toTimes, type FinishInput } from "../server/attempts";
import { getToday } from "../server/session";

type ProblemRow = typeof schema.problems.$inferSelect;

const stateOf = (p: ProblemRow): ProblemState => ({ status: p.status as ProblemState["status"], step: p.step, anchor: p.anchor, due: p.due });

function revalidateAll(key: string, courseId?: string, unitId?: string) {
  revalidatePath("/");
  revalidatePath("/problems");
  revalidatePath(`/problems/${key}`);
  revalidatePath("/progress");
  if (courseId && unitId) revalidatePath(`/c/${courseId}/${unitId}`);
}

async function loadAttempt(id: number) {
  const db = await getDb();
  const [a] = await db.select().from(schema.attempts).where(and(eq(schema.attempts.userId, USER), eq(schema.attempts.id, id)));
  if (!a) throw new Error("No such attempt");
  if (a.endedAt) throw new Error("This attempt has already ended");
  return a;
}

export async function startAttempt(problemKey: string): Promise<number> {
  await sweepAbandoned();
  const found = allProblems().get(problemKey);
  if (!found) throw new Error(`Unknown problem ${problemKey}`);
  const { block, courseId, unitId } = found;
  const db = await getDb();
  const { today, now } = await getToday();

  const [open] = await db.select().from(schema.attempts).where(and(eq(schema.attempts.userId, USER), isNull(schema.attempts.endedAt)));
  if (open) {
    if (open.problemKey === problemKey) return open.id;
    throw new Error("Finish or discard your running attempt first.");
  }

  await db
    .insert(schema.problems)
    .values({ userId: USER, key: problemKey, courseId, unitId, title: block.title, difficulty: block.difficulty, pattern: block.pattern, url: block.url, nc: block.nc })
    .onConflictDoUpdate({ target: [schema.problems.userId, schema.problems.key], set: { title: block.title, difficulty: block.difficulty, pattern: block.pattern, url: block.url, nc: block.nc } });
  const [p] = await db.select().from(schema.problems).where(and(eq(schema.problems.userId, USER), eq(schema.problems.key, problemKey)));
  const state = stateOf(p);

  const kind = state.status === "new" ? "first" : "resolve";
  // Re-solving before it's due (or after final retirement) is practice: logged, but the ladder doesn't move.
  const practice = kind === "resolve" && (state.status === "done" || (state.due !== null && daysBetween(today, state.due) > 0));
  const [row] = await db
    .insert(schema.attempts)
    .values({ userId: USER, problemKey, kind, difficulty: p.difficulty, startedAt: now, ladderLabel: practice ? "practice" : ladderLabel(state) })
    .returning({ id: schema.attempts.id });
  revalidateAll(problemKey, courseId, unitId);
  return row.id;
}

export async function pauseAttempt(id: number) {
  const a = await loadAttempt(id);
  const t = pause(toTimes(a), Date.now());
  const db = await getDb();
  await db.update(schema.attempts).set({ pausedAt: new Date(t.pausedAt!) }).where(eq(schema.attempts.id, id));
  revalidatePath(`/problems/${a.problemKey}`);
}

export async function resumeAttempt(id: number) {
  const a = await loadAttempt(id);
  const t = resume(toTimes(a), Date.now());
  const db = await getDb();
  await db.update(schema.attempts).set({ pausedAt: null, pauseMs: t.pauseMs, pauseUsed: true }).where(eq(schema.attempts.id, id));
  revalidatePath(`/problems/${a.problemKey}`);
}

export async function takeHint(id: number) {
  const a = await loadAttempt(id);
  const db = await getDb();
  await db.update(schema.attempts).set({ hintTaken: true }).where(eq(schema.attempts.id, id));
  revalidatePath(`/problems/${a.problemKey}`);
}

export async function keepGoing(id: number) {
  const a = await loadAttempt(id);
  const db = await getDb();
  await db.update(schema.attempts).set({ keptGoing: true }).where(eq(schema.attempts.id, id));
  revalidatePath(`/problems/${a.problemKey}`);
}

/** Started by accident: delete it if it's under 3 minutes old. */
export async function discardAttempt(id: number) {
  const a = await loadAttempt(id);
  if (Date.now() - a.startedAt.getTime() > 3 * 60_000) throw new Error("Only attempts under 3 minutes old can be discarded. Finish it instead.");
  const db = await getDb();
  await db.delete(schema.attempts).where(eq(schema.attempts.id, id));
  revalidateAll(a.problemKey);
}

export async function finishAttempt(id: number, input: FinishInput = {}) {
  const a = await loadAttempt(id);
  return closeAttempt(a, Date.now(), input, true);
}

/** Attempts left running past 2× their limit auto-fail (design §3). */
export async function sweepAbandoned() {
  await sweepAbandonedAttempts(true);
}

export async function addMistake(m: { category: string; what: string; rule: string; problemKey?: string; problemTitle?: string }) {
  const db = await getDb();
  const { today } = await getToday();
  await db.insert(schema.mistakes).values({ userId: USER, day: today, ...m });
  revalidatePath("/progress");
}

export async function addMock(m: { day: string; platform: string; problems: string; result: string; brokeDown?: string; fix?: string }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m.day)) throw new Error("Date must be YYYY-MM-DD");
  const db = await getDb();
  await db.insert(schema.mocks).values({ userId: USER, ...m });
  revalidatePath("/progress");
}
