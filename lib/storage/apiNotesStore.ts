import type { GeneralNotesStore } from "@/core/notes/types";

const BASE = "/api/notes";

async function ensureOk(response: Response): Promise<void> {
  if (response.ok) return;
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(body.error ?? `Notes request failed (HTTP ${response.status}).`);
}

/**
 * Client-side GeneralNotesStore that talks to the app's own API route (which
 * persists to a local JSON file). Same contract; used in the browser.
 */
export class ApiGeneralNotesStore implements GeneralNotesStore {
  async get(): Promise<string> {
    const response = await fetch(BASE, { cache: "no-store" });
    await ensureOk(response);
    const body = (await response.json()) as { notes?: string };
    return body.notes ?? "";
  }

  async set(notes: string): Promise<void> {
    const response = await fetch(BASE, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    await ensureOk(response);
  }
}
