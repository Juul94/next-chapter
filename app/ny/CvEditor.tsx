"use client";

import { useState } from "react";
import type { Cv } from "@/lib/storage";

type Props = { cv: Cv; onChange: (cv: Cv) => void };

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const parts = (l: string, sep: string | RegExp, n: number) => {
  const xs = l.split(sep).map((x) => x.trim());
  return [...xs.slice(0, n - 1), xs.slice(n - 1).join(" ")].concat(Array(n).fill("")).slice(0, n);
};

// Redigerer CV'et som almindelig tekst. Én linje = ét punkt. Nulstilles (via key), når et nyt CV bliver lavet.
export default function CvEditor({ cv, onChange }: Props) {
  const set = (patch: Partial<Cv>) => onChange({ ...cv, ...patch });
  const setJob = (i: number, patch: Partial<Cv["experience"][number]>) =>
    set({ experience: cv.experience.map((j, k) => (k === i ? { ...j, ...patch } : j)) });

  return (
    <div className="space-y-5">
      <div>
        <label className="label">Titel</label>
        <input className="input" value={cv.headline} onChange={(e) => set({ headline: e.target.value })} />
      </div>
      <div>
        <label className="label">Profil</label>
        <textarea className="input h-28 leading-relaxed" value={cv.profile} onChange={(e) => set({ profile: e.target.value })} />
      </div>

      <TextField
        label="Kompetencer"
        hint="Én gruppe pr. linje: Gruppe: a, b, c"
        initial={cv.skills.map((g) => `${g.group}: ${g.items.join(", ")}`).join("\n")}
        onChange={(t) =>
          set({
            skills: lines(t).map((l) => {
              const [group, items] = l.includes(":") ? parts(l, ":", 2) : ["", l];
              return { group, items: items.split(",").map((x) => x.trim()).filter(Boolean) };
            }),
          })
        }
      />

      <div className="space-y-3">
        <label className="label">Erfaring</label>
        {cv.experience.map((j, i) => (
          <div key={`${i}-${cv.experience.length}`} className="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-4">
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_8rem_auto]">
              <input className="input" value={j.title} placeholder="Titel" onChange={(e) => setJob(i, { title: e.target.value })} />
              <input className="input" value={j.company} placeholder="Virksomhed" onChange={(e) => setJob(i, { company: e.target.value })} />
              <input className="input" value={j.period} placeholder="Periode" onChange={(e) => setJob(i, { period: e.target.value })} />
              <button
                className="icon-btn text-lg hover:text-danger"
                aria-label="Fjern job"
                onClick={() => set({ experience: cv.experience.filter((_, k) => k !== i) })}
              >
                ×
              </button>
            </div>
            <TextField initial={j.bullets.join("\n")} hint="Ét punkt pr. linje" onChange={(t) => setJob(i, { bullets: lines(t) })} />
          </div>
        ))}
      </div>

      <TextField
        label="Projekter"
        hint="Navn – kort beskrivelse"
        initial={cv.projects.map((p) => [p.name, p.description].filter(Boolean).join(" – ")).join("\n")}
        onChange={(t) =>
          set({ projects: lines(t).map((l) => { const [name, description] = parts(l, /\s[–-]\s/, 2); return { name, description }; }) })
        }
      />
      <TextField
        label="Uddannelse"
        hint="Titel | Sted | Periode"
        initial={cv.education.map((e) => [e.title, e.place, e.period].join(" | ")).join("\n")}
        onChange={(t) =>
          set({ education: lines(t).map((l) => { const [title, place, period] = parts(l, "|", 3); return { title, place, period }; }) })
        }
      />
      <TextField
        label="Sprog"
        hint="Sprog | Niveau | prikker 0–5"
        initial={cv.languages.map((l) => [l.name, l.level, l.dots].join(" | ")).join("\n")}
        onChange={(t) =>
          set({
            languages: lines(t).map((l) => {
              const [name, level, dots] = parts(l, "|", 3);
              return { name, level, dots: Number(dots) || 0 };
            }),
          })
        }
      />
      <TextField
        label="Uden for skærmen"
        hint="Interesser, adskilt med komma"
        rows={1}
        initial={cv.interests.join(", ")}
        onChange={(t) => set({ interests: t.split(",").map((x) => x.trim()).filter(Boolean) })}
      />
    </div>
  );
}

type TextFieldProps = { label?: string; hint: string; initial: string; rows?: number; onChange: (text: string) => void };

// Beholder sin egen tekst, så komma og tomme linjer ikke forsvinder, mens man skriver
function TextField({ label, hint, initial, rows = 4, onChange }: TextFieldProps) {
  const [text, setText] = useState(initial);
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <textarea
        className="input leading-relaxed"
        rows={rows}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value);
        }}
      />
      <p className="hint">{hint}</p>
    </div>
  );
}
