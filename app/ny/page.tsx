"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import type { Application, Cv, Job, Language } from "@/lib/storage";
import { downloadPdf, postJson, saveApplication } from "../helpers";
import CvEditor from "./CvEditor";
import Preview, { A4_H } from "./Preview";

type Instruction = "shorter" | "personal" | "technical";
type Step = "form" | "letter" | "cv";

export default function NewApplicationPage() {
  return (
    <Suspense>
      <EditorFromUrl />
    </Suspense>
  );
}

// ?id=… åbner en gemt ansøgning, &step=cv går direkte til CV-trinnet. key'en nulstiller editoren, når id'et skifter.
function EditorFromUrl() {
  const params = useSearchParams();
  const id = params.get("id");
  return <Editor key={id ?? "new"} initialId={id} initialStep={params.get("step") === "cv" ? "cv" : undefined} />;
}

const deriveRecipient = (j: Job) =>
  [j.company, j.contactPerson && `Att.: ${j.contactPerson}`].filter(Boolean).join("\n");

function Editor({ initialId, initialStep }: { initialId: string | null; initialStep?: Step }) {
  const [id, setId] = useState<string | null>(initialId);
  const [adText, setAdText] = useState("");
  const [url, setUrl] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [language, setLanguage] = useState<Language | "">("");
  const [showPaste, setShowPaste] = useState(false); // tekstfeltet er kun en nødløsning, hvis linket ikke kan læses
  const [step, setStep] = useState<Step>(initialId ? (initialStep ?? "letter") : "form");
  const [cv, setCv] = useState<Cv | null>(null);
  const [cvVersion, setCvVersion] = useState(0); // nulstiller CV-editoren, når et nyt CV bliver lavet
  const [cvPages, setCvPages] = useState(1);

  const [recipient, setRecipient] = useState("");
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");

  const [busy, setBusy] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [tooLong, setTooLong] = useState(false);
  const [copied, setCopied] = useState(false);

  // Hent gemt ansøgning
  useEffect(() => {
    if (!initialId) return;
    fetch(`/api/applications/${initialId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Ansøgningen findes ikke."))))
      .then((a: Application) => {
        setAdText(a.adText);
        setUrl(a.url);
        if (!a.url) setShowPaste(true);
        setJob(a.job);
        setLanguage(a.language);
        setRecipient(a.recipient);
        setHeading(a.heading);
        setBody(a.body);
        setCv(a.cv ?? null);
      })
      .catch((e) => setError(e.message));
  }, [initialId]);

  // Autogem, når der findes et id (ikke mens teksten streames)
  useEffect(() => {
    if (!id || !job || !language || streaming) return;
    const t = setTimeout(() => saveApplication(id, { adText, url, language, job, recipient, heading, body, cv: cv ?? undefined }), 800);
    return () => clearTimeout(t);
  }, [id, adText, url, language, job, recipient, heading, body, cv, streaming]);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  // Trin 1
  const extract = () =>
    run("Finder annoncen …", async () => {
      let res: Response;
      try {
        res = await postJson("/api/extract", { url, adText: showPaste ? adText : "" });
      } catch (e) {
        if (!showPaste) setShowPaste(true);
        throw new Error(showPaste ? (e as Error).message : `${(e as Error).message} Indsæt annoncens tekst i stedet.`);
      }
      const { job: j, adText: text }: { job: Job; adText: string } = await res.json();
      setAdText(text);
      setJob(j);
      setLanguage(j.adLanguage);
      setRecipient(deriveRecipient(j));
      setHeading("");
      setBody("");
      if (!initialId) setId(null);
    });

  function updateJob(patch: Partial<Job>) {
    if (!job) return;
    const next = { ...job, ...patch };
    setJob(next);
    if (!body) setRecipient(deriveRecipient(next));
  }

  // Trin 2 + hurtig-justeringer. Teksten streames ind: første linje er overskriften.
  const write = (instruction?: Instruction) =>
    run(instruction ? "Justerer …" : "Skriver ansøgning …", async () => {
      if (!job || !language) return;
      const before = { heading, body };
      setStreaming(true);
      setStep("letter");
      // Fremskridt er et skøn: kryber op til 10 %, mens modellen tænker, og følger derefter tekstens længde
      const expected = Math.max(before.heading.length + before.body.length, 2200);
      setProgress(1);
      const wait = setInterval(() => setProgress((p) => Math.min(10, (p ?? 1) + 1)), 500);
      try {
        const res = await postJson("/api/write", { job, language, instruction, heading, body });
        const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
        let text = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          text += value;
          clearInterval(wait);
          setProgress((p) => Math.max(p ?? 1, Math.min(99, 10 + Math.round((89 * text.length) / expected))));
          const nl = text.indexOf("\n");
          setHeading(nl === -1 ? text : text.slice(0, nl).trim());
          setBody(nl === -1 ? "" : text.slice(nl + 1).trim());
        }
        const nl = text.indexOf("\n");
        const letter = { heading: text.slice(0, nl).trim(), body: text.slice(nl + 1).trim() };
        if (!id) {
          const app: Application = await (
            await postJson("/api/applications", { adText, url, language, job, recipient, ...letter })
          ).json();
          setId(app.id);
        }
        setProgress(100);
        setTimeout(() => setProgress(null), 800);
      } catch (e) {
        setProgress(null);
        setHeading(before.heading);
        setBody(before.body);
        if (!before.heading && !before.body) setStep("form");
        throw e;
      } finally {
        clearInterval(wait);
        setStreaming(false);
      }
    });

  const download = () =>
    run("Laver PDF …", async () => {
      if (!id || !language || !job) return;
      await saveApplication(id, { adText, url, language, job, recipient, heading, body });
      await downloadPdf(id);
    });

  // Trin 3 (valgfrit): CV, der matcher ansøgningen. Svaret kommer i ét stykke, så fremskridtet er et skøn ud fra tiden.
  const writeCv = () =>
    run("Laver CV …", async () => {
      if (!id || !language || !job) return;
      await saveApplication(id, { adText, url, language, job, recipient, heading, body });
      setProgress(1);
      const tick = setInterval(() => setProgress((p) => Math.min(95, (p ?? 1) + Math.max(1, Math.round((95 - (p ?? 1)) / 20)))), 600);
      try {
        const next: Cv = await (await postJson("/api/cv", { id })).json();
        setCv(next);
        setCvVersion((v) => v + 1);
        setProgress(100);
        setTimeout(() => setProgress(null), 800);
      } catch (e) {
        setProgress(null);
        throw e;
      } finally {
        clearInterval(tick);
      }
    });

  const downloadCv = () =>
    run("Laver PDF …", async () => {
      if (!id || !cv) return;
      await saveApplication(id, { cv });
      await downloadPdf(id, "cv");
    });

  async function copy() {
    await navigator.clipboard.writeText(`${heading}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  const hasLetter = !!(heading || body);

  const progressCard = progress !== null && (
    <div className="card space-y-2.5 py-4" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
      <div className="flex justify-between text-sm">
        <span className="text-gray-700">{progress === 100 ? "Færdig ✓" : busy}</span>
        <span className="tabular-nums text-gray-600">{progress} %</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {step === "form" && (
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="page-title">{initialId ? "Rediger ansøgning" : "Ny ansøgning"}</h1>
          <p className="page-sub">Indsæt linket, tjek detaljerne, og lad modellen skrive et udkast.</p>
        </header>

        <section className="card space-y-5">
          <h2 className="flex items-center gap-3 font-display text-xl font-semibold">
            <span className="step">1</span> Jobannoncen
          </h2>
          <div>
            <label className="label">Annoncens URL</label>
            <input
              className="input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              autoFocus
            />
          </div>
          {showPaste ? (
            <div>
              <label className="label">Jobannonce</label>
              <textarea
                className="input h-56"
                value={adText}
                onChange={(e) => setAdText(e.target.value)}
                placeholder="Kopiér annoncens tekst og indsæt den her."
              />
            </div>
          ) : (
            <button className="min-h-11 text-sm text-primary-strong underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary" onClick={() => setShowPaste(true)}>
              Intet link? Indsæt annoncens tekst i stedet
            </button>
          )}
          <div>
            <button className="btn" onClick={extract} disabled={!!busy || !(url.trim() || (showPaste && adText.trim()))}>
              Find annoncen
            </button>
          </div>
        </section>

        {job && (
          <section className="card space-y-5">
            <h2 className="flex items-center gap-3 font-display text-xl font-semibold">
              <span className="step">2</span> Detaljer og sprog
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Virksomhed" value={job.company} onChange={(v) => updateJob({ company: v })} />
              <Field label="Stilling" value={job.title} onChange={(v) => updateJob({ title: v })} />
              <Field label="Kontaktperson" value={job.contactPerson} onChange={(v) => updateJob({ contactPerson: v })} />
              <Field label="Kontakt-email" value={job.contactEmail} onChange={(v) => updateJob({ contactEmail: v })} />
              <Field
                label="Ansøgningsfrist"
                value={job.deadline}
                onChange={(v) => updateJob({ deadline: v })}
                placeholder="ÅÅÅÅ-MM-DD, løbende eller tom"
              />
              <Field label="Sted" value={job.location} onChange={(v) => updateJob({ location: v })} />
            </div>
            <p className="text-sm leading-relaxed text-gray-600">{job.summary}</p>

            <div className="flex flex-wrap items-center gap-4 border-t border-gray-200 pt-6">
              <div className="flex gap-1 rounded-md border border-gray-300 p-1 text-sm" role="radiogroup" aria-label="Sprog">
                {(["da", "en"] as const).map((l) => (
                  <button
                    key={l}
                    role="radio"
                    aria-checked={language === l}
                    onClick={() => setLanguage(l)}
                    className={`min-h-9 rounded-sm px-3 focus-visible:outline-2 focus-visible:outline-primary ${
                      language === l ? "bg-primary-strong text-white" : "text-gray-600 hover:bg-hover hover:text-ink"
                    }`}
                  >
                    {l === "da" ? "Dansk" : "Engelsk"}
                    {job.adLanguage === l && <span className="ml-1 text-xs opacity-75">(foreslået)</span>}
                  </button>
                ))}
              </div>
              <button className="btn" onClick={() => write()} disabled={!!busy || !language}>
                Generér ansøgning
              </button>
              {hasLetter && (
                <button className="btn-secondary ml-auto" onClick={() => setStep("letter")} disabled={!!busy}>
                  Til ansøgningen →
                </button>
              )}
            </div>
          </section>
        )}
      </div>
      )}

      {step === "letter" && job && language && (
        <>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="page-title">{job.title || "Ansøgning"}</h1>
            <p className="page-sub">{job.company}</p>
          </div>
          <button className="btn-secondary" onClick={() => setStep("form")} disabled={streaming}>
            ← Annonce og detaljer
          </button>
        </header>
        {progressCard}
        <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="card space-y-5">
            <div>
              <label className="label">Modtager</label>
              <textarea className="input h-16" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
            </div>
            <div>
              <label className="label">Overskrift</label>
              <input className="input" value={heading} readOnly={streaming} placeholder={streaming ? "Modellen tænker …" : ""} onChange={(e) => setHeading(e.target.value)} />
            </div>
            <div>
              <label className="label">Ansøgning</label>
              <textarea
                className="input h-[32rem] leading-relaxed"
                value={body}
                readOnly={streaming}
                placeholder={streaming ? "Teksten dukker op her, mens den bliver skrevet …" : ""}
                onChange={(e) => setBody(e.target.value)}
              />
              <p className={`mt-1 text-xs ${tooLong ? "font-medium text-danger" : "text-gray-600"}`}>
                {words} ord
                {tooLong && " – ansøgningen fylder mere end én A4-side. Prøv “Kortere”."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={() => write("shorter")} disabled={!!busy}>
                Kortere
              </button>
              <button className="btn-secondary" onClick={() => write("personal")} disabled={!!busy}>
                Mere personlig
              </button>
              <button className="btn-secondary" onClick={() => write("technical")} disabled={!!busy}>
                Mere teknisk
              </button>
              <button className="btn-secondary" onClick={() => write()} disabled={!!busy}>
                Prøv igen
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button className="btn" onClick={download} disabled={!!busy || !id}>
                Download PDF
              </button>
              <button className="btn-secondary" onClick={copy} disabled={streaming}>
                {copied ? "Kopieret ✓" : "Kopiér tekst"}
              </button>
              <button className="btn-secondary ml-auto" onClick={() => setStep("cv")} disabled={!!busy || !body}>
                Næste: CV →
              </button>
            </div>
          </div>

          <div className="lg:sticky lg:top-4">
            <Preview data={{ kind: "letter", language, recipient, heading, body }} onMeasure={(h) => setTooLong(h > A4_H + 2)} />
          </div>
        </section>
        </>
      )}

      {step === "cv" && job && language && (
        <>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="page-title">CV til {job.company || "ansøgningen"}</h1>
            <p className="page-sub">Valgfrit trin. Et CV, der matcher ansøgningen – samme design, samme fokus.</p>
          </div>
          <button className="btn-secondary" onClick={() => setStep("letter")} disabled={!!busy}>
            ← Ansøgning
          </button>
        </header>
        {progressCard}
        {!cv ? (
          <section className="card max-w-2xl space-y-4">
            <p className="text-sm leading-relaxed text-gray-600">
              Modellen vælger og prioriterer fra din profil, så CV&apos;et passer til stillingen og ansøgningen. Den finder ikke på noget nyt.
            </p>
            <div className="flex flex-wrap gap-3">
              <button className="btn" onClick={writeCv} disabled={!!busy}>
                Generér CV
              </button>
              <Link href="/" className="btn-secondary">
                Spring over
              </Link>
            </div>
          </section>
        ) : (
          <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <div className="card space-y-5">
              <CvEditor key={cvVersion} cv={cv} onChange={setCv} />
              <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-6">
                <button className="btn" onClick={downloadCv} disabled={!!busy || !id}>
                  Download CV
                </button>
                <button className="btn-secondary" onClick={writeCv} disabled={!!busy}>
                  Prøv igen
                </button>
                <Link href="/" className="btn-secondary ml-auto">
                  Færdig
                </Link>
              </div>
            </div>

            <div className="space-y-2 lg:sticky lg:top-4">
              <Preview data={{ kind: "cv", language, cv }} onMeasure={(h) => setCvPages(Math.max(1, Math.ceil((h - 2) / A4_H)))} />
              <p className={`text-xs ${cvPages > 2 ? "font-medium text-danger" : "text-gray-600"}`}>
                Ca. {cvPages} {cvPages === 1 ? "side" : "sider"}
                {cvPages > 2 && " – overvej at fjerne et job eller nogle punkter."}
              </p>
            </div>
          </section>
        )}
        </>
      )}

      {busy && progress === null && <p className="text-sm text-gray-600">{busy}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

type FieldProps = { label: string; value: string; onChange: (v: string) => void; placeholder?: string };

function Field({ label, value, onChange, placeholder }: FieldProps) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
