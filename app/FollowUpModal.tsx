"use client";

import { useEffect, useRef, useState } from "react";
import type { Application, FollowUp } from "@/lib/storage";
import { formatDate, postJson, saveApplication } from "./helpers";
import Modal from "./Modal";

type Props = { app: Application; onClose: () => void };

export default function FollowUpModal({ app, onClose }: Props) {
  const [mail, setMail] = useState<FollowUp | null>(app.followUp ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  async function generate() {
    setBusy(true);
    setError("");
    try {
      setMail(await (await postJson("/api/followup", { id: app.id })).json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Skriv et udkast første gang modalen åbnes (ref'en forhindrer dobbeltkald i dev)
  useEffect(() => {
    if (started.current || app.followUp) return;
    started.current = true;
    generate();
  }, []);

  // Gem rettelser løbende
  useEffect(() => {
    if (!mail) return;
    const t = setTimeout(() => saveApplication(app.id, { followUp: mail }), 800);
    return () => clearTimeout(t);
  }, [mail, app.id]);

  async function close() {
    if (mail) await saveApplication(app.id, { followUp: mail });
    onClose();
  }

  const set = (patch: Partial<FollowUp>) => mail && setMail({ ...mail, ...patch });

  async function copy() {
    if (!mail) return;
    await navigator.clipboard.writeText(mail.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const mailto = mail
    ? `mailto:${mail.to}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`
    : "";

  return (
    <Modal title={`Følgemail – ${app.job.company}`} onClose={close} wide>
      {busy && <p className="text-sm text-gray-600">Skriver mail …</p>}
      {error && <p className="error mb-4">{error}</p>}

      {mail && !busy && (
        <div className="space-y-4">
          <div>
            <label className="label">Til</label>
            <input className="input" value={mail.to} onChange={(e) => set({ to: e.target.value })} placeholder="kontakt@firma.dk" />
          </div>
          <div>
            <label className="label">Emne</label>
            <input className="input" value={mail.subject} onChange={(e) => set({ subject: e.target.value })} />
          </div>
          <div>
            <label className="label">Besked</label>
            <textarea className="input h-64 leading-relaxed" value={mail.body} onChange={(e) => set({ body: e.target.value })} />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a className="btn" href={mailto}>
              Åbn i mail
            </a>
            <button className="btn-secondary" onClick={copy}>
              {copied ? "Kopieret ✓" : "Kopiér"}
            </button>
            <button
              className="btn-secondary"
              onClick={() => set({ sentAt: mail.sentAt ? "" : new Date().toISOString() })}
            >
              {mail.sentAt ? "Fortryd sendt" : "Markér som sendt"}
            </button>
            <button className="btn-secondary" onClick={generate}>
              Generér igen
            </button>
            {mail.sentAt && <span className="text-sm font-medium text-green-700">Sendt {formatDate(mail.sentAt)} ✓</span>}
          </div>
        </div>
      )}

      {!mail && !busy && error && (
        <button className="btn-secondary" onClick={generate}>
          Prøv igen
        </button>
      )}
    </Modal>
  );
}
