"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "../ui";

const LINKS = [
  { href: "/", label: "Today", icon: "☀" },
  { href: "/c", label: "Courses", icon: "▤" },
  { href: "/review", label: "Review", icon: "↻" },
  { href: "/problems", label: "Problems", icon: "⌘" },
  { href: "/notebook", label: "Notebook", icon: "✎" },
  { href: "/progress", label: "Progress", icon: "▲" },
];

const active = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function Nav() {
  const path = usePathname();
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
          <Link href="/" className="font-semibold tracking-tight">Smart Growth</Link>
          <nav className="hidden gap-1 md:flex">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={cx("rounded-md px-3 py-1.5 text-sm", active(path, l.href) ? "bg-muted font-medium text-ink" : "text-ink-2 hover:bg-muted")}>
                {l.label}
              </Link>
            ))}
          </nav>
          <Link href="/settings" className="ml-auto text-sm text-ink-3 hover:text-ink">Settings</Link>
        </div>
      </header>
      {/* Phone: bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={cx("flex flex-col items-center gap-0.5 py-2 text-[11px]", active(path, l.href) ? "text-accent" : "text-ink-3")}>
            <span aria-hidden className="text-base leading-none">{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
