import Link from "next/link";
import { allProblems } from "@/lib/content/courses";
import { problemViews } from "@/lib/server/learn";
import { Badge, DIFF_LABEL, DIFF_TONE } from "@/components/ui";

export const metadata = { title: "Problems" };

export default async function ProblemsPage({ searchParams }: { searchParams: Promise<{ status?: string; pattern?: string }> }) {
  const { status, pattern } = await searchParams;
  const all = [...allProblems().values()];
  const views = await problemViews(all.map((p) => p.block.key));
  const patterns = [...new Set(all.map((p) => p.block.pattern))].sort();
  const rows = all.filter((p) => (!status || views[p.block.key].status === status) && (!pattern || p.block.pattern === pattern));
  const statuses = ["new", "redo", "ladder", "retired", "done"];
  const q = (k: string, v: string | undefined) => {
    const params = new URLSearchParams({ ...(status ? { status } : {}), ...(pattern ? { pattern } : {}) });
    if (v) params.set(k, v);
    else params.delete(k);
    const s = params.toString();
    return s ? `/problems?${s}` : "/problems";
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <h1 className="text-2xl font-semibold">Problems</h1>
      <div className="flex flex-wrap gap-1.5 text-sm">
        <Link href={q("status", undefined)} className={`rounded-md border px-2 py-1 ${!status ? "border-accent text-accent" : "border-line"}`}>all</Link>
        {statuses.map((s) => (
          <Link key={s} href={q("status", s)} className={`rounded-md border px-2 py-1 ${status === s ? "border-accent text-accent" : "border-line"}`}>{s}</Link>
        ))}
        <span className="mx-2 text-line">|</span>
        {patterns.map((p) => (
          <Link key={p} href={q("pattern", pattern === p ? undefined : p)} className={`rounded-md border px-2 py-1 ${pattern === p ? "border-accent text-accent" : "border-line"}`}>{p}</Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs text-ink-3">
            <tr><th className="px-3 py-2">Problem</th><th className="px-3 py-2">Module</th><th className="px-3 py-2">Pattern</th><th className="px-3 py-2">Diff</th><th className="px-3 py-2">Ladder</th><th className="px-3 py-2">Due</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ block, courseId, unitId }) => {
              const v = views[block.key];
              return (
                <tr key={block.key}>
                  <td className="px-3 py-2"><Link href={`/problems/${block.key}`} className="font-medium hover:underline">{block.lc ? `${block.lc}. ` : ""}{block.title}</Link> {block.nc && <Badge tone="accent">NC</Badge>}</td>
                  <td className="px-3 py-2"><Link href={`/c/${courseId}/${unitId}`} className="text-ink-3 hover:underline">{unitId}</Link></td>
                  <td className="px-3 py-2">{block.pattern}</td>
                  <td className="px-3 py-2"><Badge tone={DIFF_TONE[block.difficulty]}>{DIFF_LABEL[block.difficulty]}</Badge></td>
                  <td className="px-3 py-2">{v.openAttemptId ? <Badge tone="accent">running</Badge> : v.label}</td>
                  <td className="px-3 py-2 text-ink-3">{v.due ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-4 text-sm text-ink-3">No problems match.</p>}
      </div>
    </div>
  );
}
