import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourse } from "@/lib/content/courses";
import { courseSummary } from "@/lib/server/learn";
import { Badge, Progress, cx } from "@/components/ui";

type Params = { params: Promise<{ course: string }> };

export async function generateMetadata({ params }: Params) {
  const course = getCourse((await params).course);
  return { title: course?.title ?? "Not found" };
}

export default async function CoursePage({ params }: Params) {
  const course = getCourse((await params).course);
  if (!course) notFound();
  const summary = await courseSummary(course);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{course.title}</h1>
        {course.summary && <p className="text-ink-2">{course.summary}</p>}
        <div className="flex flex-wrap gap-3 text-sm">
          {course.overview && <Link href={`/c/${course.id}/overview`} className="text-accent hover:underline">Read the course overview →</Link>}
          <span className="text-ink-3">{course.hoursPerWeek} hrs/week</span>
        </div>
      </div>

      {course.parts.map((part) => (
        <section key={part.id} className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">{course.labels.part}: {part.title}</h2>
            {part.goal && <p className="text-sm text-ink-3">{part.goal}</p>}
          </div>
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {part.units.map((u) => {
              const s = summary.find((x) => x.unit.id === u.id)!;
              const c = s.completion;
              return (
                <li key={u.id}>
                  <Link href={`/c/${course.id}/${u.id}`} className={cx("flex items-center gap-4 px-4 py-3 hover:bg-muted", !s.written && "opacity-60")}>
                    <span className="w-8 shrink-0 text-sm text-ink-3">{u.kind === "milestone" ? "🏁" : u.id}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{u.title}</span>
                      {u.outcome && <span className="line-clamp-1 block text-xs text-ink-3">{u.outcome}</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {!s.written && u.kind === "unit" && <Badge>not written</Badge>}
                      {s.written && !s.unlocked && <Badge tone="warn">🔒 gate</Badge>}
                      {c?.done && <Badge tone="good">done</Badge>}
                      {c && !c.done && <span className="w-20"><Progress value={c.percent} /></span>}
                      {u.weeks && <span className="w-10 text-right text-xs text-ink-3">{u.weeks}w</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
