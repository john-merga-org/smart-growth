"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useUnit } from "../unit/context";
import { useReview } from "../unit/review-context";
import { Badge, Button, DIFF_LABEL, DIFF_TONE, InlineMd, cx } from "../ui";
import { startAttempt } from "@/lib/actions/problems";
import { gradeAsk, resetCheckpoint } from "@/lib/actions/learn";

/* ── Problems ─────────────────────────────────────────────────────── */

export function Problems({ children }: { children?: ReactNode }) {
  return <div className="not-prose my-6 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">{children}</div>;
}

export function Problem(props: { lc?: number; id?: string; slug?: string; url?: string; title: string; pattern: string; difficulty: "E" | "M" | "H"; nc?: boolean }) {
  const { state } = useUnit();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const key = props.lc ? `lc-${props.lc}` : props.id!;
  const url = props.url ?? `https://leetcode.com/problems/${props.slug}/`;
  const view = state.problems[key];
  const today = new Date().toLocaleDateString("en-CA");
  const due = view?.due && view.due <= today;

  const start = async () => {
    if (view?.openAttemptId) return router.push(`/problems/${key}`);
    setBusy(true);
    try {
      await startAttempt(key);
      window.open(url, "_blank", "noopener");
      router.push(`/problems/${key}`);
    } catch (e) {
      alert((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
      <a href={url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 font-medium hover:underline">
        {props.lc && <span className="mr-1 text-ink-3">{props.lc}.</span>}
        {props.title}
      </a>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={DIFF_TONE[props.difficulty]}>{DIFF_LABEL[props.difficulty]}</Badge>
        <Badge>{props.pattern}</Badge>
        {props.nc && <Badge tone="accent">NC150</Badge>}
        {view && view.status !== "new" && <Badge tone={view.status === "done" || view.status === "retired" ? "good" : "neutral"}>{view.label}{view.due && !due ? ` · ${view.due}` : ""}</Badge>}
      </div>
      {state.courseId && (
        <Button size="sm" variant={view?.openAttemptId || due || !view || view.status === "new" ? "primary" : "secondary"} disabled={busy} onClick={start}>
          {view?.openAttemptId ? "Resume timer" : !view || view.status === "new" ? "Start ▶" : due ? "Re-solve now" : "Practice"}
        </Button>
      )}
    </div>
  );
}

/* ── Checkpoint ───────────────────────────────────────────────────── */

export function Checkpoint({ children }: { children?: ReactNode }) {
  const { state, act } = useUnit();
  const review = useReview();
  if (review) return <>{children}</>;
  const passed = state.checkpointPassedAt;
  return (
    <div className="not-prose my-6 rounded-lg border-2 border-accent/40 bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <div className="font-semibold">Checkpoint: answer out loud, without notes</div>
          <div className="text-sm text-ink-3">Say your answer, then reveal the model answer and grade yourself honestly. Every question needs a ✓.</div>
        </div>
        {passed ? (
          <div className="flex items-center gap-2">
            <Badge tone="good">passed {new Date(passed).toLocaleDateString()}</Badge>
            <Button size="sm" variant="ghost" onClick={() => act((s) => ({ ...s, checkpointPassedAt: null }), () => resetCheckpoint(state.courseId, state.unitId))}>Retake</Button>
          </div>
        ) : (
          <Badge tone="warn">not passed</Badge>
        )}
      </div>
      <div className="divide-y divide-line">{children}</div>
    </div>
  );
}

export function Ask({ id, q, section, children }: { id: string; q: string; section?: string; children?: ReactNode }) {
  const { state, blockKey, act } = useUnit();
  const review = useReview();
  const latest = review ? undefined : state.responses[id];
  const grade = latest?.correct ?? null;
  const [stage, setStage] = useState<"ask" | "revealed">("ask");
  const [rec, setRec] = useState<"idle" | "recording" | "done">("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);

  const record = async () => {
    if (rec === "recording") return recorder.current?.stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setAudioUrl(URL.createObjectURL(new Blob(chunks, { type: r.mimeType })));
        setRec("done");
      };
      recorder.current = r;
      r.start();
      setRec("recording");
    } catch {
      alert("Microphone not available. Just answer out loud.");
    }
  };

  const reveal = () => {
    setStage("revealed");
    review?.reveal();
  };
  const doGrade = (ok: boolean) => {
    setStage("ask");
    if (review) return review.reveal(ok ? 3 : 1);
    act((s) => ({ ...s, responses: { ...s.responses, [id]: { response: null, correct: ok, at: new Date().toISOString() } } }), () => gradeAsk(blockKey(id), ok));
  };

  return (
    <div className="px-4 py-3" data-block={id}>
      <div className="flex items-start gap-3">
        <span className={cx("mt-0.5 text-lg", grade === true ? "text-good" : grade === false ? "text-bad" : "text-ink-3")}>{grade === true ? "✓" : grade === false ? "✗" : "○"}</span>
        <div className="flex-1">
          <p className="font-medium"><InlineMd text={q} /></p>
          {stage === "ask" ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={record}>{rec === "recording" ? "■ Stop recording" : "🎙 Record (optional)"}</Button>
              <Button size="sm" onClick={reveal}>{grade === null ? "I've answered: show the model answer" : "Answer again"}</Button>
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              {audioUrl && <audio controls src={audioUrl} className="h-8 w-full max-w-sm" />}
              <div className="prose prose-sm max-w-none rounded-md border-l-4 border-good bg-good/5 px-3 py-2 dark:prose-invert">{children}</div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="success" onClick={() => doGrade(true)}>✓ I got it</Button>
                <Button size="sm" variant="danger" onClick={() => doGrade(false)}>✗ I missed parts</Button>
                {section && grade === false && !review && <a href={`#${section}`} className="text-sm text-accent hover:underline">Re-read the section →</a>}
              </div>
            </div>
          )}
          {grade === false && stage === "ask" && section && !review && (
            <a href={`#${section}`} className="mt-1 inline-block text-sm text-accent hover:underline">Re-read the section, then try again →</a>
          )}
        </div>
      </div>
    </div>
  );
}
