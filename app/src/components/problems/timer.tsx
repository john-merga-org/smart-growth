"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, cx } from "../ui";
import { discardAttempt, finishAttempt, keepGoing, pauseAttempt, resumeAttempt, takeHint } from "@/lib/actions/problems";
import { MAX_PAUSE_MS, elapsedMs, finish, isPaused, limitMs, phase, phaseDeadlineMs, type AttemptTimes, type Phase } from "@/lib/srs/attempt";
import { HINT_WINDOW_MIN } from "@/lib/srs/ladder";

interface Props {
  attempt: AttemptTimes & { id: number; ladderLabel: string | null };
  url: string;
  categories: string[];
}

const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const PHASE_COPY: Record<Phase, { title: string; body: string; tone: string }> = {
  working: { title: "Working", body: "Clarify → examples → brute force → optimize → code → test → complexity. Say steps 1–4 out loud.", tone: "border-line" },
  decide: { title: "Time's up: no approach yet?", body: "Take ONE hint (+10 min, flagged hinted) or keep going (flagged overtime).", tone: "border-warn" },
  "hint-window": { title: "Hint window", body: "10 more minutes after your hint.", tone: "border-warn" },
  overtime: { title: "Overtime", body: "You chose to keep going. At the end of the window, read the solution.", tone: "border-warn" },
  "read-solution": { title: "Read the solution", body: "Struggling further teaches very little. Read or watch the solution until you understand WHY, then close it. A blank-file re-solve is scheduled for tomorrow.", tone: "border-bad" },
  over: { title: "Over the re-solve limit", body: "This re-solve counts as a fail (back to +1). Finish it anyway, then log what slowed you down.", tone: "border-bad" },
  abandoned: { title: "Abandoned", body: "Left running past 2× the limit. Auto-failed.", tone: "border-bad" },
};

