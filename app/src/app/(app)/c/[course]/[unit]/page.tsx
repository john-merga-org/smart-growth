import Link from "next/link";
import { notFound } from "next/navigation";
import { courseUnits, findUnit, getCourse, getUnitIndex, OVERVIEW_ID } from "@/lib/content/courses";
import { Mdx } from "@/lib/content/render";
import { mdxComponents } from "@/components/blocks";
import { UnitProvider } from "@/components/unit/context";
import { HighlightLayer } from "@/components/unit/highlights";
import { Toc } from "@/components/unit/toc";
import { UnitNotes } from "@/components/unit/unit-notes";
import { completion, courseSummary, getUnitState } from "@/lib/server/learn";
import { unitNotes } from "@/lib/actions/learn";
import { Badge, Progress } from "@/components/ui";

type Params = { params: Promise<{ course: string; unit: string }> };

export async function generateMetadata({ params }: Params) {
  const { course: cid, unit: uid } = await params;
  const course = getCourse(cid);
  const unit = course && findUnit(course, uid);
  return { title: unit ? unit.title : "Not found" };
}

export default async function UnitPage({ params }: Params) {
  const { course: cid, unit: uid } = await params;
  const course = getCourse(cid);
  const unit = course && findUnit(course, uid);
  if (!course || !unit) notFound();

  const units = courseUnits(course);
  const pos = units.findIndex((u) => u.id === unit.id);
  const prev = pos > 0 ? units[pos - 1] : null;
  const next = pos >= 0 && pos < units.length - 1 ? units[pos + 1] : null;
  const entry = getUnitIndex(course, unit);

  if (!entry) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-10">
        <Link href={`/c/${course.id}`} className="text-sm text-ink-3 hover:underline">← {course.title}</Link>
        <h1 className="text-2xl font-semibold">{unit.title}</h1>
        {unit.outcome && <p className="text-ink-2">{unit.outcome}</p>}
        <p className="rounded-md border border-line bg-surface p-4 text-sm text-ink-3">
          {unit.kind === "milestone" ? "Milestone exam mode arrives in v2. Track it on the Progress page for now." : "This module hasn't been written yet. Ask Claude to write it (see CLAUDE.md for the format)."}
        </p>
      </div>
    );
  }

  const [state, notes, summary] = await Promise.all([
    getUnitState(course, unit, entry.index),
    unitNotes(course.id, unit.id),
    unit.id === OVERVIEW_ID ? Promise.resolve([]) : courseSummary(course),
  ]);
  const c = completion(entry.index, state);
  const gate = summary.find((s) => s.unit.id === unit.id);
  const blocker = gate && !gate.unlocked ? summary.slice(0, summary.indexOf(gate)).reverse().find((s) => s.completion?.checkpoint === false) : null;

  return (
    <UnitProvider state={state}>
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-3">
          <Link href={`/c/${course.id}`} className="hover:underline">{course.title}</Link>
          <span>/</span>
          <span>{unit.id === OVERVIEW_ID ? "Overview" : `${course.labels.unit} ${unit.id}`}</span>
          {unit.weeks && <Badge>{unit.weeks} wk</Badge>}
          {c.done && <Badge tone="good">complete</Badge>}
        </div>
        {unit.id !== OVERVIEW_ID && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink-3">
            <Progress value={c.percent} className="max-w-48" />
            <span>Read {c.sections[0]}/{c.sections[1]}</span>
            {c.drills[1] > 0 && <span>Drills {c.drills[0]}/{c.drills[1]}</span>}
            {c.problems[1] > 0 && <span>Problems {c.problems[0]}/{c.problems[1]}</span>}
            {c.build !== null && <span>Build {c.build ? "✓" : "○"}</span>}
            {c.checkpoint !== null && <span>Checkpoint {c.checkpoint ? "✓" : "○"}</span>}
          </div>
        )}
        {blocker && (
          <div className="rounded-md border border-warn/40 bg-warn/5 px-3 py-2 text-sm">
            🔒 <b>Checkpoint not passed</b> for{" "}
            <Link className="underline" href={`/c/${course.id}/${blocker.unit.id}`}>{course.labels.unit} {blocker.unit.id}</Link>. You can read ahead, but this module's problems won&apos;t enter your queue until then.
          </div>
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)_250px]">
        <Toc sections={entry.index.sections} />
        <HighlightLayer>
          <article className="prose max-w-[72ch] dark:prose-invert">
            <Mdx source={entry.source} components={mdxComponents} />
          </article>
          <div className="mt-12 max-w-[72ch] space-y-8">
            <UnitNotes courseId={course.id} unitId={unit.id} notes={notes.map((n) => ({ id: n.id, body: n.body, struggle: n.struggle, updatedAt: n.updatedAt.toISOString() }))} />
            <div className="flex justify-between gap-4 border-t border-line pt-4 text-sm">
              {prev ? <Link href={`/c/${course.id}/${prev.id}`} className="text-accent hover:underline">← {prev.title}</Link> : <span />}
              {next ? <Link href={`/c/${course.id}/${next.id}`} className="text-right text-accent hover:underline">{next.title} →</Link> : <span />}
            </div>
          </div>
        </HighlightLayer>
      </div>
    </UnitProvider>
  );
}
