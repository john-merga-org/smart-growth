"use client";

import { useState, useTransition } from "react";
import { Button } from "../ui";
import { saveNote, deleteNote, resolveStruggleNote } from "@/lib/actions/learn";

export function NewNote({ courses }: { courses: { id: string; title: string }[] }) {
  const [body, setBody] = useState("");
  const [course, setCourse] = useState("");
  const [tags, setTags] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2 rounded-lg border border-line bg-surface p-3">
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="New note (Markdown)…" className="min-h-20 w-full rounded-md border border-line bg-bg p-2 text-sm" />
      <div className="flex flex-wrap items-center gap-2">
        <select value={course} onChange={(e) => setCourse(e.target.value)} className="h-9 max-w-full rounded-md border border-line bg-bg px-2 text-sm">
          <option value="">General</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags, comma separated" className="h-9 flex-1 rounded-md border border-line bg-bg px-2 text-sm" />
        <Button size="sm" variant="primary" disabled={!body.trim() || pending} onClick={() => start(async () => {
          await saveNote({ courseId: course || null, body, tags: tags.split(",") });
          setBody("");
          setTags("");
        })}>Add</Button>
      </div>
    </div>
  );
}

export function NoteActions({ id, struggle, resolved }: { id: number; struggle: boolean; resolved: boolean }) {
  const [pending, start] = useTransition();
  return (
    <span className="flex gap-3">
      {struggle && <button disabled={pending} className="hover:underline" onClick={() => start(() => resolveStruggleNote(id, !resolved))}>{resolved ? "Reopen" : "Mark resolved"}</button>}
      <button disabled={pending} className="hover:underline" onClick={() => confirm("Delete note?") && start(() => deleteNote(id))}>Delete</button>
    </span>
  );
}
