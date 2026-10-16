import { askJson, getProfileForAI, languageName, loadPrompt } from "@/lib/ai";
import { getApplication, updateApplication, type Cv } from "@/lib/storage";

const str = { type: "string" };
const list = { type: "array", items: str };
const obj = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const schema = obj({
  headline: str,
  profile: str,
  skills: { type: "array", items: obj({ group: str, items: list }) },
  experience: { type: "array", items: obj({ title: str, company: str, period: str, bullets: list }) },
  education: { type: "array", items: obj({ title: str, place: str, period: str }) },
  projects: { type: "array", items: obj({ name: str, description: str }) },
  languages: { type: "array", items: obj({ name: str, level: str, dots: { type: "integer" } }) },
  interests: list,
});

// Laver et CV, der matcher ansøgningen, og gemmer det på ansøgningen
export async function POST(req: Request) {
  const { id } = (await req.json()) as { id: string };
  const app = await getApplication(id);
  if (!app) return Response.json({ error: "Ansøgningen findes ikke." }, { status: 404 });

  const profile = await getProfileForAI();
  if (!profile) return Response.json({ error: "Udfyld din profil først." }, { status: 400 });

  try {
    const prompt = await loadPrompt("cv", {
      LANGUAGE: languageName(app.language),
      JOB: JSON.stringify(app.job, null, 2),
      LETTER: `${app.heading}\n\n${app.body}`,
      PROFILE: profile,
    });
    const cv = await askJson<Cv>(prompt, schema);
    await updateApplication(id, { cv });
    return Response.json(cv);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
