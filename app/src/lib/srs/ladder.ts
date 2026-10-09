import { addDays, daysBetween, type Day } from "../dates";
import type { Difficulty } from "../content/types";

/**
 * DSA re-solve ladder (design §3). Offsets are days after the first solve ("anchor"),
 * matching the README: re-solve at +1, +3, +7, +14, +30 after the first solve.
 * Passing +30 retires the problem; a retired problem gets one silent +90 re-check.
 */
export const LADDER = [1, 3, 7, 14, 30] as const;
export const RECHECK_DAYS = 90;

export const FIRST_LIMIT_MIN: Record<Difficulty, number> = { E: 15, M: 25, H: 40 };
export const RESOLVE_LIMIT_MIN: Record<Difficulty, number> = { E: 10, M: 15, H: 25 };
export const HINT_WINDOW_MIN = 10;

export type ProblemStatus =
  | "new" // never solved
  | "redo" // needed the solution; tomorrow's blank-file re-solve counts as the real first solve
  | "ladder" // in spaced re-solves; `step` = index into LADDER of the next re-solve
  | "retired" // passed +30; waiting on the +90 re-check
  | "done"; // passed the +90 re-check

export interface ProblemState {
  status: ProblemStatus;
  step: number;
  anchor: Day | null;
  due: Day | null;
}

export const NEW_PROBLEM: ProblemState = { status: "new", step: 0, anchor: null, due: null };

const startLadder = (today: Day): ProblemState => ({ status: "ladder", step: 0, anchor: today, due: addDays(today, LADDER[0]) });

export type FirstOutcome = "solved" | "needed-solution" | "abandoned";

export function afterFirstAttempt(outcome: FirstOutcome, today: Day): ProblemState {
  if (outcome === "solved") return startLadder(today);
  if (outcome === "needed-solution") return { status: "redo", step: 0, anchor: null, due: addDays(today, 1) };
  return NEW_PROBLEM; // abandoned: back to the new-problem pool
}

export function afterResolve(state: ProblemState, passed: boolean, today: Day): ProblemState {
  switch (state.status) {
    case "redo":
      return passed ? startLadder(today) : { ...state, due: addDays(today, 1) };
    case "ladder": {
      if (!passed) return startLadder(today);
      const next = state.step + 1;
      if (next >= LADDER.length) return { status: "retired", step: next, anchor: state.anchor, due: addDays(today, RECHECK_DAYS) };
      // Lateness never resets progress, but the next re-solve is at least a day away.
      const onSchedule = addDays(state.anchor!, LADDER[next]);
      const due = daysBetween(today, onSchedule) >= 1 ? onSchedule : addDays(today, 1);
      return { ...state, step: next, due };
    }
    case "retired":
      return passed ? { ...state, status: "done", due: null } : startLadder(today);
    default:
      return state;
  }
}

/** Length (days) of the gap this re-solve tests: used to rank overdue items by relative lateness. */
export function intervalOf(state: ProblemState): number {
  if (state.status === "ladder") return LADDER[state.step] - (state.step > 0 ? LADDER[state.step - 1] : 0);
  if (state.status === "retired") return RECHECK_DAYS;
  return 1;
}

/** 0 when due today; 1.0 means late by a whole interval. Higher = more urgent. */
export function relativeLateness(state: ProblemState, today: Day): number {
  if (!state.due) return -Infinity;
  return daysBetween(state.due, today) / intervalOf(state);
}

export function ladderLabel(state: ProblemState): string {
  switch (state.status) {
    case "new": return "New";
    case "redo": return "Blank-file redo";
    case "ladder": return `+${LADDER[state.step]}`;
    case "retired": return "Retired · +90 check";
    case "done": return "Retired";
  }
}
