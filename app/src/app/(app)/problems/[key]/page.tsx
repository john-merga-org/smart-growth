import Link from "next/link";
import { notFound } from "next/navigation";
import { problemDetail } from "@/lib/server/problems";
import { sweepAbandonedAttempts } from "@/lib/server/attempts";
import { AttemptTimer } from "@/components/problems/timer";
import { StartButton } from "@/components/problems/start-button";
import { Badge, DIFF_LABEL, DIFF_TONE } from "@/components/ui";
import { ladderLabel, type ProblemState } from "@/lib/srs/ladder";
import { MISTAKE_CATEGORIES } from "@/lib/constants";

type Params = { params: Promise<{ key: string }> };

export async function generateMetadata({ params }: Params) {
  const d = await problemDetail((await params).key);
  return { title: d?.block.title ?? "Problem" };
}

const fmt = (ms: number | null) => (ms === null ? "—" : `${Math.floor(ms / 60_000)}m ${String(Math.round((ms % 60_000) / 1000)).padStart(2, "0")}s`);

export default async function ProblemPage({ params }: Params) {
  const { key } = await params;
  await sweepAbandonedAttempts();
  const d = await problemDetail(key);
  if (!d) notFound();
  const { block, row, history, open } = d;
  const state: ProblemState = row ? { status: row.status as ProblemState["status"], step: row.step, anchor: row.anchor, due: row.due } : { status: "new", step: 0, anchor: null, due: null };
  const mine = open && open.problemKey === key ? open : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <Link href={`/c/${d.courseId}/${d.unitId}`} className="text-sm text-ink-3 hover:underline">← Module {d.unitId}</Link>
        <h1 className="text-2xl font-semibold">
          {block.lc && <span className="text-ink-3">{block.lc}. </span>}
          {block.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={DIFF_TONE[block.difficulty]}>{DIFF_LABEL[block.difficulty]}</Badge>
          <Badge>{block.pattern}</Badge>
          {block.nc && <Badge tone="accent">NC150</Badge>}
          <Badge tone={state.status === "done" || state.status === "retired" ? "good" : "neutral"}>{ladderLabel(state)}{state.due ? ` · due ${state.due}` : ""}</Badge>
          <a href={block.url} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline">Open on LeetCode ↗</a>
        </div>
      </div>

      {mine ? (
        <AttemptTimer
          attempt={{
            id: mine.id, kind: mine.kind as "first" | "resolve", difficulty: block.difficulty, startedAt: mine.startedAt.getTime(),
            pausedAt: mine.pausedAt?.getTime() ?? null, pauseMs: mine.pauseMs, pauseUsed: mine.pauseUsed, hintTaken: mine.hintTaken,
            keptGoing: mine.keptGoing, ladderLabel: mine.ladderLabel,
          }}
          url={block.url}
          categories={MISTAKE_CATEGORIES}
        />
      ) : open ? (
        <p className="rounded-md border border-warn/40 bg-warn/5 p-3 text-sm">
          Another attempt is running: <Link className="underline" href={`/problems/${open.problemKey}`}>{open.problemKey}</Link>. Finish it first.
        </p>
      ) : (
        <div className="rounded-lg border border-line bg-surface p-5">
          <StartButton problemKey={key} url={block.url} label={state.status === "new" ? "Start first attempt" : "Start re-solve"} />
          <p className="mt-3 text-sm text-ink-3">
            {state.status === "new"
              ? "Limits: Easy 15 / Medium 25 / Hard 40 min, plus a 10-min hint window. Use the framework: clarify → examples → brute force → optimize → code → test → complexity."
              : "Re-solve from a blank file. Easy 10 / Medium 15 / Hard 25 min, no hints. Anything else resets to +1."}
          </p>
        </div>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">Attempt history</h2>
        {history.length === 0 ? (
          <p className="text-sm text-ink-3">No attempts yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs text-ink-3">
                <tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Time</th><th className="px-3 py-2">Result</th><th className="px-3 py-2">Flags</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {history.map((a) => (
                  <tr key={a.id}>
                    <td className="px-3 py-2">{a.endedOn ?? "running"}</td>
                    <td className="px-3 py-2">{a.kind === "first" ? "first" : a.ladderLabel}</td>
                    <td className="px-3 py-2">{fmt(a.timeMs)}</td>
                    <td className="px-3 py-2">
                      {a.outcome === "solved" && <Badge tone="good">{a.kind === "first" ? (a.alone ? "solved alone" : "solved") : "✓ pass"}</Badge>}
                      {a.outcome === "failed" && <Badge tone="bad">✗ fail</Badge>}
                      {a.outcome === "needed-solution" && <Badge tone="warn">needed solution</Badge>}
                      {a.outcome === "abandoned" && <Badge tone="bad">abandoned</Badge>}
                    </td>
                    <td className="px-3 py-2 text-xs text-ink-3">{a.flags.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
