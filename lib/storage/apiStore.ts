import type { EditableFields, RegistryRow, RegistryStore } from "@/core/registry/types";

const BASE = "/api/registry";

async function ensureOk(response: Response): Promise<void> {
  if (response.ok) return;
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(body.error ?? `Registry request failed (HTTP ${response.status}).`);
}

/**
 * Client-side RegistryStore that talks to the app's own API routes (which
 * persist to a local JSON file). Same contract; used in the browser.
 */
export class ApiRegistryStore implements RegistryStore {
  async list(): Promise<RegistryRow[]> {
    const response = await fetch(BASE, { cache: "no-store" });
    await ensureOk(response);
    return response.json();
  }

  async add(row: RegistryRow): Promise<void> {
    const response = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });
    await ensureOk(response);
  }

  async update(code: string, fields: EditableFields): Promise<void> {
    // JSON drops undefined-valued keys, so a "clear this field" edit (e.g. emptying
    // notes) would serialize to {} and be silently ignored. Send undefined as null so
    // the intent survives the wire; the server treats null as "clear".
    const payload = Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, value === undefined ? null : value]),
    );
    const response = await fetch(`${BASE}/${encodeURIComponent(code)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await ensureOk(response);
  }

  async remove(code: string): Promise<void> {
    const response = await fetch(`${BASE}/${encodeURIComponent(code)}`, { method: "DELETE" });
    await ensureOk(response);
  }

  async existingCodes(): Promise<string[]> {
    return (await this.list()).map((row) => row.code);
  }
}
