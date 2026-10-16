import { baseCss, brand, decorHtml, esc, stripUrl } from "./brand";
import type { Cv, Language } from "./storage";

const LABELS = {
  da: { contact: "kontakt", skills: "kompetencer", languages: "sprog", interests: "uden for skærmen",
    profile: "profil", experience: "erfaring", projects: "projekter", education: "uddannelse" },
  en: { contact: "contact", skills: "skills", languages: "languages", interests: "off screen",
    profile: "profile", experience: "experience", projects: "projects", education: "education" },
};

// Erfaring vises som en git-graf: nyeste job øverst som fyldt punkt (HEAD, hvis det er nuværende).
// paged: CV'et fylder mere end én side. Så får hver side sidetal, og side 2+ får navn og kontakt i bunden.
export function cvHtml({ language, cv, paged = false }: { language: Language; cv: Cv; paged?: boolean }) {
  const { c, accent, avatar } = brand();
  const L = LABELS[language];
  const has = <T,>(xs: T[] | undefined) => (xs ?? []).filter(Boolean).length > 0;
  const section = (label: string, html: string) => `<section><p class="kicker">// ${label}</p>${html}</section>`;
  const bullets = (xs: string[]) => (has(xs) ? `<ul>${xs.filter(Boolean).map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : "");

  const contact = [
    ["tel", c.phone],
    ["mail", c.email],
    ["web", stripUrl(c.website)],
    ["in", stripUrl(c.linkedin)],
    ["by", [c.zip, c.city].filter(Boolean).join(" ")],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `<div><span class="k">${k}</span>${esc(v)}</div>`)
    .join("");

  const skills = cv.skills
    .filter((g) => has(g.items))
    .map((g) => `${g.group ? `<p class="group">${esc(g.group)}</p>` : ""}<div class="chips">${g.items
      .filter(Boolean)
      .map((s) => `<span class="chip">${esc(s)}</span>`)
      .join("")}</div>`)
    .join("");

  const langs = cv.languages
    .filter((l) => l.name)
    .map((l) => {
      const d = Math.max(0, Math.min(5, Math.round(l.dots || 0)));
      const meter = d ? `<span class="meter">${[1, 2, 3, 4, 5].map((i) => `<i${i <= d ? ' class="on"' : ""}></i>`).join("")}</span>` : "";
      return `<li><div class="lrow"><span>${esc(l.name)}</span>${meter}</div>${l.level ? `<small>${esc(l.level)}</small>` : ""}</li>`;
    })
    .join("");

  const jobs = cv.experience
    .filter((j) => j.title || j.company)
    .map((j, i) => {
      const current = i === 0 && /\b(nu|now|present|d\.d\.)\b|nuværende/i.test(j.period);
      return `<div class="item${i === 0 ? " head" : ""}">
        <div class="row"><strong class="role">${esc(j.title)}</strong><span class="period">${esc(j.period)}</span></div>
        <div class="org">${esc(j.company)}${current ? '<span class="tag">HEAD</span>' : ""}</div>
        ${bullets(j.bullets)}
      </div>`;
    })
    .join("");

  const projects = cv.projects
    .filter((p) => p.name)
    .map((p) => `<div class="proj"><strong>${esc(p.name)}</strong>${p.description ? ` – ${esc(p.description)}` : ""}</div>`)
    .join("");

  const education = cv.education
    .filter((e) => e.title)
    .map((e) => `<div class="item">
        <div class="row"><strong class="role">${esc(e.title)}</strong><span class="period">${esc(e.period)}</span></div>
        ${e.place ? `<div class="org">${esc(e.place)}</div>` : ""}
      </div>`)
    .join("");

  return `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<style>
  ${baseCss(accent)}
  body { padding: 15mm 15mm 15mm 0; display: grid; grid-template-columns: 68mm 1fr; font-size: 9.5pt; line-height: 1.45; }
  .side-bg { left: 0; top: 0; bottom: 0; width: 68mm; background: var(--tint); }
  aside, main { position: relative; min-width: 0; }
  aside { padding: 0 7mm 0 12mm; }
  main { padding-left: 9mm; }
  section { margin-bottom: 13pt; }
  p { margin: 0; }

  aside .mono { width: 52pt; height: 52pt; font-size: 18pt; margin-bottom: 16pt; }
  aside .kicker::after { background: color-mix(in srgb, var(--accent) 25%, white); }
  .contact { font-size: 8.5pt; }
  .contact div { display: grid; grid-template-columns: 26pt 1fr; margin-bottom: 2.5pt; overflow-wrap: anywhere; }
  .contact .k { font: 7.5pt var(--mono); color: var(--accent); }
  .group { font-size: 8.5pt; font-weight: 600; color: #374151; margin: 0 0 3pt; }
  .chips { display: flex; flex-wrap: wrap; gap: 3pt; margin-bottom: 8pt; }
  .chip { font: 7.8pt/1.25 var(--mono); padding: 2pt 5pt; border-radius: 4pt; background: #fff; color: #2b2f36;
    border: 0.75pt solid color-mix(in srgb, var(--accent) 35%, white); }
  .langs { list-style: none; margin: 0; padding: 0; }
  .langs li { margin-bottom: 5pt; }
  .lrow { display: flex; justify-content: space-between; align-items: center; }
  .langs small { display: block; font-size: 7.8pt; color: #6b7280; }
  .meter i { display: inline-block; width: 5.5pt; height: 5.5pt; margin-left: 2pt; border-radius: 50%;
    background: color-mix(in srgb, var(--accent) 20%, white); }
  .meter i.on { background: var(--accent); }

  header { padding-bottom: 11pt; margin-bottom: 15pt;
    background: linear-gradient(var(--accent), var(--accent)) left bottom / 36pt 2pt no-repeat,
                linear-gradient(#e3e6ea, #e3e6ea) left bottom / 100% 1px no-repeat; }
  .name { font-size: 25pt; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; }
  .headline { margin-top: 5pt; font: 500 10.5pt var(--mono); color: var(--accent); }
  .item { position: relative; padding: 0 0 9pt 15pt; break-inside: avoid; }
  .item::before { content: ""; position: absolute; left: 3.1pt; top: 11pt; bottom: 0; width: 1.3pt;
    background: color-mix(in srgb, var(--accent) 28%, white); }
  .item:last-child::before { display: none; }
  .item::after { content: ""; position: absolute; left: 0; top: 3.5pt; width: 7.5pt; height: 7.5pt; border-radius: 50%;
    border: 1.5pt solid var(--accent); background: #fff; box-sizing: border-box; }
  .item.head::after { background: var(--accent); }
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 8pt; }
  .role { font-size: 10.5pt; font-weight: 600; }
  .period { flex: none; font: 7.8pt var(--mono); color: #6b7280; }
  .org { color: var(--accent); font-weight: 500; }
  .tag { margin-left: 5pt; padding: 0.5pt 4pt; border-radius: 3pt; background: var(--accent); color: #fff;
    font: 600 6.5pt var(--mono); vertical-align: 1pt; }
  ul { list-style: none; margin: 3pt 0 0; padding: 0; }
  li { position: relative; padding-left: 10pt; margin-bottom: 1.5pt; }
  main li::before { content: "›"; position: absolute; left: 1pt; color: var(--accent); font-weight: 700; }
  .proj { margin-bottom: 4pt; break-inside: avoid; }
  ${paged ? pagedCss(accent, [c.name, c.phone, c.email].filter(Boolean).join("  ·  ")) : ""}
</style>
</head>
<body>
  <div class="side-bg"></div>
  ${decorHtml}
  <aside>
    ${avatar}
    ${contact ? section(L.contact, `<div class="contact">${contact}</div>`) : ""}
    ${skills ? section(L.skills, skills) : ""}
    ${langs ? section(L.languages, `<ul class="langs">${langs}</ul>`) : ""}
    ${has(cv.interests) ? section(L.interests, `<div class="chips">${cv.interests.filter(Boolean).map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div>`) : ""}
  </aside>
  <main>
    <header>
      <p class="name">${esc(c.name)}</p>
      ${cv.headline ? `<p class="headline">&lt;${esc(cv.headline)} /&gt;</p>` : ""}
    </header>
    ${cv.profile ? section(L.profile, `<p>${esc(cv.profile)}</p>`) : ""}
    ${jobs ? section(L.experience, jobs) : ""}
    ${projects ? section(L.projects, projects) : ""}
    ${education ? section(L.education, education) : ""}
  </main>
</body>
</html>`;
}

// Sidefod i sidens bundmargen (CSS margin boxes). Den venstre boks fortsætter bjælken og sidekolonnen ned i margenen.
function pagedCss(accent: string, footer: string) {
  const str = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  const tint = `color-mix(in srgb, ${accent} 7%, white)`;
  const box = `font: 7.5pt/1 ui-monospace, Consolas, monospace; color: #6b7280; vertical-align: middle;`;
  return `
  @page { margin: 0 0 12mm;
    @bottom-left { content: ""; width: 68mm; background: linear-gradient(90deg, ${accent} 5mm, ${tint} 5mm); }
    @bottom-right { content: ${str(footer + "   ·   ")} counter(page) " / " counter(pages); ${box} width: 142mm; white-space: nowrap; text-align: right; padding-right: 15mm; }
  }
  @page :first { @bottom-right { content: counter(page) " / " counter(pages); } }
  body { padding-bottom: 4mm; }
  .glyph { bottom: 2mm; }`;
}
