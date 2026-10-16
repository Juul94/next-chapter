import { createApplication, listApplications, type Application } from "@/lib/storage";

export async function GET() {
  return Response.json(await listApplications());
}

export async function POST(req: Request) {
  const data = (await req.json()) as Omit<Application, "id" | "createdAt" | "updatedAt">;
  const app = await createApplication(data);
  return Response.json(app);
}
