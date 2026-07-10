/**
 * Machine-readable contract published by the portfolio at `link-spec.json`.
 * cbuilder knows nothing about the portfolio except the spec URL — domain,
 * link formats, code rules and personalization profiles all flow from here.
 * See docs/spec-driven.md and the portfolio's docs/personalization.md.
 */
export interface LinkSpec {
  /** Contract version. cbuilder supports up to SUPPORTED_SPEC_VERSION. */
  version: number;
  /** Canonical portfolio base URL (ends with "/"). Single source of truth for the domain. */
  base: string;
  tracking: {
    /** Regex (as string) the tracking code must match, e.g. "^\\d{4}[a-z][2-9]$". */
    codeFormat: string;
    codeHint?: string;
    /** Per-link ref suffix: which link of the CV was opened (P/L/G). */
    refSuffix: Record<string, string>;
    /** Codes that must never be emitted. */
    reservedRefs: string[];
    /** URL templates with {base}/{code}/{focus}/{focusLetter} placeholders. */
    links: SpecLinks;
  };
  /** Profile id → its short-link letter (e.g. payments → "p"). */
  focusLetters: Record<string, string>;
  /** Personalization profiles by id. */
  profiles: Record<string, SpecProfile>;
  /** Case order shown with no profile (also without a featured one). */
  defaultOrder: string[];
  /** Bilingual case index by slug. */
  cases: Record<string, SpecCase>;
}

export interface SpecLinks {
  portfolio: string;
  portfolioFocused: string;
  linkedin: string;
  github: string;
  shortPortfolio: string;
  shortPortfolioFocused: string;
  shortLinkedin: string;
  shortGithub: string;
}

export interface SpecProfile {
  label: { en: string; es: string };
  /** Slug of the case shown first (featured). */
  featured: string;
  /** Full reading order (featured first). */
  order: string[];
  /** The two hero metrics fixed by this profile, with bilingual text. */
  proofs: Array<{ id: string; en: string; es: string }>;
}

export interface SpecCase {
  title: { en: string; es: string };
  description: { en: string; es: string };
  url?: string;
}

/** Highest contract version cbuilder understands. */
export const SUPPORTED_SPEC_VERSION = 1;
