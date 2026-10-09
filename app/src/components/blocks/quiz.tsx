"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useUnit } from "../unit/context";
import { useReview } from "../unit/review-context";
import { Badge, Button, cx } from "../ui";
import { answerQuiz } from "@/lib/actions/learn";
import { COMPLEXITY_CHOICES, gradeBlank, gradeChoices, gradeOrder, gradeOutput, sameComplexity, shuffled } from "@/lib/grading";
import type { QuizType } from "@/lib/content/types";

interface QuizProps {
  id: string;
  type: QuizType;
  answer?: string;
  time?: string;
  space?: string;
  line?: string | number;
  choices?: string;
  children?: ReactNode;
}

interface QuizCtxValue {
  type: QuizType;
  id: string;
  committed: boolean;
  selected: string[];
  toggle: (choiceId: string) => void;
  correctIds: string[];
  order: string[];
  move: (stepId: string, dir: -1 | 1) => void;
  selfGrade: (ok: boolean) => void;
  graded: boolean | null;
}
const QuizCtx = createContext<QuizCtxValue | null>(null);
const useQuiz = () => {
  const c = useContext(QuizCtx);
  if (!c) throw new Error("Quiz child outside <Quiz>");
  return c;
};

export function Quiz({ id, type, answer = "", time = "", space = "", line, choices, children }: QuizProps) {
  const { state, blockKey, act, mode } = useUnit();
  const review = useReview();
  const previous = mode === "lesson" ? state.responses[id] : undefined;

  const [committed, setCommitted] = useState(!!previous);
  const [graded, setGraded] = useState<boolean | null>(previous ? previous.correct : null);
  const prev = (previous?.response ?? {}) as Record<string, unknown>;
  const [selected, setSelected] = useState<string[]>((prev.selected as string[]) ?? []);
  const [text, setText] = useState<string>((prev.text as string) ?? "");
  const [tc, setTc] = useState<string>((prev.time as string) ?? "");
  const [sc, setSc] = useState<string>((prev.space as string) ?? "");
  const [bugLine, setBugLine] = useState<number | null>((prev.line as number) ?? null);
  const answerIds = answer.split(",").map((s) => s.trim()).filter(Boolean);
  const [order, setOrder] = useState<string[]>((prev.order as string[]) ?? (type === "order" ? shuffled(answerIds, id) : []));
  const bodyRef = useRef<HTMLDivElement>(null);

  // Bug quizzes: make code lines clickable and show selection/result.
  useEffect(() => {
    if (type !== "bug" || !bodyRef.current) return;
    const lines = [...bodyRef.current.querySelectorAll("pre .line")] as HTMLElement[];
    lines.forEach((el, i) => {
      const n = i + 1;
      el.dataset.bugLine = String(n);
      el.classList.toggle("quiz-line-selected", n === bugLine);
      el.classList.toggle("quiz-line-correct", committed && n === Number(line));
      el.classList.toggle("quiz-line-clickable", !committed);
    });
  }, [type, bugLine, committed, line]);

  const record = (response: unknown, correct: boolean | null) => {
    setCommitted(true);
    setGraded(correct);
    if (correct !== null) review?.reveal(correct ? 3 : 1);
    act(
      (s) => ({ ...s, responses: { ...s.responses, [id]: { response, correct, at: new Date().toISOString() } } }),
      () => answerQuiz(blockKey(id), response, correct),
    );
  };

  const submit = () => {
    switch (type) {
      case "mcq":
      case "multi":
        return record({ selected }, gradeChoices(selected, answer));
      case "complexity":
        return record({ time: tc, space: sc }, sameComplexity(tc, time) && sameComplexity(sc, space));
      case "output":
        return record({ text }, gradeOutput(text, answer));
      case "blank":
        return record({ text }, gradeBlank(text, answer));
      case "bug":
        return record({ line: bugLine }, bugLine === Number(line));
      case "order":
        return record({ order }, gradeOrder(order, answer));
      case "explain":
        setCommitted(true); // self-graded after seeing the model answer
        review?.reveal();
        return;
    }
  };

  const retry = () => {
    setCommitted(false);
    setGraded(null);
    setSelected([]);
    setText("");
    setBugLine(null);
    if (type === "order") setOrder(shuffled(answerIds, id + Date.now()));
  };

  const canSubmit =
    (type === "mcq" || type === "multi") ? selected.length > 0
    : type === "complexity" ? !!tc && !!sc
    : type === "bug" ? bugLine !== null
    : type === "order" ? true
    : text.trim().length > 0;

  const ctx: QuizCtxValue = {
    type, id, committed, selected, correctIds: answerIds, order, graded,
    toggle: (c) => {
      if (committed) return;
      setSelected((s) => (type === "mcq" ? [c] : s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));
    },
    move: (stepId, dir) => {
      if (committed) return;
      setOrder((o) => {
        const i = o.indexOf(stepId);
        const j = i + dir;
        if (j < 0 || j >= o.length) return o;
        const n = [...o];
        [n[i], n[j]] = [n[j], n[i]];
        return n;
      });
    },
    selfGrade: (ok) => record({ text }, ok),
  };

  const options = choices ? choices.split("|").map((s) => s.trim()) : COMPLEXITY_CHOICES;
  const label = { mcq: "Pick one", multi: "Pick all that apply", complexity: "Time & space", output: "Predict the output", bug: "Click the buggy line", order: "Put in order", blank: "Fill the blank", explain: "Explain" }[type];

  return (
    <QuizCtx.Provider value={ctx}>
      <div className={cx("not-prose my-6 rounded-lg border bg-surface", graded === true ? "border-good/50" : graded === false ? "border-bad/50" : "border-line")} data-block={id}>
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <span className="text-sm font-semibold">Quiz · <span className="font-normal text-ink-3">{label}</span></span>
          {graded === true && <Badge tone="good">correct</Badge>}
          {graded === false && <Badge tone="bad">wrong → added to reviews</Badge>}
        </div>
        <div
          ref={bodyRef}
          className="prose flex max-w-none flex-col px-4 py-3 dark:prose-invert"
          onClick={(e) => {
            if (type !== "bug" || committed) return;
            const el = (e.target as HTMLElement).closest("[data-bug-line]") as HTMLElement | null;
            if (el) setBugLine(Number(el.dataset.bugLine));
          }}
        >
          {children}
        </div>
        <div className="space-y-3 border-t border-line px-4 py-3">
          {type === "complexity" && (
            <div className="flex flex-wrap gap-3 text-sm">
              {([["Time", tc, setTc, time], ["Space", sc, setSc, space]] as const).map(([name, val, set, correct]) => (
                <label key={name} className="flex items-center gap-2">
                  {name}
                  <select disabled={committed} value={val} onChange={(e) => set(e.target.value)} className="h-9 rounded-md border border-line bg-bg px-2">
                    <option value="">—</option>
                    {options.map((o) => <option key={o}>{o}</option>)}
                  </select>
                  {committed && !sameComplexity(val, correct) && <span className="text-good">→ {correct}</span>}
                </label>
              ))}
            </div>
          )}
          {(type === "output" || type === "blank") && (
            <div>
              {type === "output" ? (
                <textarea disabled={committed} value={text} onChange={(e) => setText(e.target.value)} placeholder="What does it print?" className="min-h-16 w-full rounded-md border border-line bg-bg p-2 font-mono text-sm" />
              ) : (
                <input disabled={committed} value={text} onChange={(e) => setText(e.target.value)} placeholder="___ =" className="h-9 w-full max-w-xs rounded-md border border-line bg-bg px-2 font-mono text-sm" />
              )}
              {committed && graded === false && <p className="mt-1 text-sm">Expected: <code className="text-good">{answer.split("||")[0]}</code></p>}
            </div>
          )}
          {type === "explain" && !committed && (
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Explain it in your own words (or out loud, then type a summary)…" className="min-h-24 w-full rounded-md border border-line bg-bg p-2 text-sm" />
          )}
          {type === "bug" && committed && graded === false && <p className="text-sm">The bug is on line {line} (highlighted green).</p>}
          {!committed ? (
            <Button variant="primary" size="sm" disabled={!canSubmit} onClick={submit}>Check answer</Button>
          ) : (
            graded !== null && mode === "lesson" && <Button size="sm" variant="ghost" onClick={retry}>Try again</Button>
          )}
        </div>
      </div>
    </QuizCtx.Provider>
  );
}

