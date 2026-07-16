/**
 * Ask the local server to reveal an archived delivery in Finder: an archived
 * file path (`<folder>/<file>.docx`) or a legacy zip name. Local-first
 * feature: returns null when revealed, or a human message when it isn't
 * available here (501 — deploy, or the app isn't running on macOS). Callers
 * show that message as info, not as an error. Throws on real failures.
 */
export async function revealDelivery(name: string): Promise<string | null> {
  const response = await fetch("/api/cvs/reveal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  if (response.status === 501) {
    return body?.error ?? "Abrir en Finder solo está disponible en la app local (macOS).";
  }
  if (!response.ok) {
    throw new Error(body?.error ?? `Reveal failed (HTTP ${response.status}).`);
  }
  return null;
}

export interface DeliveryFile {
  /** Archive path: `<folder>/<file>.docx`. */
  path: string;
  bytes: Uint8Array;
}

export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Send the delivered files to the durable archive (data/cvs/ locally, Supabase
 * Storage on a deploy). Companion of the download: the archive keeps the
 * faithful copy of what was sent even after the masters change, and each file
 * stays re-downloadable via GET /api/cvs/<path>. Returns false when archiving
 * isn't available here (501 — expected, not an error). Throws on real failures.
 */
export async function archiveDeliveryFiles(files: DeliveryFile[]): Promise<boolean> {
  for (const file of files) {
    const response = await fetch(`/api/cvs?path=${encodeURIComponent(file.path)}`, {
      method: "POST",
      headers: { "Content-Type": DOCX_MIME },
      body: new Blob([file.bytes as BlobPart]),
    });
    if (response.status === 501) return false;
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? `Archive failed (HTTP ${response.status}).`);
    }
  }
  return true;
}

/** Browser URL to download one archived delivered file. */
export function deliveryFileUrl(path: string): string {
  return `/api/cvs/${path.split("/").map(encodeURIComponent).join("/")}`;
}
