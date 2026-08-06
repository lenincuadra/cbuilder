import type { Language } from "@/core/types";
import type { PortfolioCvState, PortfolioCvStore } from "@/core/portfolioCv/types";

const BASE = "/api/portfolio-cv";

async function ensureOk(response: Response): Promise<void> {
  if (response.ok) return;
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(body.error ?? `Portfolio-CV request failed (HTTP ${response.status}).`);
}

/** Client-side PortfolioCvStore that talks to the app's API route. */
export class ApiPortfolioCvStore implements PortfolioCvStore {
  async get(): Promise<PortfolioCvState> {
    const response = await fetch(BASE, { cache: "no-store" });
    await ensureOk(response);
    return response.json();
  }

  async setPublished(language: Language, version: number): Promise<void> {
    const response = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, version }),
    });
    await ensureOk(response);
  }
}
