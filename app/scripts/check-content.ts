/**
 * Validates every course: course.yaml shape, MDX syntax, known components, required attributes, duplicate ids.
 * Usage: npm run content:check [-- <course>/<file.mdx>]
 */
import fs from "node:fs";
import path from "node:path";
import { compile } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import { CONTENT_DIR, courseUnits, indexMdx, listCourses } from "../src/lib/content/courses";
import { remarkUnit } from "../src/lib/content/remark-unit";

async function checkFile(file: string): Promise<string[]> {
  const source = fs.readFileSync(file, "utf8");
  const problems: string[] = [];
  try {
    await compile(source, { remarkPlugins: [remarkGfm, remarkUnit] });
  } catch (e) {
    const err = e as { message: string; line?: number };
    return [`MDX syntax: ${err.message}${err.line ? ` (line ${err.line})` : ""}`];
  }
  const index = indexMdx(source, file);
  problems.push(...index.errors);
  // mcq/multi answers must name existing <Choice> ids; order answers must name <Step> ids
  for (const b of index.blocks) {
    if (b.kind !== "quiz") continue;
    const answer = /answer="([^"]*)"/.exec(b.source)?.[1];
    if (!answer) continue;
    const childTag = b.type === "order" ? "Step" : b.type === "mcq" || b.type === "multi" ? "Choice" : null;
    if (!childTag) continue;
    const ids = new Set([...b.source.matchAll(new RegExp(`<${childTag}\\s+id="([^"]+)"`, "g"))].map((m) => m[1]));
    for (const a of answer.split(",").map((s) => s.trim())) {
      if (!ids.has(a)) problems.push(`<Quiz id="${b.id}"> answer "${a}" has no matching <${childTag} id="${a}">`);
    }
  }
  return problems;
}

async function main() {
  const only = process.argv[2];
  let failed = 0;
  let checked = 0;
  for (const course of listCourses()) {
    const files = courseUnits(course)
      .filter((u) => u.file)
      .map((u) => path.join(course.dir, u.file!));
    if (course.overview) files.unshift(path.join(course.dir, course.overview));
    for (const file of files) {
      if (only && !file.endsWith(only)) continue;
      checked++;
      const problems = await checkFile(file);
      const rel = path.relative(CONTENT_DIR, file);
      if (problems.length) {
        failed++;
        console.log(`✗ ${rel}`);
        for (const p of problems) console.log(`    ${p}`);
      } else {
        const idx = indexMdx(fs.readFileSync(file, "utf8"));
        const count = (k: string) => idx.blocks.filter((b) => b.kind === k).length;
        console.log(
          `✓ ${rel}  sections:${idx.sections.length} cards:${count("card")} quiz:${count("quiz")} drills:${count("drill")} problems:${count("problem")} asks:${count("ask")} resources:${count("resource")}`,
        );
      }
    }
  }
  console.log(`\n${checked} file(s) checked, ${failed} with problems`);
  process.exit(failed ? 1 : 0);
}

main();
