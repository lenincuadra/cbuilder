
/**
 * A "stable link": a tracking link for a permanent touchpoint (LinkedIn profile,
 * Behance, an old directory…), not tied to a single application. You place it on
 * that external profile; when someone clicks through to the portfolio, the tracker
 * attributes the visit to its `ref`. Unlike a CV code, it never expires and there
 * is one per touchpoint.
 */
export interface StableLink {
  /** Human label (e.g. "LinkedIn (perfil)", "Behance"). */
  name: string;
  /** Tracking ref that tags inbound visits (e.g. "behance", "li-profile"). Unique. */
  ref: string;
  /** Creation timestamp (ISO). */
  createdAt?: string;
}

/**
 * The link goes straight to the portfolio index, tagged with its source ref
 * (no go.html — the index tracks any ref directly). `base` comes from the spec
 * (`spec.base`, ends with "/"), so the domain has a single source of truth.
 */
export function stableLinkUrl(base: string, ref: string): string {
  return `${base}?ref=${ref}`;
}

/** Allowed ref shape: a lowercase slug, like the portfolio's reserved refs. */
export const STABLE_REF_RE = /^[a-z0-9][a-z0-9-]{0,30}$/;

export function isValidStableRef(ref: string): boolean {
  return STABLE_REF_RE.test(ref);
}

/**
 * Storage for the stable-links list. Local file implementation now; a Supabase
 * table could slot in later behind this interface, like the registry.
 */
export interface StableLinksStore {
  list(): Promise<StableLink[]>;
  add(link: StableLink): Promise<void>;
  remove(ref: string): Promise<void>;
}
