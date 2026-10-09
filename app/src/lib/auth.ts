import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Single-user auth: one passcode (APP_PASSWORD) → an HMAC-signed session cookie.
 * Deviation from the design's Supabase auth; see docs/IMPLEMENTATION_PROGRESS.md.
 */
export const SESSION_COOKIE = "sg_session";
export const SESSION_DAYS = 90;

function secret(): string {
  const s = process.env.SESSION_SECRET ?? (process.env.NODE_ENV !== "production" ? "dev-only-secret" : "");
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function createSessionToken(now = Date.now()): string {
  const payload = `me.${now + SESSION_DAYS * 86_400_000}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const payload = token.slice(0, i);
  const given = Buffer.from(token.slice(i + 1));
  const expected = Buffer.from(sign(payload));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;
  const expires = Number(payload.split(".")[1]);
  return Number.isFinite(expires) && expires > now;
}

export function checkPassword(input: string): boolean {
  const expected = process.env.APP_PASSWORD ?? (process.env.NODE_ENV !== "production" ? "dev" : "");
  if (!expected) return false;
  const a = Buffer.from(sign(input));
  const b = Buffer.from(sign(expected));
  return timingSafeEqual(a, b);
}
