"use client";

import { useState, useTransition } from "react";
import { Badge, Button } from "../ui";
import { deleteNote, saveNote } from "@/lib/actions/learn";

interface NoteView {
  id: number;
  body: string;
  struggle: boolean;
  updatedAt: string;
}

/** The module notebook: free notes for this unit (highlights live in the margin). */
export function UnitNotes({ courseId, unitId, notes }: { courseId: string; unitId: string; notes: NoteView[] }) {
  const [body, setBody] = useState("");
  const [struggle, setStruggle] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [editBody, setEditBody] = useState("");
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<unknown>) => start(async () => {
    try {
      await fn();
    } catch (e) {
      alert((e as Error).message);
    }
  });

  return (
    <section data-block="notes" className="not-prose space-y-3">
      <h2 className="text-lg font-semibold">Module notebook</h2>
      <div className="space-y-2 rounded-lg border border-line bg-surface p-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="A note for this module (Markdown works)…"
          className="min-h-20 w-full rounded-md border border-line bg-bg p-2 text-sm"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" variant="primary" disabled={!body.trim() || pending} onClick={() => run(async () => {
            await saveNote({ courseId, unitId, body, struggle });
            setBody("");
            setStruggle(false);
          })}>
            Add note
          </Button>
          <label className="flex items-center gap-1.5 text-sm text-ink-2">
            <input type="checkbox" checked={struggle} onChange={(e) => setStruggle(e.target.checked)} />
            This confused me (add to Struggles log)
          </label>
        </div>
      </div>
      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="rounded-lg border border-line bg-surface p-3 text-sm">
            {editing === n.id ? (
              <div className="space-y-2">
                <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} className="min-h-20 w-full rounded-md border border-line bg-bg p-2" />
                <div className="flex gap-2">
                  <Button size="sm" variant="primary" onClick={() => run(async () => {
                    await saveNote({ id: n.id, courseId, unitId, body: editBody, struggle: n.struggle });
                    setEditing(null);
                  })}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <p className="whitespace-pre-wrap">{n.body}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-ink-3">
                  {n.struggle && <Badge tone="bad">struggle</Badge>}
                  <span>{new Date(n.updatedAt).toLocaleDateString()}</span>
                  <button className="hover:underline" onClick={() => { setEditing(n.id); setEditBody(n.body); }}>Edit</button>
                  <button className="hover:underline" onClick={() => confirm("Delete note?") && run(() => deleteNote(n.id))}>Delete</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
