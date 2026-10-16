import { askJson, loadPrompt } from "@/lib/ai";
import type { Job } from "@/lib/storage";

const schema = {
  type: "object",
  properties: {
    company: { type: "string" },
    title: { type: "string" },
    contactPerson: { type: "string" },
    contactEmail: { type: "string" },
    location: { type: "string" },
    deadline: { type: "string" },
    adLanguage: { type: "string", enum: ["da", "en"] },
    summary: { type: "string" },
    requirements: { type: "array", items: { type: "string" } },
    tasks: { type: "array", items: { type: "string" } },
  },
  required: [
    "company",
    "title",
    "contactPerson",
    "contactEmail",
    "location",
    "deadline",
    "adLanguage",
    "summary",
    "requirements",
    "tasks",
  ],
  additionalProperties: false,
};

// Henter siden og laver HTML om til ren tekst lokalt. Sider, der bygges med JavaScript (fx LinkedIn), giver for lidt tekst.
async function fetchAdText(url: string) {
  if (!/^https?:\/\//i.test(url)) throw new Error("linket skal starte med http:// eller https://");
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "da,en" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`siden svarede ${res.status}`);
  const text = (await res.text())
    .replace(/<(script|style|noscript|svg|head|nav|footer)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h\d)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
  if (text.length < 300) throw new Error("for lidt tekst på siden");
  return text.slice(0, 20_000); // loft, så en stor side ikke koster mange tokens
}

export async function POST(req: Request) {
  const body = (await req.json()) as { adText?: string; url?: string };
  let adText = body.adText?.trim() ?? "";
  const url = body.url?.trim() ?? "";
  if (!adText && !url) return Response.json({ error: "Indsæt et link til annoncen først." }, { status: 400 });

  if (!adText) {
    try {
      adText = await fetchAdText(url);
    } catch (e) {
      return Response.json({ error: `Kunne ikke læse annoncen fra linket (${(e as Error).message}).` }, { status: 422 });
    }
  }

  try {
    const prompt = await loadPrompt("extract", {
      TODAY: new Date().toISOString().slice(0, 10),
      AD_TEXT: adText,
    });
    const job = await askJson<Job>(prompt, schema);
    if (!job.company && !job.title) return Response.json({ error: "Fandt ingen jobannonce på siden." }, { status: 422 });
    return Response.json({ job, adText });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
