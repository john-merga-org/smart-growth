"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ReviewCtx } from "../unit/review-context";
import { Button } from "../ui";
import { rateCard, suspendCard } from "@/lib/actions/review";

const RATINGS = [
  { r: 1, label: "Again", variant: "danger" },
  { r: 2, label: "Hard", variant: "secondary" },
  { r: 3, label: "Good", variant: "success" },
  { r: 4, label: "Easy", variant: "secondary" },
] as const;

export function ReviewSession({ cardId, intervals, children }: { cardId: number; intervals: Record<1 | 2 | 3 | 4, string>; children: ReactNode }) {
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);
  const [suggested, setSuggested] = useState<1 | 3 | undefined>();
  const [pending, start] = useTransition();

  const rate = (r: 1 | 2 | 3 | 4) =>
    start(async () => {
      await rateCard(cardId, r);
      setRevealed(false);
      setSuggested(undefined);
      router.refresh();
    });

  return (
    <ReviewCtx.Provider value={{ revealed, reveal: (s) => { setRevealed(true); setSuggested(s); } }}>
      <div key={cardId}>{children}</div>
      <div className="sticky bottom-16 z-20 mt-6 rounded-lg border border-line bg-bg/95 p-3 backdrop-blur md:bottom-4">
        {revealed ? (
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map(({ r, label, variant }) => (
              <Button key={r} variant={variant} disabled={pending} onClick={() => rate(r)} className={suggested === r ? "ring-2 ring-accent" : ""}>
                <span className="flex flex-col items-center leading-tight">
                  <span>{label}</span>
                  <span className="text-[11px] opacity-70">{intervals[r]}</span>
                </span>
              </Button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-ink-3">Answer first, then rate how well you recalled it.</span>
            <Button variant="ghost" size="sm" onClick={() => confirm("Suspend this card? It won't come back.") && start(async () => { await suspendCard(cardId); router.refresh(); })}>Suspend</Button>
          </div>
        )}
      </div>
    </ReviewCtx.Provider>
  );
}
