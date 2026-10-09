import "server-only";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeShiki from "@shikijs/rehype";
import rehypeStringify from "rehype-stringify";

/** User notes → HTML. Raw HTML in notes is dropped (remark-rehype default), so output is safe to inject. */
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeShiki, { themes: { light: "github-light", dark: "github-dark" }, defaultColor: false, fallbackLanguage: "text" })
  .use(rehypeStringify);

export async function renderMarkdown(md: string): Promise<string> {
  return String(await processor.process(md));
}
