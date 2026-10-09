/** Mistakes-log categories from the DSA README. */
export const MISTAKE_CATEGORIES = ["off-by-one", "edge-case", "wrong-pattern", "complexity", "python-gotcha", "misread-problem", "didn't-test", "communication"];

export const HIGHLIGHT_COLORS = [
  { id: "key", label: "Key idea", emoji: "🟨" },
  { id: "confused", label: "Confused / revisit", emoji: "🟥" },
  { id: "aha", label: "Aha", emoji: "🟩" },
  { id: "interview", label: "Interview-relevant", emoji: "🟦" },
] as const;
