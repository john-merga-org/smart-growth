import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { getDb, schema, USER } from "@/lib/db";
import { findUnit, getCourse, listCourses } from "@/lib/content/courses";
import { renderMarkdown } from "@/lib/server/markdown";
import { HIGHLIGHT_COLORS } from "@/lib/constants";
import { NewNote, NoteActions } from "@/components/notebook/new-note";
import { Badge, cx } from "@/components/ui";

export const metadata = { title: "Notebook" };

type SP = { course?: string; color?: string; q?: string; tab?: string };

export default async function NotebookPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const tab = sp.tab ?? "highlights";
  const db = await getDb();
  const courses = listCourses();
  const [hls, notes, reading] = await Promise.all([
    db.select().from(schema.highlights).where(eq(schema.highlights.userId, USER)).orderBy(desc(schema.highlights.createdAt)),
    db.select().from(schema.notes).where(eq(schema.notes.userId, USER)).orderBy(desc(schema.notes.updatedAt)),
    db.select().from(schema.resources).where(and(eq(schema.resources.userId, USER), eq(schema.resources.status, "saved"))).orderBy(desc(schema.resources.updatedAt)),
  ]);
  const q = sp.q?.toLowerCase().trim();
  const match = (s: string | null | undefined) => !q || (s ?? "").toLowerCase().includes(q);
  const fh = hls.filter((h) => (!sp.course || h.courseId === sp.course) && (!sp.color || h.color === sp.color) && (match(h.exact) || match(h.note)));
  const fn = notes.filter((n) => (!sp.course || n.courseId === sp.course) && (match(n.body) || n.tags.some((t) => match(t))));
  const rendered = await Promise.all(fn.map((n) => renderMarkdown(n.body)));
  const unitTitle = (c: string | null, u: string | null) => {
    const course = c ? getCourse(c) : null;
    const unit = course && u ? findUnit(course, u) : null;
    return unit ? `${course!.labels.unit} ${unit.id}` : course?.title ?? "General";
  };
  const link = (patch: Partial<SP>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/notebook?${p}`;
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <h1 className="text-2xl font-semibold">Notebook</h1>
      <div className="flex gap-1 border-b border-line">
        {[["highlights", `Highlights (${hls.length})`], ["notes", `Notes (${notes.length})`], ["reading", `Reading list (${reading.length})`]].map(([id, label]) => (
          <Link key={id} href={link({ tab: id })} className={cx("-mb-px border-b-2 px-3 py-2 text-sm", tab === id ? "border-accent text-ink" : "border-transparent text-ink-3")}>{label}</Link>
        ))}
      </div>

      {tab !== "reading" && (
        <form className="flex flex-wrap gap-2" action="/notebook">
          <input type="hidden" name="tab" value={tab} />
          <input name="q" defaultValue={sp.q} placeholder="Search…" className="h-9 flex-1 rounded-md border border-line bg-surface px-2 text-sm" />
          <select name="course" defaultValue={sp.course ?? ""} className="h-9 max-w-full rounded-md border border-line bg-surface px-2 text-sm">
            <option value="">All courses</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          {tab === "highlights" && (
            <select name="color" defaultValue={sp.color ?? ""} className="h-9 rounded-md border border-line bg-surface px-2 text-sm">
              <option value="">All colors</option>
              {HIGHLIGHT_COLORS.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
            </select>
          )}
          <button className="h-9 rounded-md border border-line px-3 text-sm">Filter</button>
        </form>
      )}

      {tab === "highlights" && (
        <ul className="space-y-2">
          {fh.map((h) => {
            const color = HIGHLIGHT_COLORS.find((c) => c.id === h.color);
            return (
              <li key={h.id} className="rounded-lg border border-line bg-surface p-3 text-sm">
                <p>{color?.emoji} <span className="text-ink">{h.exact}</span></p>
                {h.note && <p className="mt-1 whitespace-pre-wrap text-ink-2">✎ {h.note}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-3">
                  <Link href={`/c/${h.courseId}/${h.unitId}${h.sectionId ? `#${h.sectionId}` : ""}`} className="hover:underline">{unitTitle(h.courseId, h.unitId)} ↗</Link>
                  {h.orphan && <Badge tone="warn">section changed</Badge>}
                  {h.color === "confused" && (h.resolvedAt ? <Badge tone="good">resolved</Badge> : <Badge tone="bad">unresolved</Badge>)}
                  <span>{h.createdAt.toLocaleDateString()}</span>
                </div>
              </li>
            );
          })}
          {fh.length === 0 && <p className="text-sm text-ink-3">No highlights yet. Select text in any lesson.</p>}
        </ul>
      )}

      {tab === "notes" && (
        <div className="space-y-3">
          <NewNote courses={courses.map((c) => ({ id: c.id, title: c.title }))} />
          <ul className="space-y-2">
            {fn.map((n, i) => (
              <li key={n.id} className="rounded-lg border border-line bg-surface p-3">
                <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: rendered[i] }} />
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-3">
                  {n.unitId ? <Link href={`/c/${n.courseId}/${n.unitId}`} className="hover:underline">{unitTitle(n.courseId, n.unitId)} ↗</Link> : <span>{unitTitle(n.courseId, null)}</span>}
                  {n.tags.map((t) => <Badge key={t}>#{t}</Badge>)}
                  {n.struggle && (n.resolvedAt ? <Badge tone="good">resolved</Badge> : <Badge tone="bad">struggle</Badge>)}
                  <span>{n.updatedAt.toLocaleDateString()}</span>
                  <NoteActions id={n.id} struggle={n.struggle} resolved={!!n.resolvedAt} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "reading" && (
        <ul className="space-y-2">
          {reading.map((r) => (
            <li key={r.href} className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm">
              <a href={r.href} target="_blank" rel="noreferrer" className="flex-1 font-medium text-accent hover:underline">{r.title}</a>
              <Badge>{r.type}</Badge>
              {r.unitId && <Link href={`/c/${r.courseId}/${r.unitId}`} className="text-xs text-ink-3 hover:underline">{unitTitle(r.courseId, r.unitId)}</Link>}
            </li>
          ))}
          {reading.length === 0 && <p className="text-sm text-ink-3">Use “Save for later” on any resource link.</p>}
        </ul>
      )}
    </div>
  );
}
