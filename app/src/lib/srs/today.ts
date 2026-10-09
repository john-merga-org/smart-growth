import type { Day } from "../dates";
import { RESOLVE_LIMIT_MIN, FIRST_LIMIT_MIN, HINT_WINDOW_MIN, relativeLateness, type ProblemState } from "./ladder";
import type { Difficulty } from "../content/types";

/**
 * The "Today" queue (design §4): daily caps, review-before-new, backlog mode, time box.
 * Pure — the server gathers the inputs, this decides what to show.
 */

export interface DueProblem extends ProblemState {
  key: string;
  title: string;
  difficulty: Difficulty;
}
export interface NewProblem {
  key: string;
  title: string;
  difficulty: Difficulty;
  courseId: string;
  unitId: string;
}
export interface DueCard {
  id: number;
  due: Date;
  reviewedToday: boolean; // a learning-step repeat: doesn't count against the cap again
}

export interface TodayInput {
  today: Day;
  resolveCap: number;
  cardCap: number;
  dueProblems: DueProblem[]; // status redo|ladder|retired with due <= today
  resolvesDoneToday: number;
  dueCards: DueCard[];
  cardsReviewedToday: number; // distinct cards
  newProblems: NewProblem[]; // unattempted problems from unlocked units, course order
  minutes?: number; // optional time box
}

export interface TodayPlan {
  backlog: boolean;
  resolves: DueProblem[];
  resolvesLeftAfterCap: number; // due but held back by the cap
  cards: DueCard[];
  cardsLeftAfterCap: number;
  newProblems: NewProblem[];
  newBlockedBy: "backlog" | "reviews-first" | null;
  estimateMin: number;
}

const BACKLOG_DAYS = 2;
const CARD_MIN = 0.5;
const NEW_PER_DAY = 3;

export function buildToday(input: TodayInput): TodayPlan {
  const { today, resolveCap, cardCap } = input;

  // Backlog: more overdue than ~2 days of cap.
  const backlog = input.dueProblems.length > BACKLOG_DAYS * resolveCap || input.dueCards.length > BACKLOG_DAYS * cardCap;

  // Re-solves: most overdue relative to their interval first, capped per day.
  const sorted = [...input.dueProblems].sort((a, b) => relativeLateness(b, today) - relativeLateness(a, today));
  const resolveRoom = Math.max(0, resolveCap - input.resolvesDoneToday);
  let resolves = sorted.slice(0, resolveRoom);

  // Cards: learning repeats always show; new-for-today cards fill the remaining cap (oldest due first).
  const repeats = input.dueCards.filter((c) => c.reviewedToday);
  const fresh = input.dueCards.filter((c) => !c.reviewedToday).sort((a, b) => a.due.getTime() - b.due.getTime());
  const cardRoom = Math.max(0, cardCap - input.cardsReviewedToday);
  let cards = [...repeats, ...fresh.slice(0, cardRoom)];

  // New problems only once today's re-solves are cleared, and never in backlog mode.
  let newBlockedBy: TodayPlan["newBlockedBy"] = null;
  let newProblems: NewProblem[] = [];
  if (backlog) newBlockedBy = "backlog";
  else if (resolves.length > 0) newBlockedBy = "reviews-first";
  else newProblems = input.newProblems.slice(0, NEW_PER_DAY);

  // Time box: fill by priority (re-solves → cards → new problems).
  if (input.minutes !== undefined) {
    let left = input.minutes;
    const take = <T,>(items: T[], cost: (t: T) => number) =>
      items.filter((t) => {
        const c = cost(t);
        if (c > left) return false;
        left -= c;
        return true;
      });
    resolves = take(resolves, (p) => RESOLVE_LIMIT_MIN[p.difficulty]);
    cards = take(cards, () => CARD_MIN);
    newProblems = take(newProblems, (p) => FIRST_LIMIT_MIN[p.difficulty] + HINT_WINDOW_MIN);
  }

  const estimateMin = Math.round(
    resolves.reduce((s, p) => s + RESOLVE_LIMIT_MIN[p.difficulty], 0) +
      cards.length * CARD_MIN +
      newProblems.reduce((s, p) => s + FIRST_LIMIT_MIN[p.difficulty], 0),
  );

  return {
    backlog,
    resolves,
    resolvesLeftAfterCap: sorted.length - Math.min(sorted.length, resolveRoom),
    cards,
    cardsLeftAfterCap: fresh.length - Math.min(fresh.length, cardRoom),
    newProblems,
    newBlockedBy,
    estimateMin,
  };
}

export type SessionType = "Learn" | "Implement" | "Problems" | "Review";

/** The README weekly rhythm, reduced to "what's the next useful kind of session". */
export function suggestSession(s: { unreadSections: number; openDrills: number; unattemptedProblems: number; dueReviews: number; backlog: boolean }): {
  type: SessionType;
  why: string;
} {
  if (s.backlog) return { type: "Review", why: "You're in backlog mode. Clear reviews before new material." };
  if (s.dueReviews >= 6) return { type: "Review", why: "A review session now keeps the backlog from building." };
  if (s.unreadSections > 0) return { type: "Learn", why: `${s.unreadSections} section(s) left to read in your current module.` };
  if (s.openDrills > 0) return { type: "Implement", why: `${s.openDrills} drill(s) left. Build it from scratch before using the library.` };
  if (s.unattemptedProblems > 0) return { type: "Problems", why: `${s.unattemptedProblems} module problem(s) not attempted yet.` };
  return { type: "Review", why: "Module material is done. Review, then pass the Checkpoint." };
}
