import { Answer, Build, Callout, Card, Drill, Media, Resource, SectionEnd } from "./basic";
import { Choice, Model, Quiz, Step, Why } from "./quiz";
import { Ask, Checkpoint, Problem, Problems } from "./practice";

/** Every component an MDX file may use (keep in sync with KNOWN in lib/content/remark-unit.ts). */
export const mdxComponents = {
  Card, Drill, Answer, SectionEnd, Build, Resource, Media, Callout,
  Quiz, Choice, Step, Why, Model,
  Problems, Problem, Checkpoint, Ask,
};
