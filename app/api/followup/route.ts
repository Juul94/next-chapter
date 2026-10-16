import { askJson, languageName, loadPrompt } from "@/lib/ai";
import { getContact } from "@/lib/contact";
import { getApplication, updateApplication, type FollowUp } from "@/lib/storage";

const schema = {
  type: "object",
  properties: {
    subject: { type: "string" },
    body: { type: "string" },
  },
  required: ["subject", "body"],
  additionalProperties: false,
};

export async function POST(req: Request) {
  const { id } = (await req.json()) as { id: string };
  const app = await getApplication(id);
  if (!app) return Response.json({ error: "Ansøgningen findes ikke." }, { status: 404 });

  try {
    const prompt = await loadPrompt("followup", {
      LANGUAGE: languageName(app.language),
      JOB: JSON.stringify(app.job, null, 2),
      LETTER: `${app.heading}\n\n${app.body}`,
    });
    const mail = await askJson<{ subject: string; body: string }>(prompt, schema);

    // Hilsen og navn tilføjes lokalt – navnet sendes ikke til modellen
    const closing = app.language === "en" ? "Kind regards" : "Med venlig hilsen";
    const followUp: FollowUp = {
      to: app.job.contactEmail,
      subject: mail.subject,
      body: `${mail.body.trim()}\n\n${closing}\n${getContact().name}`,
      sentAt: app.followUp?.sentAt ?? "",
    };
    await updateApplication(id, { followUp });
    return Response.json(followUp);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
