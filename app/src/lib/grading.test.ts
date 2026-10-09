import { describe, expect, it } from "vitest";
import { gradeBlank, gradeChoices, gradeOrder, gradeOutput, sameComplexity, shuffled } from "./grading";

describe("grading", () => {
  it("normalizes complexity notation", () => {
    expect(sameComplexity("O(n^2)", "O(n²)")).toBe(true);
    expect(sameComplexity("O(n log n)", "O(nlogn)")).toBe(true);
    expect(sameComplexity("O(n*m)", "O(n · m)")).toBe(true);
    expect(sameComplexity("O(2^n)", "O(2ⁿ)")).toBe(true);
    expect(sameComplexity("O(n)", "O(n log n)")).toBe(false);
  });
  it("grades output with alternatives and whitespace tolerance", () => {
    expect(gradeOutput("  [1, 2, 3] \n", "[1, 2, 3]")).toBe(true);
    expect(gradeOutput("a@b", "a%40b||a@b")).toBe(true);
    expect(gradeOutput("[1,2,3]", "[1, 2, 3]")).toBe(false);
  });
  it("grades blanks, choices, order", () => {
    expect(gradeBlank(" <= ", "<=||<")).toBe(true);
    expect(gradeChoices(["c", "a"], "a,c")).toBe(true);
    expect(gradeChoices(["a"], "a,c")).toBe(false);
    expect(gradeOrder(["x", "y"], "x, y")).toBe(true);
  });
  it("shuffles deterministically and never returns the answer order", () => {
    const items = ["a", "b", "c", "d"];
    expect(shuffled(items, "q1")).toEqual(shuffled(items, "q1"));
    for (const seed of ["s1", "s2", "s3", "s4", "s5"]) expect(shuffled(items, seed)).not.toEqual(items);
  });
});
