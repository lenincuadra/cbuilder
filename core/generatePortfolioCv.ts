import { fillMaster } from "./docx";
import { buildTrackedLinks, type TrackedLinks } from "./spec/links";
import type { LinkSpec } from "./spec/types";
import { languagesFor, type Language, type LanguageChoice } from "./types";

/**
 * Fixed reserved tracking ref for the generic portfolio CV — the public,
 * downloadable copy at lenincuadra.com. Unlike a per-application code it is
 * shared by every visitor (a static file): clicks on its three links are
 * tracked in aggregate, individual downloaders are not distinguished. Must be
 * one of `spec.tracking.reservedRefs`.
 */
export const WEB_CV_REF = "web-cv";

export interface GeneratePortfolioCvDeps {
  spec: LinkSpec;
  /** Loads the master .docx bytes per language (browser: /public/masters). */
  loadMaster: (language: Language) => Promise<Uint8Array>;
}

export interface PortfolioCvResult {
  /** Filled .docx bytes per requested language. */
  files: Partial<Record<Language, Uint8Array>>;
  /** The three tracked links baked in — faithful record / for display. */
  links: TrackedLinks;
}

/**
 * Build the generic portfolio CV(s): the master(s) filled with the fixed
 * `web-cv` tracked links (no focus — the public CV carries no personalization).
 * Pure given its deps; the caller downloads the bytes. Reuses the exact pipeline
 * of `generateCv` (`buildTrackedLinks` + `fillMaster`), just with the reserved
 * ref instead of a minted code and without any registry/zip side effects.
 */
export async function generatePortfolioCv(
  languageChoice: LanguageChoice,
  deps: GeneratePortfolioCvDeps,
): Promise<PortfolioCvResult> {
  // Spec-driven guard: the ref must be reserved by the portfolio's contract, or
  // its short link would collide with a real application code.
  if (!deps.spec.tracking.reservedRefs.includes(WEB_CV_REF)) {
    throw new Error(
      `El spec del portfolio no reserva "${WEB_CV_REF}"; no se puede generar el CV genérico con tracking.`,
    );
  }
  const links = buildTrackedLinks(deps.spec, WEB_CV_REF);
  const files: Partial<Record<Language, Uint8Array>> = {};
  for (const language of languagesFor(languageChoice)) {
    const master = await deps.loadMaster(language);
    files[language] = await fillMaster(master, links);
  }
  return { files, links };
}
