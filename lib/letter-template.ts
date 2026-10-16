import { baseCss, brand, decorHtml, esc, stripUrl } from "./brand";

type Letter = {
  language: "da" | "en";
  recipient: string;
  heading: string;
  body: string;
};

export function letterHtml({ language, recipient, heading, body }: Letter) {
  const { c, accent, avatar } = brand();
  const date = new Date().toLocaleDateString(language === "da" ? "da-DK" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const closing = language === "da" ? "Med venlig hilsen" : "Kind regards";

  const addressLine = [c.address, [c.zip, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const contactLine = [c.phone, c.email, stripUrl(c.website), stripUrl(c.linkedin)].filter(Boolean);

  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => `<p>${esc(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<style>
  ${baseCss(accent)}
  body { padding: 20mm 22mm 20mm 26mm; font-size: 10.5pt; line-height: 1.5; }
  header { position: relative; display: flex; gap: 12pt; align-items: center; padding-bottom: 12pt; margin-bottom: 22pt;
    background: linear-gradient(var(--accent), var(--accent)) left bottom / 36pt 2pt no-repeat,
                linear-gradient(#e3e6ea, #e3e6ea) left bottom / 100% 1px no-repeat; }
  .name { font-size: 20pt; font-weight: 600; letter-spacing: -0.01em; margin: 0 0 3pt; }
  .meta { font-size: 9pt; color: #5b636d; margin: 0; }
  .meta span + span::before { content: "·"; margin: 0 6pt; color: #a0a7b0; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20pt; }
  .recipient { white-space: pre-line; }
  .date { color: #5b636d; }
  h1 { font-size: 13pt; font-weight: 600; margin: 0 0 12pt; color: var(--accent); }
  p { margin: 0 0 9pt; }
  .sign { margin-top: 16pt; }
  .sign strong { font-weight: 600; color: var(--accent); }
</style>
</head>
<body>
  ${decorHtml}
  <header>
    ${avatar}
    <div>
      <p class="name">${esc(c.name)}</p>
      ${addressLine ? `<p class="meta">${esc(addressLine)}</p>` : ""}
      <p class="meta">${contactLine.map((x) => `<span>${esc(x)}</span>`).join("")}</p>
    </div>
  </header>
  <div class="top">
    <div class="recipient">${esc(recipient)}</div>
    <div class="date">${esc(date)}</div>
  </div>
  <p class="kicker">// ${language === "da" ? "ansøgning" : "application"}</p>
  <h1>${esc(heading)}</h1>
  ${paragraphs}
  <div class="sign">${closing}<br><strong>${esc(c.name)}</strong></div>
</body>
</html>`;
}
