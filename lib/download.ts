/** Trigger a browser download of the given bytes under `filename`. */
export function downloadBytes(
  bytes: Uint8Array,
  filename: string,
  mimeType = "application/zip",
): void {
  const blob = new Blob([bytes as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
