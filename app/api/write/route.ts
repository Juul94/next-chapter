import { getProfileForAI, languageName, loadPrompt, streamText } from "@/lib/ai";
import type { Job, Language } from "@/lib/storage";

// Hurtig-justeringer. "Prøv igen" sender ingen instruks og skriver en ny version.
const INSTRUCTIONS = {
  shorter: "Gør ansøgningen ca. 25 % kortere. Behold de stærkeste eksempler, og skær fyld væk.",
  personal: "Gør den mere personlig: vis ægte motivation, og forklar, hvorfor netop denne virksomhed og stilling. Stadig konkret.",
  technical: "Gør den mere teknisk: nævn konkrete teknologier, metoder og værktøjer, men KUN dem, der står i profilen.",
};

type Body = {
  job: Job;
  language: Language;
  instruction?: keyof typeof INSTRUCTIONS;
  heading?: string;
  body?: string;
};

export async function POST(req: Request) {
  const { job, language, instruction, heading, body } = (await req.json()) as Body;

  const profile = await getProfileForAI();
  if (!profile) return Response.json({ error: "Udfyld din profil først." }, { status: 400 });

  const vars = { LANGUAGE: languageName(language), JOB: JSON.stringify(job, null, 2), PROFILE: profile };
  const prompt = instruction
    ? await loadPrompt("revise", { ...vars, INSTRUCTION: INSTRUCTIONS[instruction], LETTER: `${heading}\n\n${body}` })
    : await loadPrompt("write", vars);

  return new Response(streamText(prompt), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
