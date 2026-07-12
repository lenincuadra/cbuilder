/**
 * Ask the local server to reveal an archived zip in Finder. Local-first
 * feature: returns null when revealed, or a human message when it isn't
 * available here (501 — deploy, or the app isn't running on macOS). Callers
 * show that message as info, not as an error. Throws on real failures.
 */
export async function revealCvZip(name: string): Promise<string | null> {
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

/**
 * Send a generated delivery zip to the server-side archive (data/cvs/).
 * Companion of the download: the archive keeps the faithful copy of what was
 * sent even after the masters change. Returns false when archiving isn't
 * available here (501 on a deploy — expected, not an error; Drive holds the
 * durable copy there). Throws on real failures.
 */
export async function archiveCvZip(name: string, zip: Uint8Array): Promise<boolean> {
  const response = await fetch(`/api/cvs?name=${encodeURIComponent(name)}`, {
    method: "POST",
    headers: { "Content-Type": "application/zip" },
    body: new Blob([zip.buffer as ArrayBuffer]),
  });
  if (response.status === 501) return false;
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Archive failed (HTTP ${response.status}).`);
  }
  return true;
}
