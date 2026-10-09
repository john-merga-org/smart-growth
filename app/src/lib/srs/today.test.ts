import { describe, expect, it } from "vitest";
import { buildToday, type DueProblem, type TodayInput } from "./today";

const p = (key: string, due: string, step = 0, difficulty: "E" | "M" | "H" = "M"): DueProblem => ({
  key, title: key, difficulty, status: "ladder", step, anchor: "2026-10-01", due,
});
const base: TodayInput = {
  today: "2026-10-12", resolveCap: 4, cardCap: 20, dueProblems: [], resolvesDoneToday: 0,
  dueCards: [], cardsReviewedToday: 0, newProblems: [{ key: "lc-1", title: "Two Sum", difficulty: "E", courseId: "dsa", unitId: "03" }],
};

describe("today queue", () => {
  it("caps re-solves at 4 and orders by relative lateness", () => {
    const due = [p("a", "2026-10-11", 4), p("b", "2026-10-10", 0), p("c", "2026-10-12"), p("d", "2026-10-12"), p("e", "2026-10-12")];
    const plan = buildToday({ ...base, dueProblems: due });
    expect(plan.resolves.map((x) => x.key)[0]).toBe("b"); // 2 days late on a +1 beats 1 day late on a +30
    expect(plan.resolves).toHaveLength(4);
    expect(plan.resolvesLeftAfterCap).toBe(1);
  });

  it("subtracts re-solves already done today from the cap", () => {
    const plan = buildToday({ ...base, dueProblems: [p("a", "2026-10-12"), p("b", "2026-10-12")], resolvesDoneToday: 3 });
    expect(plan.resolves).toHaveLength(1);
  });

  it("offers new problems only after re-solves are cleared", () => {
    expect(buildToday({ ...base, dueProblems: [p("a", "2026-10-12")] })).toMatchObject({ newProblems: [], newBlockedBy: "reviews-first" });
    expect(buildToday(base).newProblems).toHaveLength(1);
  });

  it("enters backlog mode past 2 days of cap and hides new work", () => {
    const due = Array.from({ length: 9 }, (_, i) => p(`p${i}`, "2026-10-05"));
    const plan = buildToday({ ...base, dueProblems: due });
    expect(plan).toMatchObject({ backlog: true, newBlockedBy: "backlog", newProblems: [] });
    expect(plan.resolves).toHaveLength(4);
  });

  it("caps fresh cards but always shows learning repeats", () => {
    const now = new Date("2026-10-12T08:00:00Z");
    const dueCards = [
      ...Array.from({ length: 30 }, (_, i) => ({ id: i, due: now, reviewedToday: false })),
      { id: 99, due: now, reviewedToday: true },
    ];
    const plan = buildToday({ ...base, dueCards, cardsReviewedToday: 15 });
    expect(plan.cards).toHaveLength(6); // 1 repeat + 5 remaining under the cap of 20
    expect(plan.cards[0].id).toBe(99);
  });

  it("time box fills by priority", () => {
    const now = new Date();
    const plan = buildToday({
      ...base,
      dueProblems: [p("a", "2026-10-12"), p("b", "2026-10-12")], // 15 min each
      dueCards: Array.from({ length: 10 }, (_, i) => ({ id: i, due: now, reviewedToday: false })),
      minutes: 20,
    });
    expect(plan.resolves).toHaveLength(1);
    expect(plan.cards).toHaveLength(10); // 5 min
  });
});
