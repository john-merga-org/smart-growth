import "server-only";
import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import rehypeShiki from "@shikijs/rehype";
import type { ComponentType, ReactNode } from "react";
import { remarkUnit } from "./remark-unit";

type MdxModule = { default: ComponentType<{ components?: Record<string, unknown> }> };
const cache = new Map<string, Promise<MdxModule>>();
const MAX_CACHE = 200;

const shikiOptions = {
  themes: { light: "github-light", dark: "github-dark" },
  defaultColor: false as const,
  langs: ["python", "ts", "tsx", "js", "jsx", "html", "css", "bash", "json", "go", "sql", "yaml", "text"],
  fallbackLanguage: "text",
};

/** Compile + evaluate MDX (cached by source). The same remark plugin as the indexer → identical ids. */
export function compileMdx(source: string): Promise<MdxModule> {
  let hit = cache.get(source);
  if (!hit) {
    hit = evaluate(source, {
      ...runtime,
      remarkPlugins: [remarkGfm, remarkUnit],
      rehypePlugins: [[rehypeShiki, shikiOptions]],
    }) as Promise<MdxModule>;
    if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value!);
    cache.set(source, hit);
    hit.catch(() => cache.delete(source));
  }
  return hit;
}

export async function Mdx({ source, components }: { source: string; components: Record<string, unknown> }): Promise<ReactNode> {
  const { default: Content } = await compileMdx(source);
  return <Content components={components} />;
}
