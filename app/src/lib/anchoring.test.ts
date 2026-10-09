import { describe, expect, it } from "vitest";
import { findQuote, quoteAt } from "./anchoring";

describe("text-quote anchoring", () => {
  const text = "The cost grows. A hash map is O(1) on average. Later: a hash map is O(1) on average, again.";

  it("disambiguates repeated text with context", () => {
    const second = text.lastIndexOf("hash map");
    const q = quoteAt(text, second, second + 8);
    expect(findQuote(text, q)).toEqual({ start: second, end: second + 8 });
  });

  it("survives edits elsewhere in the document", () => {
    const i = text.indexOf("grows");
    const q = quoteAt(text, i, i + 5);
    const edited = "INTRO PARAGRAPH ADDED. " + text;
    expect(findQuote(edited, q)).toEqual({ start: i + 23, end: i + 28 });
  });

  it("tolerates whitespace changes", () => {
    const q = { exact: "hash map is O(1)\non average", prefix: "", suffix: "" };
    const r = findQuote(text, q)!;
    expect(text.slice(r.start, r.end)).toBe("hash map is O(1) on average");
  });

  it("orphans when the text is gone", () => {
    expect(findQuote(text, { exact: "binary heap", prefix: "", suffix: "" })).toBeNull();
  });
});
