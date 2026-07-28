import type { ContentSlots } from "../docx";
import type { ParsedJd, VerifiedClaims } from "./types";

/**
 * Build CV content slots from verified verbatim claims (Modo 3 — Verbatim).
 *
 * Only fields with verified content produce a slot; absent fields leave the
 * corresponding master paragraph untouched. Summary injection is deferred to
 * Modo 2 (Asistido) — Modo 3 currently only replaces the job title line.
 */
export function buildVerbatimSlots(
  parsedJd: ParsedJd,
  claims: VerifiedClaims,
): ContentSlots {
  const slots: ContentSlots = {};

  if (claims.titleVerified && parsedJd.jobTitle) {
    slots.title = parsedJd.jobTitle;
  }

  return slots;
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
