import type { Difficulty } from "../content/types";
import { FIRST_LIMIT_MIN, HINT_WINDOW_MIN, RESOLVE_LIMIT_MIN } from "./ladder";

/**
 * Timer state machine for one problem attempt (design §3). Pure: everything derives from
 * the stored timestamps + `now`, so the server and client always agree.
 */

const MIN = 60_000;
export const MAX_PAUSE_MS = 10 * MIN;

export type AttemptKind = "first" | "resolve";
export type Flag = "hinted" | "overtime" | "needed-solution" | "abandoned";

export interface AttemptTimes {
  kind: AttemptKind;
  difficulty: Difficulty;
  startedAt: number;
  pausedAt: number | null;
  pauseMs: number; // completed pause time (already capped)
  pauseUsed: boolean;
  hintTaken: boolean;
  keptGoing: boolean; // chose "keep going" instead of a hint
}

export const limitMs = (a: Pick<AttemptTimes, "kind" | "difficulty">) =>
  (a.kind === "first" ? FIRST_LIMIT_MIN : RESOLVE_LIMIT_MIN)[a.difficulty] * MIN;

/** Hard cap: an attempt left running auto-fails at 2× its limit. */
export const abandonMs = (a: Pick<AttemptTimes, "kind" | "difficulty">) => 2 * limitMs(a);

export function elapsedMs(a: AttemptTimes, now: number): number {
  const currentPause = a.pausedAt === null ? 0 : Math.min(now - a.pausedAt, MAX_PAUSE_MS);
  return Math.max(0, now - a.startedAt - a.pauseMs - currentPause);
}

export const isPaused = (a: AttemptTimes, now: number) => a.pausedAt !== null && now - a.pausedAt < MAX_PAUSE_MS;

export type Phase =
  | "working" // inside the limit
  | "decide" // first attempt hit the limit: take ONE hint, or keep going?
  | "hint-window" // took the hint: +10 min
  | "overtime" // kept going past the limit
  | "read-solution" // first attempt at limit + 10: time to read the solution
  | "over" // re-solve past its limit: it now counts as a fail
  | "abandoned";

export function phase(a: AttemptTimes, now: number): Phase {
  const e = elapsedMs(a, now);
  const L = limitMs(a);
  if (e >= abandonMs(a)) return "abandoned";
  if (e < L) return "working";
  if (a.kind === "resolve") return "over";
  if (e >= L + HINT_WINDOW_MIN * MIN) return "read-solution";
  if (a.hintTaken) return "hint-window";
  return a.keptGoing ? "overtime" : "decide";
}

/** When the current phase ends (ms of elapsed time), for countdown display. */
export function phaseDeadlineMs(a: AttemptTimes, now: number): number {
  const L = limitMs(a);
  switch (phase(a, now)) {
    case "working": return L;
    case "decide":
    case "hint-window":
    case "overtime": return L + HINT_WINDOW_MIN * MIN;
    default: return abandonMs(a);
  }
}

export interface AttemptResult {
  outcome: "solved" | "failed" | "needed-solution" | "abandoned";
  /** Re-solves: did it pass? (≤ limit, no hint, no solution). First attempts: undefined. */
  passed?: boolean;
  alone: boolean;
  flags: Flag[];
  timeMs: number;
}

export function finish(a: AttemptTimes, now: number, opts: { readSolution?: boolean } = {}): AttemptResult {
  if (phase(a, now) === "abandoned") {
    return { outcome: "abandoned", passed: a.kind === "resolve" ? false : undefined, alone: false, flags: ["abandoned"], timeMs: abandonMs(a) };
  }
  const e = elapsedMs(a, now);
  const L = limitMs(a);
  const flags: Flag[] = [];
  if (a.hintTaken) flags.push("hinted");
  const allowed = a.kind === "first" && a.hintTaken ? L + HINT_WINDOW_MIN * MIN : L;
  if (e > allowed) flags.push("overtime");
  if (opts.readSolution) flags.push("needed-solution");
  const alone = !a.hintTaken && !opts.readSolution;

  if (a.kind === "first") {
    return { outcome: opts.readSolution ? "needed-solution" : "solved", alone, flags, timeMs: e };
  }
  const passed = alone && e <= L;
  return { outcome: passed ? "solved" : "failed", passed, alone, flags, timeMs: e };
}

export function pause(a: AttemptTimes, now: number): AttemptTimes {
  if (a.pauseUsed || a.pausedAt !== null) throw new Error("Only one pause per attempt");
  return { ...a, pausedAt: now };
}

export function resume(a: AttemptTimes, now: number): AttemptTimes {
  if (a.pausedAt === null) return a;
  return { ...a, pausedAt: null, pauseUsed: true, pauseMs: a.pauseMs + Math.min(now - a.pausedAt, MAX_PAUSE_MS) };
}
