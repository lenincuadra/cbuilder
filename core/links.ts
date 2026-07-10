/**
 * Portfolio focus profiles — must mirror `data/profiles.js` in the portfolio
 * repo (the source of truth; public on GitHub Pages). A focus makes the
 * portfolio reorder/feature its cases for that visitor (it never hides
 * anything). Labels are the profiles' Spanish labels, shown in the wizard.
 *
 * TODO (spec-driven Phase D): read the profiles from the spec (`spec.profiles`)
 * instead of this manual mirror; then this file goes away.
 */
export const FOCUS_PROFILES = [
  { id: "payments", label: "Para plataformas de pagos" },
  { id: "ai", label: "Para equipos que adoptan IA" },
  { id: "conversion", label: "Para equipos de growth y e-commerce" },
] as const;

export type FocusProfileId = (typeof FOCUS_PROFILES)[number]["id"];

/** Spanish label of a focus profile id (falls back to the raw id). */
export function focusLabel(id: string): string {
  return FOCUS_PROFILES.find((profile) => profile.id === id)?.label ?? id;
}
