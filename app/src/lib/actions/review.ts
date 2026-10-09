"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema, USER } from "../db";
import { reviewCard, type StoredCard } from "../srs/cards";
import { getToday } from "../server/session";

export async function rateCard(cardId: number, rating: 1 | 2 | 3 | 4) {
  if (![1, 2, 3, 4].includes(rating)) throw new Error("Bad rating");
  const db = await getDb();
  const [card] = await db.select().from(schema.cards).where(and(eq(schema.cards.userId, USER), eq(schema.cards.id, cardId)));
  if (!card) throw new Error("No such card");
  const { now, today } = await getToday();
  const next = reviewCard(card.fsrs as StoredCard, rating, now);
  await db.update(schema.cards).set({ fsrs: next.fsrs, due: next.due }).where(eq(schema.cards.id, cardId));
  await db.insert(schema.reviewLogs).values({ userId: USER, cardId, rating, wasDue: card.due, reviewedOn: today });
  await db.insert(schema.activity).values({ userId: USER, courseId: card.courseId, kind: "review", day: today, minutes: 0.5 });
  revalidatePath("/review");
  revalidatePath("/");
}

export async function suspendCard(cardId: number) {
  const db = await getDb();
  await db.update(schema.cards).set({ suspended: true }).where(and(eq(schema.cards.userId, USER), eq(schema.cards.id, cardId)));
  revalidatePath("/review");
  revalidatePath("/");
}