export function AttemptTimer({ attempt, url, categories }: Props) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [pending, start] = useTransition();
  const [finishing, setFinishing] = useState<null | { readSolution: boolean }>(null);
  const [notes, setNotes] = useState("");
  const [mistake, setMistake] = useState({ category: categories[0], what: "", rule: "" });
  const lastPhase = useRef<Phase | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const p = phase(attempt, now);
  const e = elapsedMs(attempt, now);
  const L = limitMs(attempt);
  const deadline = phaseDeadlineMs(attempt, now);
  const paused = isPaused(attempt, now);
  const isResolve = attempt.kind === "resolve";

  // Notify on phase changes (the tab may be in the background while you're on LeetCode).
  useEffect(() => {
    if (lastPhase.current && lastPhase.current !== p && p !== "working") {
      if ("Notification" in window && Notification.permission === "granted") new Notification(PHASE_COPY[p].title, { body: PHASE_COPY[p].body });
      if (p === "abandoned") run(() => finishAttempt(attempt.id, {}));
    }
    lastPhase.current = p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p]);

  const run = (fn: () => Promise<unknown>, after?: () => void) =>
    start(async () => {
      try {
        await fn();
        after?.();
        router.refresh();
      } catch (err) {
        alert((err as Error).message);
      }
    });

  const preview = finishing ? finish(attempt, now, { readSolution: finishing.readSolution }) : null;
  const pct = Math.min(100, (e / (attempt.kind === "first" ? L + HINT_WINDOW_MIN * 60_000 : L)) * 100);

  return (
    <div className={cx("space-y-4 rounded-lg border-2 bg-surface p-5", PHASE_COPY[p].tone)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-ink-3">
            {isResolve ? `Re-solve ${attempt.ladderLabel ?? ""}` : "First attempt"} · limit {mmss(L)}
            {attempt.hintTaken && <Badge tone="warn" className="ml-2">hinted</Badge>}
            {attempt.ladderLabel === "practice" && <Badge className="ml-2">practice: ladder unaffected</Badge>}
          </div>
          <div className="font-mono text-5xl font-semibold tabular-nums">{mmss(e)}</div>
          <div className="text-sm text-ink-3">{paused ? `Paused. Auto-resumes in ${mmss(MAX_PAUSE_MS - (now - (attempt.pausedAt ?? now)))}` : p === "working" || p === "hint-window" || p === "overtime" || p === "decide" ? `${mmss(deadline - e)} left in this phase` : ""}</div>
        </div>
        <a href={url} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline">LeetCode ↗</a>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={cx("h-full transition-all", p === "working" ? "bg-accent" : p === "read-solution" || p === "over" ? "bg-bad" : "bg-warn")} style={{ width: `${pct}%` }} />
      </div>

      <div className="rounded-md bg-muted px-3 py-2 text-sm">
        <b>{PHASE_COPY[p].title}.</b> {PHASE_COPY[p].body}
      </div>

      {!finishing && (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" disabled={pending} onClick={() => setFinishing({ readSolution: false })}>✓ Done: solved</Button>
          {p === "decide" && (
            <>
              <Button disabled={pending} onClick={() => run(() => takeHint(attempt.id))}>Take ONE hint</Button>
              <Button disabled={pending} onClick={() => run(() => keepGoing(attempt.id))}>Keep going</Button>
            </>
          )}
          {isResolve && !attempt.hintTaken && (
            <Button variant="ghost" disabled={pending} onClick={() => confirm("A hint makes this re-solve a fail (back to +1). Take it?") && run(() => takeHint(attempt.id))}>Hint (fails re-solve)</Button>
          )}
          {!isResolve && (
            <Button variant={p === "read-solution" ? "danger" : "ghost"} disabled={pending} onClick={() => setFinishing({ readSolution: true })}>
              I read the solution
            </Button>
          )}
          {paused ? (
            <Button variant="ghost" disabled={pending} onClick={() => run(() => resumeAttempt(attempt.id))}>▶ Resume</Button>
          ) : (
            !attempt.pauseUsed && attempt.pausedAt === null && <Button variant="ghost" disabled={pending} onClick={() => run(() => pauseAttempt(attempt.id))}>⏸ Pause (once, ≤10 min)</Button>
          )}
          {e < 3 * 60_000 && (
            <Button variant="ghost" disabled={pending} onClick={() => confirm("Discard this attempt? (Started by accident.)") && run(() => discardAttempt(attempt.id))}>Discard</Button>
          )}
        </div>
      )}

      {finishing && preview && (
        <div className="space-y-3 rounded-md border border-line p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>Result:</span>
            {isResolve ? (
              preview.passed ? <Badge tone="good">✓ pass: moves up the ladder</Badge> : <Badge tone="bad">✗ fail: back to +1</Badge>
            ) : preview.outcome === "needed-solution" ? (
              <Badge tone="warn">needed solution: blank-file redo tomorrow</Badge>
            ) : (
              <Badge tone="good">solved{preview.alone ? " alone" : ""}: re-solve in 1 day</Badge>
            )}
            {preview.flags.map((f) => <Badge key={f} tone="warn">{f}</Badge>)}
            <span className="text-ink-3">· {mmss(preview.timeMs)}</span>
          </div>
          <textarea value={notes} onChange={(ev) => setNotes(ev.target.value)} placeholder="Notes (optional): approach, what clicked…" className="min-h-16 w-full rounded-md border border-line bg-bg p-2 text-sm" />
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Mistakes log (optional, but write the rule)</legend>
            <select value={mistake.category} onChange={(ev) => setMistake({ ...mistake, category: ev.target.value })} className="h-9 rounded-md border border-line bg-bg px-2 text-sm">
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input value={mistake.what} onChange={(ev) => setMistake({ ...mistake, what: ev.target.value })} placeholder="What went wrong" className="h-9 w-full rounded-md border border-line bg-bg px-2 text-sm" />
            <input value={mistake.rule} onChange={(ev) => setMistake({ ...mistake, rule: ev.target.value })} placeholder="Rule: what you'll do differently next time" className="h-9 w-full rounded-md border border-line bg-bg px-2 text-sm" />
          </fieldset>
          <div className="flex gap-2">
            <Button
              variant="primary"
              disabled={pending || (!!mistake.what.trim() && !mistake.rule.trim())}
              onClick={() => run(() => finishAttempt(attempt.id, { readSolution: finishing.readSolution, notes, mistake: mistake.what.trim() ? mistake : undefined }))}
            >
              Save result
            </Button>
            <Button variant="ghost" onClick={() => setFinishing(null)}>Back to timer</Button>
          </div>
          {!!mistake.what.trim() && !mistake.rule.trim() && <p className="text-xs text-warn">The rule is the point of the log. Add one.</p>}
        </div>
      )}
    </div>
  );
}
