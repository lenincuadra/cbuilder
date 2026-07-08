/**
 * Per-link identifier appended to the tracking `ref` so a click can be attributed
 * to the specific link that was opened, not just the application.
 *
 * e.g. ref=0628r4P → portfolio link of CV 0628r4; ref=0628r4L → its LinkedIn link.
 */
export const LINK_ID = {
  portfolio: "P",
  linkedin: "L",
  github: "G",
} as const;

/**
 * Portfolio base URL — the custom domain (GitHub Pages behind it). The old
 * lenincuadra.github.io/portfolio URLs 301-redirect here with params intact,
 * so links in already-sent CVs keep tracking.
 */
export const PORTFOLIO_BASE = "https://lenincuadra.com";

/**
 * Portfolio focus profiles — must mirror `data/profiles.js` in the portfolio
 * repo (the source of truth; public on GitHub Pages). A `&focus=<id>` on a
 * tracked link makes the portfolio reorder/feature its cases for that visitor
 * (it never hides anything). Labels are the profiles' Spanish labels, shown in
 * the wizard. When the portfolio adds a profile, add it here too.
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

/**
 * The three tracked links embedded in the CV for a code (with their link ids):
 * portfolio goes direct; LinkedIn and GitHub via go.html (their hosts strip or
 * disallow query params). Shown read-only in the panel.
 * An optional focus profile is appended to all: the index reads `?focus=`
 * directly, and go.html stores it for a later same-tab portfolio visit.
 */
export function trackedLinks(
  code: string,
  focus?: FocusProfileId,
): { portfolio: string; linkedin: string; github: string } {
  const focusParam = focus ? `&focus=${focus}` : "";
  return {
    portfolio: `${PORTFOLIO_BASE}/?ref=${code}${LINK_ID.portfolio}${focusParam}`,
    linkedin: `${PORTFOLIO_BASE}/go.html?ref=${code}${LINK_ID.linkedin}&dest=linkedin${focusParam}`,
    github: `${PORTFOLIO_BASE}/go.html?ref=${code}${LINK_ID.github}&dest=github${focusParam}`,
  };
}
