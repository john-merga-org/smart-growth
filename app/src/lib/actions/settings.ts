"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, schema, USER } from "../db";
import { isValidTz } from "../dates";
import { getSettings } from "../server/session";
import { SESSION_COOKIE } from "../auth";

export async function saveSettings(form: FormData) {
  const db = await getDb();
  await getSettings(); // ensure the row exists
  const int = (k: string, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(form.get(k)))));
  const tz = String(form.get("tz") ?? "");
  await db
    .update(schema.settings)
    .set({
      dailyResolveCap: int("dailyResolveCap", 1, 20),
      dailyCardCap: int("dailyCardCap", 1, 200),
      aiMonthlyCapUsd: Math.max(0, Number(form.get("aiMonthlyCapUsd")) || 0),
      ...(isValidTz(tz) ? { tz } : {}),
    })
    .where(eq(schema.settings.userId, USER));
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("start:")) continue;
    const courseId = key.slice(6);
    const day = String(value);
    if (day && !/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    await db
      .insert(schema.courseState)
      .values({ userId: USER, courseId, startedOn: day || null })
      .onConflictDoUpdate({ target: [schema.courseState.userId, schema.courseState.courseId], set: { startedOn: day || null } });
  }
  revalidatePath("/", "layout");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
