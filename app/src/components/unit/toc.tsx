"use client";

import { useEffect, useState } from "react";
import { useUnit } from "./context";
import type { Section } from "@/lib/content/types";
import { cx } from "../ui";

export function Toc({ sections }: { sections: Section[] }) {
  const { state } = useUnit();
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-70px 0px -70% 0px" },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [sections]);

  const readable = sections.filter((s) => s.readable);
  const read = readable.filter((s) => state.readSections.includes(s.id)).length;

  return (
    <nav className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] overflow-y-auto pr-2 text-sm lg:block" aria-label="Sections">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">
        Sections · {read}/{readable.length} read
      </div>
      <ul className="space-y-0.5">
        {sections.map((s) => {
          const isRead = state.readSections.includes(s.id);
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={cx(
                  "flex items-start gap-1.5 rounded px-1.5 py-1 leading-snug hover:bg-muted",
                  s.depth === 3 && "pl-4",
                  active === s.id ? "bg-muted text-ink" : "text-ink-2",
                )}
              >
                <span className={cx("mt-px w-3 shrink-0 text-xs", isRead ? "text-good" : "text-ink-3")}>{s.readable ? (isRead ? "✓" : "·") : "◇"}</span>
                <span>{s.title}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
