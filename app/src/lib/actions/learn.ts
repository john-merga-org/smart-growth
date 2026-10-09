"use server";

import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema, USER } from "../db";
import { findBlock, findUnit, getCourse, getUnitIndex } from "../content/courses";
import { newCard } from "../srs/cards";
import { getToday } from "../server/session";

const unitPath = (courseId: string, unitId: string) => `/c/${courseId}/${unitId}`;

function requireUnit(courseId: string, unitId: string) {
  const course = getCourse(courseId);
  const unit = course && findUnit(course, unitId);
  const entry = course && unit ? getUnitIndex(course, unit) : null;
  if (!course || !unit || !entry) throw new Error(`Unknown unit ${courseId}/${unitId}`);
  return { course, unit, index: entry.index };
}

async function logActivity(courseId: string | null, kind: string, minutes: number) {
  const db = await getDb();
  const { today } = await getToday();
  await db.insert(schema.activity).values({ userId: USER, courseId, kind, day: today, minutes });
}

/** Enroll a block as an FSRS card (idempotent per source). */
async function enrollCard(kind: "concept" | "quiz" | "ask", blockKey: string, courseId: string, unitId: string) {
  const db = await getDb();
  const { now } = await getToday();
  const c = newCard(now);
  await db
    .insert(schema.cards)
    .values({ userId: USER, kind, sourceKey: blockKey, courseId, unitId, due: c.due, fsrs: c.fsrs })
    .onConflictDoUpdate({
      // A card that already exists and comes back through a wrong answer is due again now.
      target: [schema.cards.userId, schema.cards.sourceKey],
      set: kind === "concept" ? { suspended: false } : { due: now, suspended: false },
    });
}

export async function markSectionRead(courseId: string, unitId: string, sectionId: string, read: boolean) {
  const { index } = requireUnit(courseId, unitId);
  if (!index.sections.some((s) => s.id === sectionId)) throw new Error("Unknown section");
  const db = await getDb();
  if (read) {
    await db.insert(schema.sectionReads).values({ userId: USER, courseId, unitId, sectionId }).onConflictDoNothing();
    // Concept cards enter the review queue when their section is read (design §4).
    for (const b of index.blocks) {
      if (b.kind === "card" && b.sectionId === sectionId) await enrollCard("concept", `${courseId}/${unitId}/${b.id}`, courseId, unitId);
    }
    await logActivity(courseId, "read", 0);
  } else {
    await db.delete(schema.sectionReads).where(and(
      eq(schema.sectionReads.userId, USER), eq(schema.sectionReads.courseId, courseId),
      eq(schema.sectionReads.unitId, unitId), eq(schema.sectionReads.sectionId, sectionId),
    ));
  }
  await maybeComplete(courseId, unitId);
  revalidatePath(unitPath(courseId, unitId));
}

async function saveResponse(blockKey: string, kind: string, response: unknown, correct: boolean | null) {
  const found = findBlock(blockKey);
  if (!found) throw new Error(`Unknown block ${blockKey}`);
  const db = await getDb();
  await db.insert(schema.responses).values({ userId: USER, blockKey, kind, response, correct });
  return found;
}

export async function commitDrill(blockKey: string, answer: string, onPaper: boolean) {
  const { course, unit } = await saveResponse(blockKey, "drill", { answer, onPaper }, null);
  await logActivity(course.id, "drill", 0);
  await maybeComplete(course.id, unit.id);
  revalidatePath(unitPath(course.id, unit.id));
}

/** Objective grading happens client-side (single user); wrong answers become review cards. */
export async function answerQuiz(blockKey: string, response: unknown, correct: boolean | null) {
  const { course, unit, block } = await saveResponse(blockKey, "quiz", response, correct);
  if (block.kind === "quiz" && correct === false) await enrollCard("quiz", blockKey, course.id, unit.id);
  await logActivity(course.id, "quiz", 1);
  revalidatePath(unitPath(course.id, unit.id));
}

/** Checkpoint ask, self-graded after answering out loud. All asks ✓ (latest grade) → checkpoint passed. */
export async function gradeAsk(blockKey: string, ok: boolean) {
  const { course, unit, block } = await saveResponse(blockKey, "ask", null, ok);
  if (block.kind === "ask" && !ok) await enrollCard("ask", blockKey, course.id, unit.id);
  await logActivity(course.id, "ask", 2);

  const { index } = requireUnit(course.id, unit.id);
  const askKeys = index.blocks.filter((b) => b.kind === "ask").map((b) => `${course.id}/${unit.id}/${b.id}`);
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.responses)
    .where(and(eq(schema.responses.userId, USER), inArray(schema.responses.blockKey, askKeys)))
    .orderBy(desc(schema.responses.id));
  const latest = new Map<string, boolean | null>();
  for (const r of rows) if (!latest.has(r.blockKey)) latest.set(r.blockKey, r.correct);
  const passed = askKeys.every((k) => latest.get(k) === true);
  await upsertProgress(course.id, unit.id, { checkpointPassedAt: passed ? new Date() : null });
  await maybeComplete(course.id, unit.id);
  revalidatePath(unitPath(course.id, unit.id));
  revalidatePath(`/c/${course.id}`);
  return { passed };
}

