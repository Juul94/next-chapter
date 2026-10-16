// Små hjælpere til klientsiden

// "2026-10-16" eller ISO-tidsstempel -> "16.10.2026". Andet (fx "løbende") vises som det er.
export function formatDate(s?: string) {
  if (!s) return "";
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return s;
  return new Date(s.length === 10 ? `${s}T00:00` : s).toLocaleDateString("da-DK");
}

export function isOverdue(deadline?: string) {
  if (!deadline || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return false;
  return new Date(`${deadline}T23:59:59`) < new Date();
}

export async function postJson(url: string, data: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Noget gik galt");
  return res;
}

export function saveApplication(id: string, patch: unknown) {
  return fetch(`/api/applications/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export async function downloadPdf(id: string, kind: "letter" | "cv" | "both" = "letter") {
  const res = await postJson("/api/pdf", { id, kind });
  const fileName = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? "Ansoegning.pdf";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(await res.blob());
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

