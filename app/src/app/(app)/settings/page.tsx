import { eq } from "drizzle-orm";
import { getDb, schema, USER } from "@/lib/db";
import { listCourses } from "@/lib/content/courses";
import { getSettings, getTz } from "@/lib/server/session";
import { logout, saveSettings } from "@/lib/actions/settings";
import { Button } from "@/components/ui";

export const metadata = { title: "Settings" };

const field = "h-10 w-full rounded-md border border-line bg-surface px-3";

export default async function SettingsPage() {
  const s = await getSettings();
  const tz = await getTz();
  const db = await getDb();
  const states = await db.select().from(schema.courseState).where(eq(schema.courseState.userId, USER));
  const courses = listCourses();

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <form action={saveSettings} className="space-y-6">
        <fieldset className="space-y-3">
          <legend className="font-semibold">Daily caps</legend>
          <label className="block text-sm">Re-solves per day
            <input name="dailyResolveCap" type="number" min={1} max={20} defaultValue={s.dailyResolveCap} className={field} />
          </label>
          <label className="block text-sm">Cards per day (across all courses)
            <input name="dailyCardCap" type="number" min={1} max={200} defaultValue={s.dailyCardCap} className={field} />
          </label>
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="font-semibold">Course start dates <span className="font-normal text-ink-3">(the timeline counts from here)</span></legend>
          {courses.map((c) => (
            <label key={c.id} className="block text-sm">{c.title}
              <input name={`start:${c.id}`} type="date" defaultValue={states.find((x) => x.courseId === c.id)?.startedOn ?? ""} className={field} />
            </label>
          ))}
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="font-semibold">Other</legend>
          <label className="block text-sm">Timezone (your browser sends {tz} automatically)
            <input name="tz" defaultValue={s.tz} className={field} />
          </label>
          <label className="block text-sm">AI monthly spend cap, USD (AI features arrive in v1.5)
            <input name="aiMonthlyCapUsd" type="number" min={0} step={1} defaultValue={s.aiMonthlyCapUsd} className={field} />
          </label>
        </fieldset>
        <Button variant="primary">Save settings</Button>
      </form>
      <form action={logout}>
        <Button variant="ghost">Sign out</Button>
      </form>
    </div>
  );
}
