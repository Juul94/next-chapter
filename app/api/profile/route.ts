import { extractText, getDocumentProxy } from "unpdf";
import { getProfile, PROFILE_FILE, writeJson, type Profile } from "@/lib/storage";

export async function GET() {
  const profile = await getProfile();
  return Response.json(profile ?? { linkedinText: "", extra: "", updatedAt: "" });
}

// Modtager formdata: valgfri "file" (LinkedIn-PDF), "linkedinText" og "extra"
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  let linkedinText = String(form.get("linkedinText") ?? "");

  if (file instanceof File && file.size > 0) {
    const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
    const { text } = await extractText(pdf, { mergePages: true });
    linkedinText = text.trim();
  }

  const profile: Profile = {
    linkedinText,
    extra: String(form.get("extra") ?? ""),
    updatedAt: new Date().toISOString(),
  };
  await writeJson(PROFILE_FILE, profile);
  return Response.json(profile);
}
