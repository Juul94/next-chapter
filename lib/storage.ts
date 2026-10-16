import fs from "node:fs/promises";
import path from "node:path";

export const DATA_DIR = path.join(process.cwd(), "data");
export const OUTPUT_DIR = path.join(process.cwd(), "output");
const APPS_DIR = path.join(DATA_DIR, "applications");

export type Language = "da" | "en";

// Hvor langt ansøgningen er nået. Mangler feltet, er den en kladde (ikke sendt endnu).
export type Status = "kladde" | "sendt" | "test" | "samtale" | "tilbud" | "afslag";

export type Profile = {
  linkedinText: string;
  extra: string;
  updatedAt: string;
};

export type Job = {
  company: string;
  title: string;
  contactPerson: string;
  contactEmail: string;
  location: string;
  deadline: string; // ÅÅÅÅ-MM-DD, "løbende" eller tom
  adLanguage: Language;
  summary: string;
  requirements: string[];
  tasks: string[];
};

export type FollowUp = {
  to: string;
  subject: string;
  body: string;
  sentAt: string; // tom = ikke sendt
};

export type Interview = {
  questions: { question: string; answer: string }[];
  askThem: string[];
  companyNotes: string[];
  generatedAt: string;
};

export type Cv = {
  headline: string;
  profile: string;
  skills: { group: string; items: string[] }[];
  experience: { title: string; company: string; period: string; bullets: string[] }[];
  education: { title: string; place: string; period: string }[];
  projects: { name: string; description: string }[];
  languages: { name: string; level: string; dots: number }[];
  interests: string[];
};

export type Application = {
  id: string;
  createdAt: string;
  updatedAt: string;
  adText: string;
  url: string;
  language: Language;
  job: Job;
  recipient: string;
  heading: string;
  body: string;
  pdf?: string;
  followUp?: FollowUp;
  interview?: Interview;
  cv?: Cv;
  cvPdf?: string;
  combinedPdf?: string;
  status?: Status;
};

export async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

export async function writeJson(file: string, data: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

export const PROFILE_FILE = path.join(DATA_DIR, "profile.json");
export const PHOTO_FILE = path.join(DATA_DIR, "photo.jpg");

export function getProfile() {
  return readJson<Profile>(PROFILE_FILE);
}

// --- Ansøgninger: én JSON-fil pr. ansøgning i /data/applications ---

function appFile(id: string) {
  if (!/^[a-z0-9]+$/.test(id)) throw new Error("Ugyldigt id");
  return path.join(APPS_DIR, `${id}.json`);
}

export async function listApplications() {
  const files = (await fs.readdir(APPS_DIR).catch(() => [])).filter((f) => f.endsWith(".json"));
  const apps = await Promise.all(files.map((f) => readJson<Application>(path.join(APPS_DIR, f))));
  return apps.filter((a): a is Application => !!a?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getApplication(id: string) {
  return readJson<Application>(appFile(id));
}

export async function createApplication(data: Omit<Application, "id" | "createdAt" | "updatedAt">) {
  const now = new Date().toISOString();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const app: Application = { ...data, id, createdAt: now, updatedAt: now };
  await writeJson(appFile(id), app);
  return app;
}

export async function updateApplication(id: string, patch: Partial<Application>) {
  const app = await getApplication(id);
  if (!app) return null;
  const next: Application = { ...app, ...patch, id, createdAt: app.createdAt, updatedAt: new Date().toISOString() };
  await writeJson(appFile(id), next);
  return next;
}

export async function deleteApplication(id: string) {
  await fs.rm(appFile(id), { force: true });
}
