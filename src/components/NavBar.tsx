"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeToggle";

const links = [
  { href: "/submit", label: "Submit" },
  { href: "/browse", label: "Browse" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-line bg-bg">
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6 lg:px-8"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md font-serif text-base tracking-[-0.01em] text-ink transition-colors hover:text-accent sm:text-xl"
        >
          <BrandLogo className="h-9 w-9" priority />
          <span>Untold Diaries</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {links.map(({ href, label }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium transition-colors sm:px-3 ${
                  active
                    ? "text-ink underline decoration-accent decoration-2 underline-offset-8"
                    : "text-muted hover:text-ink"
                }`}
              >
                {label}
              </Link>
            );
          })}
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
