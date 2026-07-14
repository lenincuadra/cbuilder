import type {
  EditableScreeningFields,
  ScreeningQuestion,
  ScreeningStore,
} from "@/core/screening/types";

const BASE = "/api/screening";

async function ensureOk(response: Response): Promise<void> {
  if (response.ok) return;
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(body.error ?? `Screening request failed (HTTP ${response.status}).`);
}

/** Client-side ScreeningStore that talks to the app's API routes. */
export class ApiScreeningStore implements ScreeningStore {
  async list(): Promise<ScreeningQuestion[]> {
    const response = await fetch(BASE, { cache: "no-store" });
    await ensureOk(response);
    return response.json();
  }

  async add(entry: ScreeningQuestion): Promise<void> {
    const response = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    await ensureOk(response);
  }

  async update(id: string, fields: EditableScreeningFields): Promise<void> {
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
