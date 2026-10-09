/** Answer normalization for auto-graded quiz types. Pure so it can be tested. */

export const COMPLEXITY_CHOICES = ["O(1)", "O(log n)", "O(√n)", "O(n)", "O(n log n)", "O(n²)", "O(n³)", "O(2ⁿ)", "O(n!)", "O(n + m)", "O(n · m)", "O(k)"];

export function normComplexity(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\^2|\*\*2/g, "²")
    .replace(/\^3|\*\*3/g, "³")
    .replace(/2\^n|2\*\*n/g, "2ⁿ")
    .replace(/sqrt\(n\)/g, "√n")
    .replace(/[*×x·]/g, "·")
    .replace(/log2|lg/g, "log");
}

export const sameComplexity = (a: string, b: string) => normComplexity(a) === normComplexity(b);

/** `answer` may hold alternatives separated by `||`. */
export const alternatives = (answer: string) => answer.split("||").map((s) => s.trim());

const normOutput = (s: string) => s.trim().replace(/[ \t]+$/gm, "").replace(/\r\n/g, "\n");
export const gradeOutput = (given: string, answer: string) => alternatives(answer).some((a) => normOutput(a) === normOutput(given));

export const gradeBlank = (given: string, answer: string) => alternatives(answer).some((a) => a === given.trim());

export function gradeChoices(selected: string[], answer: string): boolean {
  const want = answer.split(",").map((s) => s.trim()).sort();
  const got = [...selected].sort();
  return want.length === got.length && want.every((w, i) => w === got[i]);
}

export const gradeOrder = (order: string[], answer: string) => order.join(",") === answer.split(",").map((s) => s.trim()).join(",");

/** Deterministic shuffle (by seed) that never returns the answer order when it can avoid it. */
export function shuffled<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const rand = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  if (out.length > 1 && out.every((x, i) => x === items[i])) out.push(out.shift()!);
  return out;
}
