import Link from "next/link";
import { listCourses } from "@/lib/content/courses";
import { courseSummary } from "@/lib/server/learn";
import { counters, courseTimeline, logs } from "@/lib/server/progress";
import { getToday } from "@/lib/server/session";
import { openStruggles } from "@/lib/actions/learn";
import { addDays } from "@/lib/dates";
import { MISTAKE_CATEGORIES } from "@/lib/constants";
import { MistakeForm, MockForm, ResolveButton } from "@/components/progress/forms";
import { Badge, InlineMd, Progress, cx } from "@/components/ui";

export const metadata = { title: "Progress" };

const fmtMin = (ms: number | null) => (ms === null ? "—" : `${Math.round(ms / 60_000)}m`);

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <div className="text-xs text-ink-3">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-ink-3">{sub}</div>}
    </div>
  );
}

export default async function ProgressPage() {
  const { today } = await getToday();
  const courses = listCourses();
  const [c, l, struggles, perCourse] = await Promise.all([
    counters(today),
    logs(),
    openStruggles(),
    Promise.all(courses.map(async (course) => ({ course, summary: await courseSummary(course), timeline: await courseTimeline(course, today) }))),
  ]);
  const weekAgo = addDays(today, -6);
  const minutesByCourse = (id: string) => Math.round(l.minutes.filter((m) => m.courseId === id && m.day >= weekAgo).reduce((s, m) => s + m.minutes, 0));

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <h1 className="text-2xl font-semibold">Progress</h1>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="NeetCode 150 solved" value={`${c.ncSolved} / 150`} />
        <Stat label="NeetCode 150 retired" value={`${c.ncRetired} / 150`} sub="passed +30" />
        <Stat label="Total problems solved" value={String(c.totalSolved)} sub={`${c.retired} retired`} />
        <Stat label="Mocks done / passed" value={`${c.mocksDone} / ${c.mocksPassed}`} />
        <Stat label="Re-solve retention" value={c.resolveRetention === null ? "—" : `${c.resolveRetention}%`} sub={`${c.resolveCount} re-solves`} />
        <Stat label="Card recall (90 days)" value={c.cardRetention === null ? "—" : `${c.cardRetention}%`} sub={`${c.reviewCount} reviews`} />
      </section>

      {perCourse.map(({ course, summary, timeline }) => {
        const units = summary.filter((s) => s.unit.kind === "unit");
        const done = units.filter((s) => s.completion?.done).length;
        return (
          <section key={course.id} className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">{course.title}</h2>
              <span className="text-sm text-ink-3">{minutesByCourse(course.id)} min logged in the last 7 days</span>
            </div>
            <div className="rounded-lg border border-line bg-surface p-4 text-sm">
              {timeline.startedOn ? (
                <div className="space-y-1">
                  <p>
                    Started <b>{timeline.startedOn}</b> · week {Math.floor(timeline.weeksElapsed) + 1} · month {timeline.monthNow}.{" "}
                    {timeline.deltaWeeks !== null && (
                      <span className={cx("font-medium", timeline.deltaWeeks >= 0 ? "text-good" : "text-warn")}>
                        {timeline.deltaWeeks >= 0 ? `${timeline.deltaWeeks} wk ahead of plan` : `${-timeline.deltaWeeks} wk behind plan`}
                      </span>
                    )}
                  </p>
                  <p className="text-ink-3">Plan says you&apos;d be on {course.labels.unit} {timeline.expectedUnitId ?? "—"}; you&apos;re on {timeline.currentUnitId ?? "—"}.</p>
                </div>
              ) : (
                <p className="text-ink-3">Not started. The clock starts with your first activity (or set a date in Settings).</p>
              )}
              {course.timeline.length > 0 && (
                <ol className="mt-3 space-y-1">
                  {course.timeline.map((t) => (
                    <li key={t.month} className={cx("flex gap-3", timeline.startedOn && timeline.monthNow <= t.month && course.timeline.find((x) => x.month >= timeline.monthNow) === t ? "font-medium text-ink" : "text-ink-3")}>
                      <span className="w-16 shrink-0">Month {t.month}</span>
                      <span>{t.expect}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Progress value={units.length ? (done / units.length) * 100 : 0} className="max-w-xs" />
              <span className="text-ink-3">{done}/{units.length} complete</span>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-1 sm:grid-cols-2">
              {summary.map((s) => (
                <Link key={s.unit.id} href={`/c/${course.id}/${s.unit.id}`} className={cx("flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted", !s.written && "text-ink-3")}>
                  <span className="w-4">{s.completion?.done ? "☑" : s.unit.kind === "milestone" ? "🏁" : "☐"}</span>
                  <span className="flex-1 truncate">{s.unit.kind === "unit" && `${s.unit.id} `}{s.unit.title}</span>
                  {s.completion && !s.completion.done && s.completion.percent > 0 && <span className="text-xs text-ink-3">{s.completion.percent}%</span>}
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Struggles log</h2>
        {struggles.highlights.length + struggles.notes.length === 0 ? (
          <p className="text-sm text-ink-3">Nothing unresolved. 🟥 highlights and notes marked “confused me” show up here.</p>
        ) : (
          <ul className="space-y-2">
            {struggles.highlights.map((h) => (
              <li key={`h${h.id}`} className="flex flex-wrap items-start gap-3 rounded-lg border border-line bg-surface p-3 text-sm">
                <span className="flex-1">🟥 {h.exact}{h.note && <span className="block text-ink-3">✎ {h.note}</span>}</span>
                <Link href={`/c/${h.courseId}/${h.unitId}${h.sectionId ? `#${h.sectionId}` : ""}`} className="text-xs text-ink-3 hover:underline">{h.unitId} ↗</Link>
                <ResolveButton kind="highlight" id={h.id} />
              </li>
            ))}
            {struggles.notes.map((n) => (
              <li key={`n${n.id}`} className="flex flex-wrap items-start gap-3 rounded-lg border border-line bg-surface p-3 text-sm">
                <span className="flex-1 whitespace-pre-wrap">{n.body}</span>
                {n.unitId && <Link href={`/c/${n.courseId}/${n.unitId}`} className="text-xs text-ink-3 hover:underline">{n.unitId} ↗</Link>}
                <ResolveButton kind="note" id={n.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Mistakes log</h2>
        <p className="text-sm text-ink-3">Re-read this before every timed set and mock interview.</p>
        <MistakeForm categories={MISTAKE_CATEGORIES} />
        <Table head={["Date", "Problem", "Category", "What went wrong", "Rule"]} rows={l.mistakes.map((m) => [m.day, m.problemTitle ?? "", <Badge key="c">{m.category}</Badge>, <InlineMd key="w" text={m.what} />, <b key="r"><InlineMd text={m.rule} /></b>])} empty="No mistakes logged yet." />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Problems log</h2>
        <Table
          head={["Date", "Problem", "Pattern", "Type", "Time", "Alone?", "Result", "Flags"]}
          rows={l.attempts.map(({ a, p }) => [
            a.endedOn ?? "",
            <Link key="p" href={`/problems/${a.problemKey}`} className="hover:underline">{p?.title ?? a.problemKey}</Link>,
            p?.pattern ?? "",
            a.kind === "first" ? "first" : a.ladderLabel ?? "",
            fmtMin(a.timeMs),
            a.alone ? "y" : "n",
            a.outcome === "solved" ? (a.kind === "first" ? "solved" : "✓") : a.outcome === "failed" ? "✗" : a.outcome ?? "",
            a.flags.join(", "),
          ])}
          empty="No attempts yet."
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Mock interview log</h2>
        <MockForm today={today} />
        <Table head={["Date", "Platform", "Problems", "Result", "What broke down", "Fix"]} rows={l.mocks.map((m) => [m.day, m.platform, m.problems, m.result, m.brokeDown ?? "", m.fix ?? ""])} empty="No mocks yet." />
      </section>
    </div>
  );
}

function Table({ head, rows, empty }: { head: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-ink-3">{empty}</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs text-ink-3"><tr>{head.map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{rows.map((r, i) => <tr key={i}>{r.map((cell, j) => <td key={j} className="px-3 py-2 align-top">{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
