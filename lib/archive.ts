/** Ask the local server to reveal an archived zip in Finder (macOS only). */
export async function revealCvZip(name: string): Promise<void> {
  const response = await fetch("/api/cvs/reveal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Reveal failed (HTTP ${response.status}).`);
  }
}

/**
 * Send a generated delivery zip to the server-side archive (data/cvs/).
 * Companion of the download: the archive keeps the faithful copy of what was
 * sent even after the masters change.
 */
export async function archiveCvZip(name: string, zip: Uint8Array): Promise<void> {
  const response = await fetch(`/api/cvs?name=${encodeURIComponent(name)}`, {
    method: "POST",
    headers: { "Content-Type": "application/zip" },
    body: new Blob([zip.buffer as ArrayBuffer]),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Archive failed (HTTP ${response.status}).`);
  }
}
