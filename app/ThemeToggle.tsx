"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./icons";

// Skifter mellem lyst og mørkt tema. Valget huskes i localStorage; scriptet i layout.tsx sætter det før første visning.
export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => setDark(document.documentElement.dataset.theme === "dark"), []);

  function toggle() {
    const next = !dark;
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  }

  const label = dark ? "Skift til lyst tema" : "Skift til mørkt tema";
  return (
    <button className="icon-btn" onClick={toggle} title={label} aria-label={label}>
      {dark === null ? null : dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
