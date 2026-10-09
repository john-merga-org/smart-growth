"use client";

import { useReview } from "../unit/review-context";
import { Button } from "../ui";

export function HighlightCard({ front, back }: { front: string; back: string }) {
  const review = useReview();
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-3">From your highlight</div>
      <blockquote className="mt-2 border-l-4 border-yellow-400 pl-3 text-lg">{front}</blockquote>
      {review?.revealed ? (
        <p className="mt-4 whitespace-pre-wrap">{back}</p>
      ) : (
        <Button className="mt-4" onClick={() => review?.reveal()}>Show answer</Button>
      )}
    </div>
  );
}
