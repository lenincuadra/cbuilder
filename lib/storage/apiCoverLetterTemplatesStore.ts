import type {
  CoverLetterTemplate,
  CoverLetterTemplatesStore,
  EditableTemplateFields,
} from "@/core/coverLetter/types";

const BASE = "/api/cover-letters";

async function ensureOk(response: Response): Promise<void> {
  if (response.ok) return;
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(body.error ?? `Cover-letters request failed (HTTP ${response.status}).`);
}

/** Client-side CoverLetterTemplatesStore that talks to the app's API routes. */
export class ApiCoverLetterTemplatesStore implements CoverLetterTemplatesStore {
  async list(): Promise<CoverLetterTemplate[]> {
    const response = await fetch(BASE, { cache: "no-store" });
    await ensureOk(response);
    return response.json();
  }

  async add(template: CoverLetterTemplate): Promise<void> {
    const response = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(template),
    });
    await ensureOk(response);
  }

  async update(id: string, fields: EditableTemplateFields): Promise<void> {
    const response = await fetch(`${BASE}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    await ensureOk(response);
  }

  async remove(id: string): Promise<void> {
    const response = await fetch(`${BASE}/${encodeURIComponent(id)}`, { method: "DELETE" });
    await ensureOk(response);
  }
}