export function Choice({ id, children }: { id: string; children?: ReactNode }) {
  const q = useQuiz();
  const isSel = q.selected.includes(id);
  const isRight = q.correctIds.includes(id);
  return (
    <button
      type="button"
      onClick={() => q.toggle(id)}
      disabled={q.committed}
      className={cx(
        "not-prose my-1 flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left text-sm transition",
        !q.committed && (isSel ? "border-accent bg-accent/10" : "border-line hover:bg-muted"),
        q.committed && isRight && "border-good bg-good/10",
        q.committed && isSel && !isRight && "border-bad bg-bad/10",
        q.committed && !isSel && !isRight && "border-line opacity-60",
      )}
    >
      <span className={cx("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border", q.type === "mcq" ? "rounded-full" : "rounded-sm", isSel ? "border-accent bg-accent" : "border-ink-3")} />
      <span className="[&_p]:m-0">{children}</span>
    </button>
  );
}

export function Step({ id, children }: { id: string; children?: ReactNode }) {
  const q = useQuiz();
  const pos = q.order.indexOf(id);
  const correctPos = q.correctIds.indexOf(id);
  return (
    <div
      style={{ order: 100 + pos }}
      className={cx(
        "not-prose my-1 flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
        q.committed ? (pos === correctPos ? "border-good bg-good/10" : "border-bad bg-bad/10") : "border-line",
      )}
    >
      <span className="w-5 text-ink-3">{pos + 1}.</span>
      <span className="flex-1 [&_p]:m-0">{children}</span>
      {q.committed ? (
        pos !== correctPos && <span className="text-xs text-good">→ {correctPos + 1}</span>
      ) : (
        <span className="flex gap-1">
          <button className="rounded px-1.5 hover:bg-muted" aria-label="Move up" onClick={() => q.move(id, -1)}>↑</button>
          <button className="rounded px-1.5 hover:bg-muted" aria-label="Move down" onClick={() => q.move(id, 1)}>↓</button>
        </span>
      )}
    </div>
  );
}

/** Explanation: only after committing. */
export function Why({ children }: { children?: ReactNode }) {
  const q = useQuiz();
  if (!q.committed) return null;
  return (
    <div style={{ order: 1000 }} className="mt-3 rounded-md bg-muted px-3 py-2 text-sm [&_p]:my-1">
      <span className="font-semibold">Why: </span>
      {children}
    </div>
  );
}

/** Model answer for `explain` quizzes, followed by self-grading. */
export function Model({ children }: { children?: ReactNode }) {
  const q = useQuiz();
  if (!q.committed) return null;
  return (
    <div style={{ order: 1000 }} className="mt-3 rounded-md border-l-4 border-good bg-good/5 px-3 py-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-good">Model answer</div>
      <div className="text-sm [&_p]:my-1">{children}</div>
      {q.graded === null && (
        <div className="not-prose mt-2 flex gap-2">
          <span className="self-center text-sm">Did yours cover it?</span>
          <Button size="sm" variant="success" onClick={() => q.selfGrade(true)}>✓ Yes</Button>
          <Button size="sm" variant="danger" onClick={() => q.selfGrade(false)}>✗ Missed parts</Button>
        </div>
      )}
    </div>
  );
}
