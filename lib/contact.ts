// Kontaktoplysninger fra .env. Bruges kun i PDF'en – aldrig i prompts.

export function getContact() {
  const env = process.env;
  return {
    name: env.NAME ?? "",
    address: env.ADDRESS ?? "",
    zip: env.ZIP ?? "",
    city: env.CITY ?? "",
    phone: env.PHONE ?? "",
    email: env.EMAIL ?? "",
    website: env.WEBSITE ?? "",
    linkedin: env.LINKEDIN_URL ?? "",
  };
}

// Sikkerhedsnet: fjerner kontaktoplysninger, hvis de fx står i LinkedIn-PDF'en,
// før tekst sendes til modellen.
export function redactContact(text: string) {
  const values = Object.values(getContact()).filter((v) => v.trim().length > 2);
  let out = text;
  for (const v of values) {
    out = out.replace(new RegExp(escapeRegExp(v.trim()), "gi"), "[skjult]");
  }
  return out.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[skjult]");
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
