import fs from "node:fs/promises";
import { PHOTO_FILE } from "@/lib/storage";

// Profilbilledet gemmes lokalt i data/photo.jpg og bruges kun i PDF-skabelonerne – aldrig i prompts.
export async function GET() {
  try {
    return new Response(new Uint8Array(await fs.readFile(PHOTO_FILE)), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}

// Modtager formdata "file": et JPEG, der allerede er beskåret og skaleret ned i browseren
export async function POST(req: Request) {
  const file = (await req.formData()).get("file");
  if (!(file instanceof File) || file.type !== "image/jpeg" || file.size > 2_000_000) {
    return Response.json({ error: "Billedet kunne ikke gemmes." }, { status: 400 });
  }
  await fs.writeFile(PHOTO_FILE, new Uint8Array(await file.arrayBuffer()));
  return Response.json({ ok: true });
}

export async function DELETE() {
  await fs.rm(PHOTO_FILE, { force: true });
  return Response.json({ ok: true });
}
