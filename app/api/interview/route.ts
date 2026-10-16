import { askJson, getProfileForAI, languageName, loadPrompt } from "@/lib/ai";
import { getApplication, updateApplication, type Interview } from "@/lib/storage";

const list = { type: "array", items: { type: "string" } };
const schema = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: { question: { type: "string" }, answer: { type: "string" } },
        required: ["question", "answer"],
        additionalProperties: false,
      },
    },
    askThem: list,
    companyNotes: list,
  },
  required: ["questions", "askThem", "companyNotes"],
  additionalProperties: false,
};

export async function POST(req: Request) {
  const { id } = (await req.json()) as { id: string };
  const app = await getApplication(id);
  if (!app) return Response.json({ error: "Ansøgningen findes ikke." }, { status: 404 });

  const profile = await getProfileForAI();
  if (!profile) return Response.json({ error: "Udfyld din profil først." }, { status: 400 });

  try {
    const prompt = await loadPrompt("interview", {
      LANGUAGE: languageName(app.language),
      AD: app.adText || JSON.stringify(app.job, null, 2),
      PROFILE: profile,
      LETTER: `${app.heading}\n\n${app.body}`,
    });
    const result = await askJson<Omit<Interview, "generatedAt">>(prompt, schema);
    const interview: Interview = { ...result, generatedAt: new Date().toISOString() };
    await updateApplication(id, { interview });
    return Response.json(interview);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
