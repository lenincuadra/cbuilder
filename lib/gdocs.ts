/**
 * Send a filled CV to the Google Docs sink (Drive via the user's Apps Script).
 * Returns the Google Doc URL, or null when the integration is not configured
 * (HTTP 501) — callers treat that as "feature off", not an error.
 */
export async function createGoogleDoc(folder: string, docx: Uint8Array): Promise<string | null> {
  const response = await fetch("/api/gdocs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder, docxBase64: toBase64(docx) }),
  });
  if (response.status === 501) return null;
  const data = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!response.ok || !data?.url) {
    throw new Error(data?.error ?? `Google Docs sink failed (HTTP ${response.status}).`);
  }
  return data.url;
}

/** Uint8Array -> base64, chunked so large arrays don't blow the btoa arg limit. */
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