/** Reset the checkpoint to try it again from scratch. */
export async function resetCheckpoint(courseId: string, unitId: string) {
  const { index } = requireUnit(courseId, unitId);
  const db = await getDb();
  const askKeys = index.blocks.filter((b) => b.kind === "ask").map((b) => `${courseId}/${unitId}/${b.id}`);
  if (askKeys.length) {
    await db.insert(schema.responses).values(askKeys.map((blockKey) => ({ userId: USER, blockKey, kind: "ask", response: { reset: true }, correct: null })));
  }
  await upsertProgress(courseId, unitId, { checkpointPassedAt: null });
  revalidatePath(unitPath(courseId, unitId));
}

async function upsertProgress(courseId: string, unitId: string, set: Partial<typeof schema.unitProgress.$inferInsert>) {
  const db = await getDb();
  await db
    .insert(schema.unitProgress)
    .values({ userId: USER, courseId, unitId, ...set })
    .onConflictDoUpdate({ target: [schema.unitProgress.userId, schema.unitProgress.courseId, schema.unitProgress.unitId], set });
}

export async function saveBuild(courseId: string, unitId: string, url: string, checked: boolean) {
  requireUnit(courseId, unitId);
  const clean = url.trim();
  if (clean && !/^https?:\/\//.test(clean)) throw new Error("Link must start with http(s)://");
  await upsertProgress(courseId, unitId, { buildUrl: clean || null, buildChecked: checked });
  await maybeComplete(courseId, unitId);
  revalidatePath(unitPath(courseId, unitId));
}

/** Records completedAt the first time a unit becomes complete (used by the timeline). */
async function maybeComplete(courseId: string, unitId: string) {
  const { course, unit, index } = requireUnit(courseId, unitId);
  const { getUnitState, completion } = await import("../server/learn");
  const state = await getUnitState(course, unit, index);
  const c = completion(index, state);
  const db = await getDb();
  const [row] = await db.select().from(schema.unitProgress).where(and(
    eq(schema.unitProgress.userId, USER), eq(schema.unitProgress.courseId, courseId), eq(schema.unitProgress.unitId, unitId),
  ));
  if (c.done && !row?.completedAt) await upsertProgress(courseId, unitId, { completedAt: new Date() });
  if (!c.done && row?.completedAt) await upsertProgress(courseId, unitId, { completedAt: null });
  // First activity in a course marks the course as started (timeline anchor).
  const { today } = await getToday();
  await db.insert(schema.courseState).values({ userId: USER, courseId, startedOn: today }).onConflictDoNothing();
}

export async function setResource(r: { href: string; title: string; type: string; courseId?: string; unitId?: string }, status: "done" | "saved" | null) {
  const db = await getDb();
  if (!status) {
    await db.delete(schema.resources).where(and(eq(schema.resources.userId, USER), eq(schema.resources.href, r.href)));
  } else {
    const row = { userId: USER, href: r.href, title: r.title, type: r.type, courseId: r.courseId ?? null, unitId: r.unitId ?? null, status, updatedAt: new Date() };
    await db.insert(schema.resources).values(row).onConflictDoUpdate({ target: [schema.resources.userId, schema.resources.href], set: { status, updatedAt: new Date() } });
  }
  if (r.courseId && r.unitId) revalidatePath(unitPath(r.courseId, r.unitId));
  revalidatePath("/notebook");
}

// ── Highlights ────────────────────────────────────────────────────────────

const COLORS = ["key", "confused", "aha", "interview"] as const;

export async function addHighlight(h: { courseId: string; unitId: string; sectionId: string | null; color: string; exact: string; prefix: string; suffix: string }) {
  requireUnit(h.courseId, h.unitId);
  if (!COLORS.includes(h.color as (typeof COLORS)[number])) throw new Error("Bad color");
  if (!h.exact.trim() || h.exact.length > 5000) throw new Error("Bad selection");
  const db = await getDb();
  const [row] = await db
    .insert(schema.highlights)
    .values({ userId: USER, ...h, prefix: h.prefix.slice(-64), suffix: h.suffix.slice(0, 64) })
    .returning({ id: schema.highlights.id });
  revalidatePath(unitPath(h.courseId, h.unitId));
  return row.id;
}

export async function updateHighlight(id: number, set: { color?: string; note?: string | null; resolved?: boolean }) {
  const db = await getDb();
  const patch: Partial<typeof schema.highlights.$inferInsert> = {};
  if (set.color !== undefined) {
    if (!COLORS.includes(set.color as (typeof COLORS)[number])) throw new Error("Bad color");
    patch.color = set.color;
  }
  if (set.note !== undefined) patch.note = set.note?.trim() ? set.note : null;
  if (set.resolved !== undefined) patch.resolvedAt = set.resolved ? new Date() : null;
  const [row] = await db.update(schema.highlights).set(patch).where(and(eq(schema.highlights.userId, USER), eq(schema.highlights.id, id))).returning();
  if (row) revalidatePath(unitPath(row.courseId, row.unitId));
  revalidatePath("/notebook");
  revalidatePath("/progress");
}

export async function deleteHighlight(id: number) {
  const db = await getDb();
  const [row] = await db.delete(schema.highlights).where(and(eq(schema.highlights.userId, USER), eq(schema.highlights.id, id))).returning();
  await db.delete(schema.cards).where(and(eq(schema.cards.userId, USER), eq(schema.cards.sourceKey, `highlight:${id}`)));
  if (row) revalidatePath(unitPath(row.courseId, row.unitId));
  revalidatePath("/notebook");
}

/** The client re-anchors on load and reports which highlights it couldn't find (content changed). */
export async function syncOrphans(courseId: string, unitId: string, orphanIds: number[]) {
  const db = await getDb();
  const all = await db.select({ id: schema.highlights.id, orphan: schema.highlights.orphan }).from(schema.highlights).where(and(
    eq(schema.highlights.userId, USER), eq(schema.highlights.courseId, courseId), eq(schema.highlights.unitId, unitId),
  ));
  for (const h of all) {
    const orphan = orphanIds.includes(h.id);
    if (orphan !== h.orphan) await db.update(schema.highlights).set({ orphan }).where(eq(schema.highlights.id, h.id));
  }
}

/** Highlight → review card: the highlighted text is the prompt, the learner writes the answer. */
export async function highlightToCard(id: number, back: string) {
  const db = await getDb();
  const [h] = await db.select().from(schema.highlights).where(and(eq(schema.highlights.userId, USER), eq(schema.highlights.id, id)));
  if (!h) throw new Error("No such highlight");
  const { now } = await getToday();
  const c = newCard(now);
  await db
    .insert(schema.cards)
    .values({ userId: USER, kind: "highlight", sourceKey: `highlight:${id}`, courseId: h.courseId, unitId: h.unitId, front: h.exact, back, due: c.due, fsrs: c.fsrs })
    .onConflictDoUpdate({ target: [schema.cards.userId, schema.cards.sourceKey], set: { front: h.exact, back } });
}

// ── Notes ─────────────────────────────────────────────────────────────────

export async function saveNote(n: { id?: number; courseId?: string | null; unitId?: string | null; body: string; struggle?: boolean; tags?: string[] }) {
  const db = await getDb();
  const body = n.body.trim();
  if (!body) throw new Error("Empty note");
  const tags = (n.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (n.id) {
    await db.update(schema.notes).set({ body, tags, struggle: n.struggle ?? false, updatedAt: new Date() }).where(and(eq(schema.notes.userId, USER), eq(schema.notes.id, n.id)));
  } else {
    await db.insert(schema.notes).values({ userId: USER, courseId: n.courseId ?? null, unitId: n.unitId ?? null, body, tags, struggle: n.struggle ?? false });
  }
  if (n.courseId && n.unitId) revalidatePath(unitPath(n.courseId, n.unitId));
  revalidatePath("/notebook");
  revalidatePath("/progress");
}

export async function deleteNote(id: number) {
  const db = await getDb();
  const [row] = await db.delete(schema.notes).where(and(eq(schema.notes.userId, USER), eq(schema.notes.id, id))).returning();
  if (row?.courseId && row.unitId) revalidatePath(unitPath(row.courseId, row.unitId));
  revalidatePath("/notebook");
}

export async function resolveStruggleNote(id: number, resolved: boolean) {
  const db = await getDb();
  await db.update(schema.notes).set({ resolvedAt: resolved ? new Date() : null }).where(and(eq(schema.notes.userId, USER), eq(schema.notes.id, id)));
  revalidatePath("/progress");
  revalidatePath("/notebook");
}

export async function unitNotes(courseId: string, unitId: string) {
  const db = await getDb();
  return db.select().from(schema.notes).where(and(eq(schema.notes.userId, USER), eq(schema.notes.courseId, courseId), eq(schema.notes.unitId, unitId))).orderBy(desc(schema.notes.updatedAt));
}

export async function openStruggles() {
  const db = await getDb();
  const [hls, ns] = await Promise.all([
    db.select().from(schema.highlights).where(and(eq(schema.highlights.userId, USER), eq(schema.highlights.color, "confused"), isNull(schema.highlights.resolvedAt))),
    db.select().from(schema.notes).where(and(eq(schema.notes.userId, USER), eq(schema.notes.struggle, true), isNull(schema.notes.resolvedAt))),
  ]);
  return { highlights: hls, notes: ns };
}
