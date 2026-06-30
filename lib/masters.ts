import type { Language } from "@/core/types";

/**
 * Fetch the master .docx bytes for a concrete language from /public/masters.
 * Used as the `loadMaster` dependency of `generateCv` in the browser.
 */
export async function loadMaster(language: Language): Promise<Uint8Array> {
  const response = await fetch(`/masters/${language}.docx`);
  if (!response.ok) {
    throw new Error(`Could not load the ${language} master (HTTP ${response.status}).`);
  }
  return new Uint8Array(await response.arrayBuffer());
}
