import type { ParsedJd, VerifiedClaims } from "./types";

export interface KeywordCoverage {
  covered: string[];
  missing: string[];
  /** Integer 0–100. */
  pct: number;
}

export interface AtsWarning {
  field: "title" | "summary";
  message: string;
}

function targetKeywords(parsedJd: ParsedJd): string[] {
  return [...parsedJd.requiredKeywords, ...parsedJd.tools];
}

/**
 * Score keyword coverage by substring-matching each required keyword and tool
 * against a prose text (e.g. the AI-drafted summary). Case-insensitive.
 * Returns pct = 100 when there are no target keywords.
 */
export function scoreFromText(parsedJd: ParsedJd, text: string): KeywordCoverage {
  const targets = targetKeywords(parsedJd);
  if (targets.length === 0) return { covered: [], missing: [], pct: 100 };
  const haystack = text.toLowerCase();
  const covered: string[] = [];
  const missing: string[] = [];
  for (const kw of targets) {
    (haystack.includes(kw.toLowerCase()) ? covered : missing).push(kw);
  }
  return { covered, missing, pct: Math.round((covered.length / targets.length) * 100) };
}

/**
 * Score keyword coverage for Modo 3 (verbatim) based on which claims the user
 * has checked. Only required keywords and tools count toward the score; the
 * preferred keywords list is advisory and not included in the denominator.
 */
export function scoreFromClaims(parsedJd: ParsedJd, claims: VerifiedClaims): KeywordCoverage {
  const targets = targetKeywords(parsedJd);
  if (targets.length === 0) return { covered: [], missing: [], pct: 100 };
  const verifiedSet = new Set([
    ...claims.requiredKeywords.map((s) => s.toLowerCase()),
    ...claims.tools.map((s) => s.toLowerCase()),
  ]);
  const covered: string[] = [];
  const missing: string[] = [];
  for (const kw of targets) {
    (verifiedSet.has(kw.toLowerCase()) ? covered : missing).push(kw);
  }
  return { covered, missing, pct: Math.round((covered.length / targets.length) * 100) };
}

/**
 * Warn about CV content (title or summary text) that may confuse ATS parsers.
 * Does not check for keyword coverage — that's scoreFromText / scoreFromClaims.
 */
export function lintContent(opts: { title?: string; summary?: string }): AtsWarning[] {
  const warnings: AtsWarning[] = [];
  if (opts.title && opts.title.length > 100) {
    warnings.push({
      field: "title",
      message: "El título supera los 100 caracteres — algunos ATS lo truncan.",
    });
  }
  if (opts.summary && opts.summary.length > 1200) {
    warnings.push({
      field: "summary",
      message: "El resumen supera los 1200 caracteres — algunos ATS lo truncan.",
    });
  }
  if (opts.summary && /[|•·▪◦→⇒✓✗]/u.test(opts.summary)) {
    warnings.push({
      field: "summary",
      message: "El resumen contiene caracteres especiales que pueden confundir al ATS.",
    });
  }
  return warnings;
}
