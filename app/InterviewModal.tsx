"use client";

import { useEffect, useRef, useState } from "react";
import type { Application, Interview } from "@/lib/storage";
import { formatDate, postJson } from "./helpers";
import Modal from "./Modal";

type Props = { app: Application; onClose: () => void };

export default function InterviewModal({ app, onClose }: Props) {
  const [result, setResult] = useState<Interview | null>(app.interview ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const started = useRef(false);

  async function generate() {
    setBusy(true);
    setError("");
    try {
      setResult(await (await postJson("/api/interview", { id: app.id })).json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Generér første gang (ref'en forhindrer dobbeltkald i dev)
  useEffect(() => {
    if (started.current || app.interview) return;
    started.current = true;
    generate();
  }, []);

  return (
    <Modal title={`Samtaleforberedelse – ${app.job.title}, ${app.job.company}`} onClose={onClose} wide>
      {busy && <p className="text-sm text-gray-600">Forbereder samtalen … (det tager lidt tid)</p>}
      {error && <p className="error mb-4">{error}</p>}

      {result && !busy && (
        <div className="space-y-3">
          <Section title={`Sandsynlige spørgsmål (${result.questions.length})`} open>
            <ol className="list-decimal space-y-3 pl-5">
              {result.questions.map((q, i) => (
                <li key={i}>
                  <p className="font-medium">{q.question}</p>
                  <p className="mt-1 text-gray-700">{q.answer}</p>
                </li>
              ))}
            </ol>
          </Section>
          <Section title="Spørgsmål du kan stille">
            <List items={result.askThem} />
          </Section>
          <Section title="Husk om virksomheden">
            <List items={result.companyNotes} />
          </Section>
          <p className="text-xs text-gray-600">Genereret {formatDate(result.generatedAt)}</p>
        </div>
      )}

      {!busy && (
        <button className="btn-secondary mt-4" onClick={generate}>
          Generér igen
        </button>
      )}
    </Modal>
  );
}

function Section({ title, open, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className="rounded-md border border-gray-200 p-4 text-sm">
      <summary className="cursor-pointer rounded-sm font-medium focus-visible:outline-2 focus-visible:outline-primary">{title}</summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-gray-700">
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  );
}
