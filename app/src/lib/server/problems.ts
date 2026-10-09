import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb, schema, USER } from "../db";
import { allProblems } from "../content/courses";

export async function problemDetail(key: string) {
  const found = allProblems().get(key);
  if (!found) return null;
  const db = await getDb();
  const [row] = await db.select().from(schema.problems).where(and(eq(schema.problems.userId, USER), eq(schema.problems.key, key)));
  const history = await db.select().from(schema.attempts).where(and(eq(schema.attempts.userId, USER), eq(schema.attempts.problemKey, key))).orderBy(desc(schema.attempts.id));
  const [open] = await db.select().from(schema.attempts).where(and(eq(schema.attempts.userId, USER), isNull(schema.attempts.endedAt)));
  return { ...found, row: row ?? null, history, open: open ?? null };
}
