import "server-only";
import fs from "node:fs";
import path from "node:path";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { migrate as migratePg } from "drizzle-orm/postgres-js/migrator";
import { connection } from "next/server";
import * as schema from "./schema";

/**
 * DATABASE_URL set → real Postgres (Supabase/Neon in production).
 * Not set → embedded PGlite in app/.data/ for local dev. Same schema, same SQL.
 * Migrations run once on first use.
 */
type Db = ReturnType<typeof drizzlePg<typeof schema>>;

const MIGRATIONS = path.join(/*turbopackIgnore: true*/ process.cwd(), "drizzle");
const g = globalThis as unknown as { __sgDb?: Promise<Db> };

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const db = drizzlePg(postgres(url, { prepare: false, max: 5 }), { schema });
    await migratePg(db, { migrationsFolder: MIGRATIONS });
    return db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = process.env.PGLITE_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), ".data", "pglite");
  fs.mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  // The query builders are API-compatible; one type keeps call sites simple.
  return db as unknown as Db;
}

/** Every DB read is per-user, per-request data: connection() keeps such pages out of build-time prerendering. */
export async function getDb(): Promise<Db> {
  await connection();
  return rawDb();
}

function rawDb(): Promise<Db> {
  g.__sgDb ??= connect().catch((e) => {
    g.__sgDb = undefined;
    throw e;
  });
  return g.__sgDb;
}

export { schema };
export const USER = "me";
