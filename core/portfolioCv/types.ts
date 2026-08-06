import type { Language } from "../types";

/**
 * Which master version of the generic portfolio CV (the public, downloadable
 * copy at lenincuadra.com) is currently published, per language. cbuilder
 * generates that CV with the fixed reserved `web-cv` tracking code; Lenin
 * uploads it manually. When a master bumps past the published version the
 * portfolio copy is stale and the UI flags it. One entry per language.
 */
export interface PortfolioCvPublication {
  /** Master vNN that was generated and uploaded to the portfolio. */
  version: number;
  /** When it was marked published (ISO). */
  publishedAt: string;
}

export type PortfolioCvState = Partial<Record<Language, PortfolioCvPublication>>;

/**
 * Storage for the per-language "published portfolio CV version". Tiny key→value
 * state (unlike the list stores), durable behind the same file/Supabase split.
 */
export interface PortfolioCvStore {
  get(): Promise<PortfolioCvState>;
  setPublished(language: Language, version: number): Promise<void>;
}
