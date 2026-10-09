import Link from "next/link";
import { listCourses } from "@/lib/content/courses";
import { courseSummary } from "@/lib/server/learn";
import { Badge, Progress } from "@/components/ui";

export const metadata = { title: "Courses" };

export default async function CoursesPage() {
  const courses = listCourses();
  const summaries = await Promise.all(courses.map((c) => courseSummary(c)));
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Courses</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {courses.map((c, i) => {
          const units = summaries[i].filter((s) => s.unit.kind === "unit");
          const done = units.filter((s) => s.completion?.done).length;
          return (
            <Link key={c.id} href={`/c/${c.id}`} className="space-y-3 rounded-lg border border-line bg-surface p-5 hover:border-accent/50">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{c.title}</h2>
                <Badge>{c.type}</Badge>
              </div>
              {c.summary && <p className="text-sm text-ink-2">{c.summary}</p>}
              <Progress value={units.length ? (done / units.length) * 100 : 0} />
              <p className="text-xs text-ink-3">{done}/{units.length} {c.labels.unit.toLowerCase()}s complete · {c.hoursPerWeek} hrs/week</p>
            </Link>
          );
        })}
      </div>
      {courses.length === 0 && <p className="text-ink-3">No courses in content/ yet.</p>}
    </div>
  );
}
