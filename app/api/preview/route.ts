import { cvHtml } from "@/lib/cv-template";
import { letterHtml } from "@/lib/letter-template";

// Samme HTML som PDF'en, til live-preview i editoren. Kører kun lokalt.
export async function POST(req: Request) {
  const data = await req.json();
  return new Response(data.kind === "cv" ? cvHtml(data) : letterHtml(data), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
