import fs from "node:fs";
import { getContact } from "./contact";
import { PHOTO_FILE } from "./storage";

// Fælles design for ansøgning og CV, så de to tydeligt hører sammen

export function brand() {
  const c = getContact();
  const accent = /^#[0-9a-f]{6}$/i.test(process.env.ACCENT_COLOR ?? "") ? process.env.ACCENT_COLOR! : "#5b3fd6";
  const words = c.name.trim().split(/\s+/).filter(Boolean);
  const initials = words.length ? (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase() : "";
  return { c, accent, avatar: avatarHtml(initials) };
}

// Profilbilledet (fra Profil) som data-URI, ellers initialerne. Billedet forlader aldrig maskinen.
function avatarHtml(initials: string) {
  try {
    const src = `data:image/jpeg;base64,${fs.readFileSync(PHOTO_FILE).toString("base64")}`;
    return `<img class="mono" src="${src}" alt="">`;
  } catch {
    return initials ? `<div class="mono">${esc(initials)}</div>` : "";
  }
}

// Margen ligger på body (gentages på hver side), så pynten kan gå helt ud til papirets kant.
// Pynten ligger bag teksten (z-index -1), så den aldrig gør noget ulæseligt.
export function baseCss(accent: string) {
  return `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  :root { --accent: ${accent}; --tint: color-mix(in srgb, var(--accent) 7%, white);
    --mono: ui-monospace, "JetBrains Mono", "SF Mono", Consolas, Menlo, monospace; }
  body { margin: 0; -webkit-box-decoration-break: clone; box-decoration-break: clone;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #1f2328; }
  .bar, .dots, .glyph, .side-bg { position: fixed; z-index: -1; }
  .bar { left: 0; top: 0; bottom: 0; width: 5mm; background: var(--accent); }
  .dots { right: 0; top: 0; width: 70mm; height: 45mm; opacity: 0.22;
    background-image: radial-gradient(var(--accent) 1.1pt, transparent 1.3pt); background-size: 9pt 9pt;
    -webkit-mask-image: linear-gradient(225deg, #000 10%, transparent 70%); mask-image: linear-gradient(225deg, #000 10%, transparent 70%); }
  .glyph { right: 12mm; bottom: 6mm; font: 700 92pt/1 var(--mono); letter-spacing: -0.08em; color: var(--accent); opacity: 0.06; }
  .mono { flex: none; width: 34pt; height: 34pt; border-radius: 50%; background: var(--accent); color: #fff;
    display: flex; align-items: center; justify-content: center; font-size: 12pt; font-weight: 600; letter-spacing: 0.02em; }
  img.mono { display: block; object-fit: cover; background: var(--tint); }
  .kicker { display: flex; align-items: center; gap: 6pt; margin: 0 0 7pt; font: 500 8.5pt/1.2 var(--mono); color: var(--accent); }
  .kicker::after { content: ""; flex: 1; height: 1px; background: color-mix(in srgb, var(--accent) 18%, white); }
  @media screen { html { scrollbar-width: none; } body { width: 210mm; min-height: 297mm; } }`;
}

export const decorHtml = `<div class="bar"></div><div class="dots"></div><div class="glyph">&lt;/&gt;</div>`;

export function stripUrl(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

export function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
