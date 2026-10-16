import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { chromium } from "playwright";
import { getContact } from "@/lib/contact";
import { cvHtml } from "@/lib/cv-template";
import { letterHtml } from "@/lib/letter-template";
import { getApplication, OUTPUT_DIR, updateApplication } from "@/lib/storage";

export async function POST(req: Request) {
  // kind "both": ansøgning først, derefter CV, i én fil (fx til LinkedIn, hvor man kun kan vedhæfte én)
  const { id, kind = "letter" } = (await req.json()) as { id: string; kind?: "letter" | "cv" | "both" };
  const app = await getApplication(id);
  if (!app) return Response.json({ error: "Ansøgningen findes ikke." }, { status: 404 });
  if (kind !== "letter" && !app.cv) return Response.json({ error: "Der er intet CV endnu." }, { status: 400 });

  // Ansoegning_Navn_..., CV_Navn_..., Ansoegning-og-CV_Navn_... (engelsk: Application_..., Application-and-CV_...)
  const en = app.language === "en";
  const prefix = { letter: en ? "Application" : "Ansoegning", cv: "CV", both: en ? "Application-and-CV" : "Ansoegning-og-CV" }[kind];
  const fileName = [prefix, clean(getContact().name), clean(app.job.company), clean(app.job.title)]
    .filter(Boolean)
    .join("_") + ".pdf";

  const browser = await chromium.launch();
  let pdf: Uint8Array;
  try {
    const page = await browser.newPage();
    const render = async (html: string) => {
      await page.setContent(html, { waitUntil: "load" });
      return page.pdf({ format: "A4", preferCSSPageSize: true, printBackground: true });
    };
    const renderCv = async () => {
      const cv = await render(cvHtml({ language: app.language, cv: app.cv! }));
      // Fylder CV'et mere end én side, laves det igen med sidetal og kontakt-sidefod
      return pageCount(cv) > 1 ? render(cvHtml({ language: app.language, cv: app.cv!, paged: true })) : cv;
    };
    if (kind === "letter") pdf = await render(letterHtml(app));
    else if (kind === "cv") pdf = await renderCv();
    else pdf = await merge([await render(letterHtml(app)), await renderCv()]);
  } finally {
    await browser.close();
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUTPUT_DIR, fileName), pdf);
  await updateApplication(id, { letter: { pdf: fileName }, cv: { cvPdf: fileName }, both: { combinedPdf: fileName } }[kind]);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}

// Sætter flere PDF'er sammen i rækkefølge
async function merge(pdfs: Uint8Array[]) {
  const out = await PDFDocument.create();
  for (const bytes of pdfs) {
    const src = await PDFDocument.load(bytes);
    for (const p of await out.copyPages(src, src.getPageIndices())) out.addPage(p);
  }
  return out.save();
}

// Chromes PDF'er skriver sidetræet ukomprimeret: "/Type /Pages /Count N"
function pageCount(pdf: Buffer) {
  return Math.max(1, ...[...pdf.toString("latin1").matchAll(/\/Count (\d+)/g)].map((m) => Number(m[1])));
}

// "Åbo Træ & Co." -> "Aabo-Trae-Co"
function clean(s: string) {
  return (s || "")
    .replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa")
    .replace(/Æ/g, "Ae").replace(/Ø/g, "Oe").replace(/Å/g, "Aa")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}
