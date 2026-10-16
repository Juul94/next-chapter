import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs/promises";
import path from "node:path";
import { redactContact } from "./contact";
import { getProfile, type Language } from "./storage";

const client = new Anthropic(); // læser ANTHROPIC_API_KEY
const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const betas = ["server-side-fallback-2026-07-01"];

export function languageName(language: Language) {
  return language === "en" ? "engelsk" : "dansk";
}

// Profilen uden kontaktoplysninger. Det er det eneste, modellen får at vide om mig.
export async function getProfileForAI() {
  const p = await getProfile();
  if (!p?.linkedinText && !p?.extra) return null;
  return redactContact(`${p.linkedinText}\n\nEkstra om mig:\n${p.extra}`);
}

// Læser /prompts/<name>.txt og udfylder {{NØGLER}}
export async function loadPrompt(name: string, vars: Record<string, string>) {
  let text = await fs.readFile(path.join(process.cwd(), "prompts", `${name}.txt`), "utf8");
  for (const [key, value] of Object.entries(vars)) {
    text = text.replaceAll(`{{${key}}}`, value);
  }
  return text;
}

// Sender prompten og får JSON tilbage, der matcher schemaet
export async function askJson<T>(prompt: string, schema: Record<string, unknown>): Promise<T> {
  const res = await client.beta.messages.create({
    model,
    max_tokens: 16000,
    betas,
    fallbacks: "default",
    output_config: { format: { type: "json_schema", schema } },
    messages: [{ role: "user", content: prompt }],
  });


  if (res.stop_reason === "refusal") throw new Error("Modellen afviste forespørgslen.");
  if (res.stop_reason === "max_tokens") throw new Error("Svaret blev afkortet (max_tokens).");

  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("Tomt svar fra modellen.");
  return JSON.parse(block.text) as T;
}

// Streamer modellens tekst, mens den bliver skrevet
export function streamText(prompt: string) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = client.beta.messages.stream({
          model,
          max_tokens: 4000,
          betas,
          fallbacks: "default",
          messages: [{ role: "user", content: prompt }],
        });
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") throw new Error("Modellen afviste forespørgslen.");
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });
}
