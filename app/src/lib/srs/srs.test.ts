import { describe, expect, it } from "vitest";
import { addDays, daysBetween, localDay, startOfDay, weekStart } from "../dates";
import { NEW_PROBLEM, afterFirstAttempt, afterResolve, relativeLateness, type ProblemState } from "./ladder";
import { elapsedMs, finish, pause, phase, resume, type AttemptTimes } from "./attempt";

const MIN = 60_000;
const T0 = Date.UTC(2026, 9, 12, 9, 0);

describe("dates", () => {
  it("does calendar math", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(daysBetween("2026-10-12", "2026-10-15")).toBe(3);
    expect(weekStart("2026-10-11")).toBe("2026-10-05"); // Sunday → previous Monday
  });
  it("respects timezones", () => {
    const lateEvening = new Date(Date.UTC(2026, 9, 12, 22, 30)); // 01:30 next day in Addis Ababa (UTC+3)
    expect(localDay(lateEvening, "UTC")).toBe("2026-10-12");
    expect(localDay(lateEvening, "Africa/Addis_Ababa")).toBe("2026-10-13");
    expect(startOfDay("2026-10-13", "Africa/Addis_Ababa").toISOString()).toBe("2026-10-12T21:00:00.000Z");
  });
});

describe("re-solve ladder", () => {
  it("walks +1 +3 +7 +14 +30 from the first-solve day, then +90, then done", () => {
    let s = afterFirstAttempt("solved", "2026-10-12");
    expect(s).toEqual({ status: "ladder", step: 0, anchor: "2026-10-12", due: "2026-10-13" });
    s = afterResolve(s, true, "2026-10-13");
    expect(s.due).toBe("2026-10-15"); // anchor + 3
    s = afterResolve(s, true, "2026-10-15");
    expect(s.due).toBe("2026-10-19"); // anchor + 7
    s = afterResolve(s, true, "2026-10-19");
    expect(s.due).toBe("2026-10-26"); // anchor + 14
    s = afterResolve(s, true, "2026-10-26");
    expect(s.due).toBe("2026-11-11"); // anchor + 30
    s = afterResolve(s, true, "2026-11-11");
    expect(s).toMatchObject({ status: "retired", due: "2027-02-09" }); // +90
    s = afterResolve(s, true, "2027-02-09");
    expect(s).toMatchObject({ status: "done", due: null });
  });

  it("resets to +1 on any failure, including the +90 re-check", () => {
    const s: ProblemState = { status: "ladder", step: 3, anchor: "2026-10-01", due: "2026-10-15" };
    expect(afterResolve(s, false, "2026-10-15")).toEqual({ status: "ladder", step: 0, anchor: "2026-10-15", due: "2026-10-16" });
    const retired: ProblemState = { status: "retired", step: 5, anchor: "2026-10-01", due: "2027-01-01" };
    expect(afterResolve(retired, false, "2027-01-01").status).toBe("ladder");
  });

  it("keeps the ladder position when late, scheduling at least a day out", () => {
    const s: ProblemState = { status: "ladder", step: 0, anchor: "2026-10-01", due: "2026-10-02" };
    // +1 done 5 days late: +3 (Oct 4) is already past, so it's due tomorrow
    expect(afterResolve(s, true, "2026-10-06")).toMatchObject({ step: 1, due: "2026-10-07" });
  });

  it("needed-solution → blank-file redo tomorrow, which becomes the real first solve", () => {
    let s = afterFirstAttempt("needed-solution", "2026-10-12");
    expect(s).toMatchObject({ status: "redo", due: "2026-10-13" });
    expect(afterResolve(s, false, "2026-10-13")).toMatchObject({ status: "redo", due: "2026-10-14" });
    s = afterResolve(s, true, "2026-10-13");
    expect(s).toEqual({ status: "ladder", step: 0, anchor: "2026-10-13", due: "2026-10-14" });
  });

  it("abandoned first attempts go back to the new pool", () => {
    expect(afterFirstAttempt("abandoned", "2026-10-12")).toEqual(NEW_PROBLEM);
  });

  it("ranks lateness relative to the interval", () => {
    const plus1: ProblemState = { status: "ladder", step: 0, anchor: "2026-10-01", due: "2026-10-02" };
    const plus30: ProblemState = { status: "ladder", step: 4, anchor: "2026-09-01", due: "2026-10-01" };
    // both 3 days late on Oct 5/4 — the +1 is far more urgent
    expect(relativeLateness(plus1, "2026-10-05")).toBeGreaterThan(relativeLateness(plus30, "2026-10-04"));
  });
});

describe("attempt timer", () => {
  const base: AttemptTimes = {
    kind: "first", difficulty: "M", startedAt: T0, pausedAt: null, pauseMs: 0, pauseUsed: false, hintTaken: false, keptGoing: false,
  };

  it("medium first attempt: working → decide at 25 → read-solution at 35 → abandoned at 50", () => {
    expect(phase(base, T0 + 24 * MIN)).toBe("working");
    expect(phase(base, T0 + 25 * MIN)).toBe("decide");
    expect(phase({ ...base, hintTaken: true }, T0 + 30 * MIN)).toBe("hint-window");
    expect(phase({ ...base, keptGoing: true }, T0 + 30 * MIN)).toBe("overtime");
    expect(phase(base, T0 + 35 * MIN)).toBe("read-solution");
    expect(phase(base, T0 + 50 * MIN)).toBe("abandoned");
  });

  it("flags: clean solve is alone; hint is not; going over is overtime", () => {
    expect(finish(base, T0 + 20 * MIN)).toMatchObject({ outcome: "solved", alone: true, flags: [] });
    expect(finish({ ...base, hintTaken: true }, T0 + 30 * MIN)).toMatchObject({ alone: false, flags: ["hinted"] });
    expect(finish({ ...base, hintTaken: true }, T0 + 40 * MIN).flags).toEqual(["hinted", "overtime"]);
    expect(finish({ ...base, keptGoing: true }, T0 + 30 * MIN).flags).toEqual(["overtime"]);
    expect(finish(base, T0 + 36 * MIN, { readSolution: true })).toMatchObject({ outcome: "needed-solution", alone: false });
    expect(finish(base, T0 + 60 * MIN)).toMatchObject({ outcome: "abandoned", flags: ["abandoned"] });
  });

  it("re-solve passes only within its limit without hints (E10/M15/H25)", () => {
    const r: AttemptTimes = { ...base, kind: "resolve" };
    expect(finish(r, T0 + 14 * MIN)).toMatchObject({ passed: true });
    expect(finish(r, T0 + 16 * MIN)).toMatchObject({ passed: false, flags: ["overtime"] });
    expect(finish({ ...r, hintTaken: true }, T0 + 5 * MIN)).toMatchObject({ passed: false });
    expect(phase(r, T0 + 15 * MIN)).toBe("over");
    expect(phase({ ...r, difficulty: "E" }, T0 + 10 * MIN)).toBe("over");
    expect(phase({ ...r, difficulty: "H" }, T0 + 24 * MIN)).toBe("working");
  });

  it("allows one pause of at most 10 minutes", () => {
    let a = pause(base, T0 + 5 * MIN);
    expect(elapsedMs(a, T0 + 10 * MIN)).toBe(5 * MIN); // frozen while paused
    expect(elapsedMs(a, T0 + 25 * MIN)).toBe(15 * MIN); // pause capped at 10 min, then the clock runs again
    a = resume(a, T0 + 8 * MIN);
    expect(elapsedMs(a, T0 + 20 * MIN)).toBe(17 * MIN);
    expect(() => pause(a, T0 + 21 * MIN)).toThrow();
  });
});
