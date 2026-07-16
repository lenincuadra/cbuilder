import type { EditableGeneralNoteFields, GeneralNote, GeneralNotesStore } from "@/core/notes/types";

const BASE = "/api/notes";

async function ensureOk(response: Response): Promise<void> {
  if (response.ok) return;
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(body.error ?? `Notes request failed (HTTP ${response.status}).`);
}

/** Client-side GeneralNotesStore that talks to the app's API routes. */
export class ApiGeneralNotesStore implements GeneralNotesStore {
  async list(): Promise<GeneralNote[]> {
    const response = await fetch(BASE, { cache: "no-store" });
    await ensureOk(response);
    return response.json();
  }

  async add(note: GeneralNote): Promise<void> {
    const response = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(note),
    });
    await ensureOk(response);
  }

  async update(id: string, fields: EditableGeneralNoteFields): Promise<void> {
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
