import { createEmptyCard, fsrs, Rating, type Card, type Grade } from "ts-fsrs";

/** FSRS for concept/quiz/checkpoint/highlight cards (design §4). Stored as JSON with ISO dates. */
const scheduler = fsrs({ enable_fuzz: true });

export type StoredCard = Omit<Card, "due" | "last_review"> & { due: string; last_review?: string };

const toStored = (c: Card): StoredCard => ({ ...c, due: c.due.toISOString(), last_review: c.last_review?.toISOString() });
const fromStored = (s: StoredCard): Card => ({ ...s, due: new Date(s.due), last_review: s.last_review ? new Date(s.last_review) : undefined });

export function newCard(now: Date): { fsrs: StoredCard; due: Date } {
  const c = createEmptyCard(now);
  return { fsrs: toStored(c), due: c.due };
}

export function reviewCard(stored: StoredCard, rating: 1 | 2 | 3 | 4, now: Date): { fsrs: StoredCard; due: Date } {
  const next = scheduler.next(fromStored(stored), now, rating as Grade).card;
  return { fsrs: toStored(next), due: next.due };
}

/** Human interval preview per rating, e.g. { 1: "10m", 3: "3d" }. */
export function previewIntervals(stored: StoredCard, now: Date): Record<1 | 2 | 3 | 4, string> {
  const preview = scheduler.repeat(fromStored(stored), now);
  const fmt = (d: Date) => {
    const mins = Math.max(1, Math.round((d.getTime() - now.getTime()) / 60_000));
    if (mins < 60) return `${mins}m`;
    if (mins < 60 * 24) return `${Math.round(mins / 60)}h`;
    const days = Math.round(mins / 1440);
    return days < 31 ? `${days}d` : days < 365 ? `${Math.round(days / 30)}mo` : `${(days / 365).toFixed(1)}y`;
  };
  return {
    1: fmt(preview[Rating.Again].card.due),
    2: fmt(preview[Rating.Hard].card.due),
    3: fmt(preview[Rating.Good].card.due),
    4: fmt(preview[Rating.Easy].card.due),
  };
}
