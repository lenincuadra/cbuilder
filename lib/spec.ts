import type { LinkSpec } from "@/core/spec/types";

export interface SpecResult {
  spec: LinkSpec;
  /** "live" = fetched now; "cache" = served from the last-known-good copy. */
  source: "live" | "cache";
}

/**
 * Get the link contract via the app's own API route (which fetches the live
 * spec with a disk-cached fallback). Throws with the server's message on 503.
 */
export async function fetchSpec(): Promise<SpecResult> {
  const response = await fetch("/api/spec", { cache: "no-store" });
  const data = (await response.json().catch(() => null)) as
    | (SpecResult & { error?: string })
    | { error: string }
    | null;
  if (!response.ok || !data || "error" in data) {
    throw new Error(
      (data && "error" in data && data.error) || `No se pudo leer el spec (HTTP ${response.status}).`,
    );
  }
  return data as SpecResult;
}
