import Link from "next/link";
import { todayData } from "@/lib/server/today";
import { StartButton } from "@/components/problems/start-button";
import { Badge, DIFF_LABEL, DIFF_TONE, Progress, cx } from "@/components/ui";
import { ladderLabel } from "@/lib/srs/ladder";
import { allProblems } from "@/lib/content/courses";

export const metadata = { title: "Today" };

const BOXES = [15, 30, 60];

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ min?: string }> }) {
  const { min } = await searchParams;
  const minutes = min && BOXES.includes(Number(min)) ? Number(min) : undefined;
  const { today, plan, courses, session, open, settings, cardsReviewedToday, resolvesDoneToday } = await todayData(minutes);
  const problems = allProblems();
  const nothing = !open && plan.resolves.length === 0 && plan.cards.length === 0 && plan.newProblems.length === 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-ink-3">{new Date(today + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="text-2xl font-semibold">Today</h1>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <span className="mr-1 text-ink-3">I have</span>
          {BOXES.map((b) => (
            <Link key={b} href={`/?min=${b}`} className={cx("rounded-md border px-2.5 py-1", minutes === b ? "border-accent bg-accent/10 text-accent" : "border-line hover:bg-muted")}>{b}m</Link>
          ))}
          <Link href="/" className={cx("rounded-md border px-2.5 py-1", !minutes ? "border-accent bg-accent/10 text-accent" : "border-line hover:bg-muted")}>all</Link>
        </div>
      </div>

      {plan.backlog && (
        <div className="rounded-lg border border-warn/50 bg-warn/5 p-4 text-sm">
          <b>Catch-up mode.</b> More than two days of reviews are overdue, so new lessons and new problems are hidden until the queue is back under your daily caps. Overdue cards are spread over the next few days, and re-solves keep their ladder position.
        </div>
      )}

      <div className="rounded-lg border border-line bg-surface p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-ink-3">Suggested session</div>
        <div className="mt-1 text-lg font-semibold">{session.type}</div>
        <p className="text-sm text-ink-2">{session.why}</p>
        {plan.estimateMin > 0 && <p className="mt-1 text-xs text-ink-3">Queue below: ~{plan.estimateMin} min</p>}
      </div>

      {open && (
        <Link href={`/problems/${open.problemKey}`} className="block rounded-lg border-2 border-accent bg-accent/5 p-4">
          <div className="text-sm font-semibold text-accent">⏱ Timer running</div>
          <div>{problems.get(open.problemKey)?.block.title ?? open.problemKey}: resume →</div>
        </Link>
      )}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Re-solves</h2>
          <span className="text-xs text-ink-3">{resolvesDoneToday}/{settings.dailyResolveCap} done today{plan.resolvesLeftAfterCap ? ` · ${plan.resolvesLeftAfterCap} more due (held by the cap)` : ""}</span>
        </div>
        {plan.resolves.length === 0 ? (
          <p className="text-sm text-ink-3">Nothing due. 🎯</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {plan.resolves.map((p) => {
              const late = p.due && p.due < today;
              return (
                <li key={p.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <Link href={`/problems/${p.key}`} className="min-w-0 flex-1 font-medium hover:underline">{p.title}</Link>
                  <Badge tone={DIFF_TONE[p.difficulty]}>{DIFF_LABEL[p.difficulty]}</Badge>
                  <Badge>{ladderLabel(p)}</Badge>
                  {late && <Badge tone="bad">due {p.due}</Badge>}
                  {!open && <StartButton size="sm" problemKey={p.key} url={problems.get(p.key)?.block.url ?? "#"} label="Re-solve" />}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Cards</h2>
          <span className="text-xs text-ink-3">{cardsReviewedToday}/{settings.dailyCardCap} today{plan.cardsLeftAfterCap ? ` · ${plan.cardsLeftAfterCap} more due later` : ""}</span>
        </div>
        {plan.cards.length === 0 ? (
          <p className="text-sm text-ink-3">No cards due. Cards enter the queue when you mark a section read or miss a quiz.</p>
        ) : (
          <Link href={minutes ? `/review?min=${minutes}` : "/review"} className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 hover:border-accent/50">
            <span><b>{plan.cards.length}</b> card{plan.cards.length === 1 ? "" : "s"} to review</span>
            <span className="text-accent">Start review →</span>
          </Link>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">New problems</h2>
        {plan.newBlockedBy === "reviews-first" && <p className="text-sm text-ink-3">Finish today&apos;s re-solves first. Review before new.</p>}
        {plan.newBlockedBy === "backlog" && <p className="text-sm text-ink-3">Hidden in catch-up mode.</p>}
        {!plan.newBlockedBy && plan.newProblems.length === 0 && <p className="text-sm text-ink-3">No unlocked problems waiting.</p>}
        {plan.newProblems.length > 0 && (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {plan.newProblems.map((p) => (
              <li key={p.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Link href={`/problems/${p.key}`} className="min-w-0 flex-1 font-medium hover:underline">{p.title}</Link>
                <Badge tone={DIFF_TONE[p.difficulty]}>{DIFF_LABEL[p.difficulty]}</Badge>
                <span className="text-xs text-ink-3">Module {p.unitId}</span>
                {!open && <StartButton size="sm" problemKey={p.key} url={problems.get(p.key)?.block.url ?? "#"} label="Start" />}
              </li>
            ))}
          </ul>
        )}
      </section>

      {!plan.backlog && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Continue learning</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {courses.map(({ course, current, nextSection, sessionHint, done, total }) => (
              <Link
                key={course.id}
                href={current ? `/c/${course.id}/${current.unit.id}${nextSection ? `#${nextSection.id}` : ""}` : `/c/${course.id}`}
                className="space-y-2 rounded-lg border border-line bg-surface p-4 hover:border-accent/50"
              >
                <div className="text-xs text-ink-3">{course.title}</div>
                {current ? (
                  <>
                    <div className="font-medium">{course.labels.unit} {current.unit.id}: {current.unit.title}</div>
                    {nextSection && <div className="text-sm text-ink-2">Next: {nextSection.title}</div>}
                    {sessionHint && <Progress value={sessionHint.c.percent} />}
                  </>
                ) : (
                  <div className="font-medium">{done === total ? "All written modules complete" : "Next module not written yet"}</div>
                )}
                <div className="text-xs text-ink-3">{done}/{total} {course.labels.unit.toLowerCase()}s complete</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {nothing && !plan.backlog && <p className="text-center text-sm text-ink-3">Queue clear. Go read something new.</p>}
    </div>
  );
}
