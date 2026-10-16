import fs from "node:fs/promises";
import path from "node:path";
import { deleteApplication, getApplication, OUTPUT_DIR, updateApplication, type Application } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

const notFound = () => Response.json({ error: "Ansøgningen findes ikke." }, { status: 404 });

export async function GET(_req: Request, { params }: Ctx) {
  const app = await getApplication((await params).id);
  return app ? Response.json(app) : notFound();
}

export async function PUT(req: Request, { params }: Ctx) {
  const app = await updateApplication((await params).id, (await req.json()) as Partial<Application>);
  return app ? Response.json(app) : notFound();
}

// Sletter ansøgningen og dens PDF'er
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const app = await getApplication(id);
  if (app?.pdf) await fs.rm(path.join(OUTPUT_DIR, app.pdf), { force: true });
  if (app?.cvPdf) await fs.rm(path.join(OUTPUT_DIR, app.cvPdf), { force: true });
  if (app?.combinedPdf) await fs.rm(path.join(OUTPUT_DIR, app.combinedPdf), { force: true });
  await deleteApplication(id);
  return Response.json({ ok: true });
}
