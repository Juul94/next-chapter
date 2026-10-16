"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import CreditsLink from "./CreditsLink";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "Oversigt" },
  { href: "/ny", label: "Ny ansøgning" },
  { href: "/profil", label: "Profil" },
];

export default function Nav() {
  const path = usePathname();

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-surface">
      <div className="mx-auto flex max-w-6xl items-center gap-8 px-4">
        <Link href="/" className="flex min-h-11 items-center gap-2 rounded-md font-display font-semibold text-ink focus-visible:outline-2 focus-visible:outline-primary">
          <span className="size-3 rounded-sm bg-primary" />
          Nyt job
        </Link>

        <div className="flex gap-6 text-sm">
          {LINKS.map(({ href, label }) => {
            const active = path === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-16 items-center border-b-2 focus-visible:outline-2 focus-visible:outline-primary ${
                  active ? "border-primary font-medium text-ink" : "border-transparent text-gray-600 hover:text-ink"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <CreditsLink />
        <ThemeToggle />
      </div>
    </nav>
  );
}
