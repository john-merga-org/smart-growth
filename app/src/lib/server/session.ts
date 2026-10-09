import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, schema, USER } from "../db";
import { DEFAULT_TZ, isValidTz, localDay, type Day } from "../dates";

export async function getSettings() {
  const db = await getDb();
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.userId, USER));
  if (row) return row;
  const [created] = await db.insert(schema.settings).values({ userId: USER }).onConflictDoNothing().returning();
  return created ?? (await db.select().from(schema.settings).where(eq(schema.settings.userId, USER)))[0];
}

/** The browser's timezone (set by <TzCookie/>) wins; settings is the fallback. */
export async function getTz(): Promise<string> {
  const fromCookie = (await cookies()).get("tz")?.value;
  if (isValidTz(fromCookie)) return fromCookie;
  const s = await getSettings();
  return isValidTz(s.tz) ? s.tz : DEFAULT_TZ;
}

export async function getToday(): Promise<{ tz: string; today: Day; now: Date }> {
  const tz = await getTz();
  const now = new Date();
  return { tz, today: localDay(now, tz), now };
}
