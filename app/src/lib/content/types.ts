export type CourseType = "course" | "book" | "track";
export type Difficulty = "E" | "M" | "H";

export const QUIZ_TYPES = ["mcq", "multi", "complexity", "output", "bug", "order", "blank", "explain"] as const;
export type QuizType = (typeof QUIZ_TYPES)[number];

/** A unit as declared in course.yaml (it may not have a file yet). */
export interface UnitMeta {
  id: string; // e.g. "01" or "milestone-1"
  slug: string; // URL segment, e.g. "01-big-o-complexity"
  title: string;
  kind: "unit" | "milestone";
  weeks?: number;
  outcome?: string;
  file?: string; // path relative to the course dir; absent = not written yet
  skills: string[];
}

export interface PartMeta {
  id: string;
  title: string;
  goal?: string;
  units: UnitMeta[];
}

export interface TimelineTarget {
  month: number;
  expect: string;
}

export interface CourseMeta {
  id: string;
  title: string;
  type: CourseType;
  summary?: string;
  hoursPerWeek: number;
  labels: { part: string; unit: string };
  overview?: string; // file relative to course dir
  parts: PartMeta[];
  timeline: TimelineTarget[];
  dir: string; // absolute path
}

export interface Section {
  id: string; // heading slug
  title: string;
  depth: 2 | 3;
  /** Readable sections need "mark read"; sections holding drills/checkpoints/builds/problems complete through those. */
  readable: boolean;
}

interface BlockBase {
  id: string;
  sectionId: string | null;
  /** Raw MDX of the block, so it can be re-rendered on its own (e.g. in the review queue). */
  source: string;
}

export interface CardBlock extends BlockBase {
  kind: "card";
  q: string;
}
export interface QuizBlock extends BlockBase {
  kind: "quiz";
  type: QuizType;
}
export interface DrillBlock extends BlockBase {
  kind: "drill";
  title?: string;
}
export interface ProblemBlock extends BlockBase {
  kind: "problem";
  key: string; // e.g. "lc-217"
  lc?: number;
  title: string;
  slug?: string;
  url: string;
  pattern: string;
  difficulty: Difficulty;
  nc: boolean;
}
export interface BuildBlock extends BlockBase {
  kind: "build";
  title: string;
}
export interface AskBlock extends BlockBase {
  kind: "ask";
  q: string;
  section?: string;
}
export interface ResourceBlock extends BlockBase {
  kind: "resource";
  href: string;
  type: string;
  title: string;
  time?: string;
  required: boolean;
}

export type Block = CardBlock | QuizBlock | DrillBlock | ProblemBlock | BuildBlock | AskBlock | ResourceBlock;

export interface UnitIndex {
  sections: Section[];
  blocks: Block[];
  errors: string[];
}
