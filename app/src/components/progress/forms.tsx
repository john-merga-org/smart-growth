"use client";

import { useState, useTransition } from "react";
import { Button } from "../ui";
import { addMistake, addMock } from "@/lib/actions/problems";
import { resolveStruggleNote, updateHighlight } from "@/lib/actions/learn";

const input = "h-9 rounded-md border border-line bg-bg px-2 text-sm";

export function MistakeForm({ categories }: { categories: string[] }) {
  const [m, setM] = useState({ category: categories[0], what: "", rule: "", problemTitle: "" });
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      <input className={input} placeholder="Problem" value={m.problemTitle} onChange={(e) => setM({ ...m, problemTitle: e.target.value })} />
      <select className={input} value={m.category} onChange={(e) => setM({ ...m, category: e.target.value })}>{categories.map((c) => <option key={c}>{c}</option>)}</select>
      <input className={`${input} flex-1`} placeholder="What went wrong" value={m.what} onChange={(e) => setM({ ...m, what: e.target.value })} />
      <input className={`${input} flex-1`} placeholder="Rule" value={m.rule} onChange={(e) => setM({ ...m, rule: e.target.value })} />
      <Button size="sm" disabled={!m.what.trim() || !m.rule.trim() || pending} onClick={() => start(async () => { await addMistake(m); setM({ ...m, what: "", rule: "", problemTitle: "" }); })}>Add</Button>
    </div>
  );
}

export function MockForm({ today }: { today: string }) {
  const [m, setM] = useState({ day: today, platform: "", problems: "", result: "pass", brokeDown: "", fix: "" });
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      <input className={input} type="date" value={m.day} onChange={(e) => setM({ ...m, day: e.target.value })} />
      <input className={input} placeholder="Platform / partner" value={m.platform} onChange={(e) => setM({ ...m, platform: e.target.value })} />
      <input className={input} placeholder="Problems" value={m.problems} onChange={(e) => setM({ ...m, problems: e.target.value })} />
      <select className={input} value={m.result} onChange={(e) => setM({ ...m, result: e.target.value })}>
        {["strong hire", "hire", "lean hire", "lean no hire", "no hire", "pass", "fail"].map((r) => <option key={r}>{r}</option>)}
      </select>
      <input className={`${input} flex-1`} placeholder="What broke down" value={m.brokeDown} onChange={(e) => setM({ ...m, brokeDown: e.target.value })} />
      <input className={`${input} flex-1`} placeholder="Fix for next time" value={m.fix} onChange={(e) => setM({ ...m, fix: e.target.value })} />
      <Button size="sm" disabled={!m.platform.trim() || pending} onClick={() => start(async () => { await addMock(m); setM({ ...m, platform: "", problems: "", brokeDown: "", fix: "" }); })}>Add</Button>
    </div>
  );
}

export function ResolveButton({ kind, id }: { kind: "highlight" | "note"; id: number }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} className="text-xs text-accent hover:underline" onClick={() => start(() => (kind === "highlight" ? updateHighlight(id, { resolved: true }) : resolveStruggleNote(id, true)))}>
      Mark resolved
    </button>
  );
}
