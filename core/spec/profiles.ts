import type { LinkSpec } from "./types";

export type Lang = "es" | "en";

/** Label of a profile id in the given language (falls back to the raw id). */
export function profileLabel(spec: LinkSpec, id: string, lang: Lang = "es"): string {
  return spec.profiles[id]?.label[lang] ?? id;
}

/** Ids of the available profiles, in spec order. */
export function profileIds(spec: LinkSpec): string[] {
  return Object.keys(spec.profiles);
}

/** What the recruiter will see when opening a link with this profile (Uso A). */
export interface ProfilePreview {
  label: string;
  /** The case shown first (featured), from the spec's case index. */
  featured?: { title: string; description: string };
  /** The two hero metrics fixed by the profile. */
  proofs: string[];
}

export function profilePreview(spec: LinkSpec, id: string, lang: Lang = "es"): ProfilePreview | null {
  const profile = spec.profiles[id];
  if (!profile) return null;
  const featured = spec.cases[profile.featured];
  return {
    label: profile.label[lang],
    featured: featured
      ? { title: featured.title[lang], description: featured.description[lang] }
      : undefined,
    proofs: profile.proofs.map((proof) => proof[lang]),
  };
}
