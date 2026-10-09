"use client";

import { createContext, useContext, useOptimistic, useTransition, type ReactNode } from "react";
import type { UnitState } from "@/lib/server/learn";

/**
 * Everything an interactive block needs about the current unit. Server state arrives as props
 * (refreshed by revalidatePath after each action). `mode` lets blocks render differently when
 * they're shown on their own in the review queue.
 */
interface UnitCtx {
  state: UnitState;
  mode: "lesson" | "review";
  blockKey: (id: string) => string;
  /** Apply an optimistic patch and run a server action in one transition. */
  act: (optimistic: ((s: UnitState) => UnitState) | null, action: () => Promise<unknown>) => void;
  pending: boolean;
}

const Ctx = createContext<UnitCtx | null>(null);

export function UnitProvider({ state, mode = "lesson", children }: { state: UnitState; mode?: "lesson" | "review"; children: ReactNode }) {
  const [optimistic, apply] = useOptimistic(state, (s: UnitState, fn: (s: UnitState) => UnitState) => fn(s));
  const [pending, start] = useTransition();
  const value: UnitCtx = {
    state: optimistic,
    mode,
    blockKey: (id) => `${state.courseId}/${state.unitId}/${id}`,
    pending,
    act: (fn, action) =>
      start(async () => {
        if (fn) apply(fn);
        try {
          await action();
        } catch (e) {
          alert((e as Error).message);
        }
      }),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUnit(): UnitCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useUnit outside <UnitProvider>");
  return c;
}
