"use client";

import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [linkedinText, setLinkedinText] = useState("");
  const [extra, setExtra] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p) => {
        setLinkedinText(p.linkedinText);
        setExtra(p.extra);
        if (p.updatedAt) setStatus(`Sidst gemt ${new Date(p.updatedAt).toLocaleString("da-DK")}`);
      });
  }, []);

  async function save() {
    setSaving(true);
    const form = new FormData();
    if (file) form.append("file", file);
    form.append("linkedinText", linkedinText);
    form.append("extra", extra);
    const res = await fetch("/api/profile", { method: "POST", body: form });
    const p = await res.json();
    setLinkedinText(p.linkedinText);
    setFile(null);
    setSaving(false);
    setStatus(res.ok ? "Gemt ✓" : "Kunne ikke gemme");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="page-title">Profil</h1>
        <p className="page-sub">Det, modellen må skrive ud fra. Kontaktoplysninger fjernes, før noget sendes.</p>
      </header>

      <div className="card space-y-6">
      <Photo />

      <div>
        <label className="label">LinkedIn-profil (PDF)</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-gray-600 file:mr-4 file:min-h-11 file:cursor-pointer file:rounded-md file:border file:border-gray-300 file:bg-surface file:px-4 file:text-sm file:font-medium file:text-ink hover:file:bg-gray-50"
        />
        <p className="hint">
          LinkedIn → din profil → Mere → Gem som PDF. Teksten udtrækkes, når du gemmer.
        </p>
      </div>

      <div>
        <label className="label">Tekst fra LinkedIn</label>
        <textarea
          className="input h-64"
          value={linkedinText}
          onChange={(e) => setLinkedinText(e.target.value)}
          placeholder="Udfyldes automatisk fra PDF'en – kan rettes her."
        />
      </div>

      <div>
        <label className="label">Ekstra om mig</label>
        <textarea
          className="input h-48"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder="Projekter, styrker, hvad jeg søger …"
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? "Gemmer …" : "Gem profil"}
        </button>
        <span className="text-sm text-gray-600">{status}</span>
      </div>
      </div>
    </div>
  );
}

// Billede til ansøgning og CV (i stedet for initialerne). Beskæres til et kvadrat og skaleres ned i browseren.
function Photo() {
  const [version, setVersion] = useState(0); // 0 = ukendt, -1 = intet billede
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/profile/photo", { method: "HEAD" }).then((r) => setVersion(r.ok ? Date.now() : -1));
  }, []);

  async function upload(file: File) {
    setError("");
    try {
      const img = await createImageBitmap(file);
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = Math.min(600, side);
      canvas.getContext("2d")!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.9));
      const form = new FormData();
      form.append("file", blob!, "photo.jpg");
      const res = await fetch("/api/profile/photo", { method: "POST", body: form });
      if (!res.ok) throw new Error();
      setVersion(Date.now());
    } catch {
      setError("Billedet kunne ikke gemmes.");
    }
  }

  async function remove() {
    await fetch("/api/profile/photo", { method: "DELETE" });
    setVersion(-1);
  }

  return (
    <div>
      <label className="label">Billede</label>
      <div className="flex items-center gap-5">
        <div className="size-20 flex-none overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-200">
          {version > 0 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/profile/photo?v=${version}`} alt="" className="size-full object-cover" />
          )}
        </div>
        <div className="space-y-2">
          <div className="flex gap-2">
            <label className="btn-secondary cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary">
              {version > 0 ? "Skift billede" : "Upload billede"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) upload(f);
                }}
              />
            </label>
            {version > 0 && (
              <button className="btn-secondary" onClick={remove}>
                Fjern
              </button>
            )}
          </div>
          <p className={`text-xs ${error ? "text-danger" : "text-gray-500"}`}>
            {error || "Vises i ansøgning og CV i stedet for initialerne. Gemmes kun lokalt og sendes aldrig til AI'en."}
          </p>
        </div>
      </div>
    </div>
  );
}
