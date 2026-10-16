# Next Chapter

An AI-powered job application assistant that runs locally. Paste a job ad, and Next Chapter writes a cover letter that fits both the role and your background. It then renders the letter, and a matching CV, as print-ready A4 PDFs. It also keeps track of every application you send, from the first draft through the follow-up email to interview preparation.

> The interface and the default prompts are in Danish. The tool can write applications in both Danish and English.

## Why I built it

A good application takes time: you read the ad closely, choose which of your experiences fit, write a letter that doesn't sound like a template, adjust your CV to match, and then remember to follow up. I wanted one tool to handle the repetitive parts while I keep full control of the text. It also had to keep my personal details private.

## Features

- **Profile from LinkedIn**: upload your LinkedIn PDF export and add free-text notes about yourself. The text is extracted locally and becomes the basis for every application.
- **Job ad extraction**: paste a whole job ad page. The model returns structured data (company, title, contact person, email, location, deadline, requirements, tasks and the ad's language), and you can correct any field before generating.
- **Live-streamed cover letter** in Danish or English. The ad's language is suggested automatically. The prompt enforces a one-page limit, concrete examples tied to the job's requirements, no clichés, and a strict rule against inventing experience.
- **Editor and live PDF preview side by side**. A warning appears if the letter runs past one A4 page.
- **One-click revisions**: *Shorter*, *More personal*, *More technical* and *Try again*.
- **Tailored CV**: an optional step that generates a CV matched to the job and the letter, in the same visual design. Every field can be edited.
- **Application overview**: all applications with deadlines, status (draft, sent, test, interview, offer, rejected) and overdue highlighting.
- **Follow-up email**: a draft you can edit, open in your mail client and mark as sent.
- **Interview preparation**: likely questions with suggested answers based on your profile, questions you can ask them, and notes about the company.
- **Consistent PDF branding**: the letter and the CV share a layout, an accent color (configurable) and an optional profile photo or initials.

## Privacy by design

Personal data stays on your machine and away from the model whenever possible:

- Contact details (name, address, phone, email, website, LinkedIn) live only in `.env` and are inserted into the PDF at render time. **They are never sent to the AI model.**
- As a safety net, `redactContact()` removes those values and any email address from the profile text before it is included in a prompt, even if they appear in the LinkedIn PDF.
- The profile photo is embedded directly into the PDF as a data URI and never leaves the machine.
- All data (profile, applications, generated PDFs) is stored as plain files in `data/` and `output/`, which are gitignored. There is no database and no cloud storage.
- The dev server binds to `127.0.0.1` only.

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, Route Handlers), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4, light/dark theme |
| AI | Anthropic Claude via `@anthropic-ai/sdk`: structured JSON output with JSON Schema, and streaming text |
| PDF rendering | Playwright (headless Chromium) prints HTML/CSS templates to A4 |
| PDF tools | `unpdf` (text extraction from LinkedIn PDF), `pdf-lib` (merging letter + CV, page counting) |
| Storage | JSON files on disk |

## How it works

```
Job ad text ──► /api/extract ──► structured Job (JSON Schema)
                                        │
Profile (redacted) ─────────────────────┤
                                        ▼
                               /api/write (streamed)
                                        │
                     editor ◄───────────┘──► /api/preview ──► Playwright ──► A4 PDF
                                        │
              /api/cv · /api/followup · /api/interview (structured JSON)
```

- **Prompts as files**: every prompt lives in `prompts/*.txt` (`extract`, `write`, `revise`, `cv`, `followup`, `interview`) with `{{PLACEHOLDERS}}`, so you can tune the output without touching code.
- **Structured output**: extraction, CV, follow-up and interview prep use JSON Schema output, so responses map directly onto TypeScript types.
- **Streaming**: the cover letter is streamed token by token to the editor through a `ReadableStream`.
- **HTML → PDF**: `lib/letter-template.ts` and `lib/cv-template.ts` produce HTML/CSS that Playwright prints to PDF. `lib/brand.ts` holds the shared design.

## Project structure

```
app/
  page.tsx            Overview of all applications
  ny/                 New application flow (editor, preview, CV editor)
  profil/             Profile page (LinkedIn upload, notes, photo)
  api/                Route handlers: extract, write, cv, followup, interview, pdf, preview, profile, applications
lib/
  ai.ts               Claude client, prompt loading, JSON and streaming helpers
  contact.ts          Contact details from .env and redaction
  storage.ts          Types and file-based persistence
  brand.ts            Shared PDF design (accent color, avatar)
  letter-template.ts  Cover letter HTML template
  cv-template.ts      CV HTML template
prompts/              Editable prompt templates
data/                 Your profile and applications (gitignored)
output/               Generated PDFs (gitignored)
```

## Getting started

Requirements: Node.js 20+ and an Anthropic API key.

```bash
npm install
cp .env.example .env        # add your API key and contact details
npx playwright install chromium
npm run dev
```

Open http://127.0.0.1:3000.

### Configuration (`.env`)

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `ANTHROPIC_MODEL` | Model to use (default `claude-sonnet-5-5`) |
| `NAME`, `ADDRESS`, `ZIP`, `CITY`, `PHONE`, `EMAIL`, `WEBSITE`, `LINKEDIN_URL` | Contact details, used **only** in the PDF |
| `ACCENT_COLOR` | Optional hex color for the PDF design, e.g. `#5b3fd6` |

## Usage

1. **Profile**: upload your LinkedIn PDF, add "Extra about me", and optionally a photo.
2. **New application**: paste the job ad and click *Find the ad*. Check the extracted fields.
3. Choose a language and click *Generate*. The letter is written live.
4. Edit the text, use the quick revisions, and download the PDF.
5. Optionally continue to a **tailored CV**, or skip it.
6. Use the **overview** to track status, write follow-up emails and prepare for interviews.

Generated files are named `Ansoegning_[Name]_[Company]_[Title].pdf` (or `Application_…` in English) and `CV_[Name]_[Company]_[Title].pdf`.
