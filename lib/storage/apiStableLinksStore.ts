import type { StableLink, StableLinksStore } from "@/core/stableLinks/types";

const BASE = "/api/stable-links";

async function ensureOk(response: Response): Promise<void> {
  if (response.ok) return;
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(body.error ?? `Stable-links request failed (HTTP ${response.status}).`);
}

/** Client-side StableLinksStore that talks to the app's API routes (local file). */
export class ApiStableLinksStore implements StableLinksStore {
  async list(): Promise<StableLink[]> {
    const response = await fetch(BASE, { cache: "no-store" });
    await ensureOk(response);
    return response.json();
  }

  async add(link: StableLink): Promise<void> {
    const response = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(link),
    });
    await ensureOk(response);
  }

  async update(ref: string, fields: Pick<StableLink, "name" | "ref">): Promise<void> {
    const response = await fetch(`${BASE}/${encodeURIComponent(ref)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    await ensureOk(response);
  }

  async remove(ref: string): Promise<void> {
    const response = await fetch(`${BASE}/${encodeURIComponent(ref)}`, { method: "DELETE" });
    await ensureOk(response);
  }
}
