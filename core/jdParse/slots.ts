import type { ContentSlots } from "../docx";
import type { ParsedJd, VerifiedClaims } from "./types";

/**
 * Build CV content slots from verified verbatim claims (Modo 3 — Verbatim).
 *
 * Only fields with verified content produce a slot; absent fields leave the
 * corresponding master paragraph untouched. Modo 3 injects the JD job title (as
 * the header title line) and the verbatim keywords Lenin verified (as a "Core
 * Competencies" line after the summary) — the exact terms that drive the ATS
 * match. Summary rewriting stays exclusive to Modo 2 (Asistido).
 */
export function buildVerbatimSlots(
  parsedJd: ParsedJd,
  claims: VerifiedClaims,
): ContentSlots {
  const slots: ContentSlots = {};

  if (claims.titleVerified && parsedJd.jobTitle) {
    slots.title = parsedJd.jobTitle;
  }

  // Verified keywords land verbatim in the document (the point of Modo 3), in
  // JD priority order (required → tools → preferred), de-duplicated case-insensitively.
  const seen = new Set<string>();
  const keywords = [...claims.requiredKeywords, ...claims.tools, ...claims.preferredKeywords]
    .map((k) => k.trim())
    .filter((k) => {
      const key = k.toLowerCase();
      if (k === "" || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  if (keywords.length > 0) {
    slots.keywords = keywords;
  }

  return slots;
}

/** Content slots for Modo 2 (Assisted): injects only the AI-drafted summary. */
export function buildAssistedSlots(summary: string): ContentSlots {
  return { summary };
}

/** The initial (empty) state of the gate — populated when StepVerify first mounts. */
export function emptyVerifiedClaims(): VerifiedClaims {
  return {
    titleVerified: false,
    requiredKeywords: [],
    tools: [],
    preferredKeywords: [],
  };
}
