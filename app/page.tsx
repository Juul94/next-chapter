"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Application, Status } from "@/lib/storage";
import FollowUpModal from "./FollowUpModal";
import { downloadPdf, formatDate, isOverdue, postJson, saveApplication } from "./helpers";
import { ChatIcon, CheckIcon, ChevronDownIcon, DownloadIcon, EditIcon, FilesIcon, MailIcon, RefreshIcon, TrashIcon } from "./icons";
import InterviewModal from "./InterviewModal";
import KebabMenu from "./KebabMenu";
import Modal from "./Modal";

type Open = { kind: "followup" | "interview" | "delete"; app: Application } | null;

export default function Overview() {
  const [apps, setApps] = useState<Application[] | null>(null);
  const [open, setOpen] = useState<Open>(null);
  const [error, setError] = useState("");
  const [cvBusy, setCvBusy] = useState<string | null>(null); // id på den ansøgning, der er ved at få et CV

  const load = () => fetch("/api/applications").then((r) => r.json()).then(setApps);
  useEffect(() => {
    load();
  }, []);

  function close() {
    setOpen(null);
    load();
  }

  async function download(id: string, kind: "letter" | "cv" | "both" = "letter") {
    setError("");
    try {
      await downloadPdf(id, kind);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // Laver (eller erstatter) CV'et direkte fra oversigten
  async function generateCv(app: Application) {
    if (app.cv && !confirm("Erstat det nuværende CV? Dine rettelser i det går tabt.")) return;
    setError("");
    setCvBusy(app.id);
    try {
      await postJson("/api/cv", { id: app.id });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCvBusy(null);
    }
  }

  // Opdaterer listen med det samme og gemmer i baggrunden
  async function setStatus(id: string, status: Status) {
    setApps((list) => list?.map((a) => (a.id === id ? { ...a, status } : a)) ?? null);
    const res = await saveApplication(id, { status });
    if (!res.ok) setError("Kunne ikke gemme status.");
  }

  async function remove(id: string) {
    await fetch(`/api/applications/${id}`, { method: "DELETE" });
    close();
  }

  if (!apps) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <header>
          <h1 className="page-title">Oversigt</h1>
          <p className="page-sub">{apps.length} {apps.length === 1 ? "ansøgning" : "ansøgninger"}</p>
        </header>
        <Link href="/ny" className="btn">
          Ny ansøgning
        </Link>
      </div>

      {apps.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-gray-700">Ingen ansøgninger endnu.</p>
          <Link href="/ny" className="btn-secondary">
            Skriv den første
          </Link>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 font-mono text-xs uppercase tracking-wider text-gray-600">
              <tr>
                <th className="px-5 py-3.5 font-medium">Virksomhed</th>
                <th className="px-5 py-3.5 font-medium">Stilling</th>
                <th className="px-5 py-3.5 font-medium">Status</th>
                <th className="px-5 py-3.5 font-medium">Sprog</th>
                <th className="px-5 py-3.5 font-medium">Oprettet</th>
                <th className="px-5 py-3.5 font-medium">Frist</th>
                <th className="px-5 py-3.5 font-medium">CV</th>
                <th className="px-5 py-3.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3.5 font-medium text-ink">{app.job.company}</td>
                  <td className="px-5 py-3.5 text-gray-700">
                    {/^https?:\/\//.test(app.url) ? (
                      <a
                        href={app.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-sm text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                        title="Åbn jobopslaget"
                      >
                        {app.job.title}
                      </a>
                    ) : (
                      app.job.title
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusSelect app={app} onChange={(status) => setStatus(app.id, status)} />
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="rounded-sm bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-medium uppercase text-gray-700">{app.language}</span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{formatDate(app.createdAt)}</td>
                  <td className="px-5 py-3.5">
                    <Deadline app={app} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      {cvBusy === app.id ? (
                        <span className="text-xs text-gray-600">Laver CV …</span>
                      ) : app.cv ? (
                        <>
                          <Link
                            href={`/ny?id=${app.id}&step=cv`}
                            className="rounded-sm bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-primary"
                            title="Se og ret CV"
                          >
                            CV ✓
                          </Link>
                          <button className="icon-btn" title="Download CV" aria-label="Download CV" onClick={() => download(app.id, "cv")}>
                            <DownloadIcon />
                          </button>
                          <button className="icon-btn" title="Generér nyt CV" aria-label="Generér nyt CV" onClick={() => generateCv(app)} disabled={!!cvBusy}>
                            <RefreshIcon />
                          </button>
                        </>
                      ) : (
                        <button
                          className="min-h-9 rounded-md border border-gray-300 px-3 text-xs font-medium text-ink hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
                          onClick={() => generateCv(app)}
                          disabled={!!cvBusy}
                        >
                          Generér CV
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end">
                      <KebabMenu
                        label={`Handlinger for ${app.job.title}`}
                        items={[
                          { label: "Rediger", icon: <EditIcon />, href: `/ny?id=${app.id}` },
                          { label: "Download ansøgning", icon: <DownloadIcon />, onClick: () => download(app.id) },
                          {
                            label: "Sammensæt ansøgning & CV til én PDF",
                            icon: <FilesIcon />,
                            onClick: () => download(app.id, "both"),
                            disabled: !app.cv,
                            title: app.cv ? "Ansøgningen først, derefter CV'et – i én fil" : "Generér et CV først",
                          },
                          { label: "Følgemail", icon: <MailIcon />, onClick: () => setOpen({ kind: "followup", app }) },
                          { label: "Samtaleforberedelse", icon: <ChatIcon />, onClick: () => setOpen({ kind: "interview", app }) },
                          { label: "Slet", icon: <TrashIcon />, onClick: () => setOpen({ kind: "delete", app }), danger: true },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {open?.kind === "followup" && <FollowUpModal app={open.app} onClose={close} />}
      {open?.kind === "interview" && <InterviewModal app={open.app} onClose={close} />}
      {open?.kind === "delete" && (
        <Modal title="Slet ansøgning" onClose={close}>
          <p className="text-sm">
            Slet ansøgningen til <strong>{open.app.job.title}</strong> hos <strong>{open.app.job.company}</strong>? PDF&apos;en
            i /output slettes også.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button className="btn-secondary" onClick={close}>
              Annullér
            </button>
            <button className="btn bg-red-600 hover:bg-red-700" onClick={() => remove(open.app.id)}>
              Slet
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Rød når fristen er overskredet (tid til opfølgning). Neutral med flueben, når opfølgning er sendt.
function Deadline({ app }: { app: Application }) {
  const sentAt = app.followUp?.sentAt;
  const overdue = !sentAt && isOverdue(app.job.deadline);
  return (
    <span
      className={`inline-flex items-center gap-1 ${overdue ? "font-medium text-danger" : ""}`}
      title={overdue ? "Fristen er overskredet – tid til en opfølgning" : sentAt ? `Opfølgning sendt ${formatDate(sentAt)}` : undefined}
    >
      {formatDate(app.job.deadline) || "–"}
      {sentAt && <CheckIcon className="text-success" />}
    </span>
  );
}

const STATUSES: { value: Status; label: string; dot: string }[] = [
  { value: "kladde", label: "Kladde", dot: "bg-gray-500" },
  { value: "sendt", label: "Sendt", dot: "bg-primary" },
  { value: "test", label: "Test", dot: "bg-warning" },
  { value: "samtale", label: "Samtale", dot: "bg-warning" },
  { value: "tilbud", label: "Tilbud", dot: "bg-success" },
  { value: "afslag", label: "Afslag", dot: "bg-danger" },
];

// Status som dropdown direkte i listen. Uden status er ansøgningen en kladde.
function StatusSelect({ app, onChange }: { app: Application; onChange: (s: Status) => void }) {
  const current = STATUSES.find((s) => s.value === (app.status ?? "kladde"))!;
  return (
    <span className="relative inline-flex items-center">
      <span className={`pointer-events-none absolute left-2.5 size-2 rounded-full ${current.dot}`} aria-hidden="true" />
      <select
        value={current.value}
        onChange={(e) => onChange(e.target.value as Status)}
        aria-label={`Status for ${app.job.title}`}
        className="min-h-9 cursor-pointer appearance-none rounded-md border border-gray-300 bg-surface py-1 pr-7 pl-6 text-xs font-medium text-ink hover:border-gray-500 focus-visible:outline-2 focus-visible:outline-primary"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2.5 size-3 text-gray-600" />
    </span>
  );
}
