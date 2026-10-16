"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MoreIcon } from "./icons";

export type MenuItem = {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  title?: string;
  danger?: boolean;
};

// "⋮"-menu. Placeres med position: fixed, så den ikke klippes af tabellens overflow. Lukker ved klik udenfor, Esc eller scroll.
export default function KebabMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const onDown = (e: MouseEvent) => {
      if (!menu.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        button.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  function toggle() {
    if (pos) return setPos(null);
    const r = button.current!.getBoundingClientRect();
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  }

  const itemClass = (danger?: boolean) =>
    `flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm hover:bg-hover focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 ${
      danger ? "text-danger" : "text-ink"
    }`;

  return (
    <>
      <button ref={button} className="icon-btn" title={label} aria-label={label} aria-haspopup="menu" aria-expanded={!!pos} onClick={toggle}>
        <MoreIcon />
      </button>
      {pos && (
        <div
          ref={menu}
          role="menu"
          style={{ top: pos.top, right: pos.right }}
          className="fixed z-50 min-w-60 rounded-lg border border-gray-200 bg-surface p-1 shadow-lg"
        >
          {items.map((item) =>
            item.href ? (
              <Link key={item.label} href={item.href} role="menuitem" className={itemClass(item.danger)}>
                {item.icon}
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                role="menuitem"
                className={itemClass(item.danger)}
                disabled={item.disabled}
                title={item.title}
                onClick={() => {
                  setPos(null);
                  item.onClick?.();
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </>
  );
}
