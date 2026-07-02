/**
 * Per-link identifier appended to the tracking `ref` so a click can be attributed
 * to the specific link that was opened, not just the application.
 *
 * e.g. ref=0628r4P → portfolio link of CV 0628r4; ref=0628r4L → its LinkedIn link.
 */
export const LINK_ID = {
  portfolio: "P",
  linkedin: "L",
} as const;

const PORTFOLIO_BASE = "https://lenincuadra.github.io/portfolio";

/**
 * The two tracked links embedded in the CV for a code (with their link ids):
 * portfolio goes direct, LinkedIn via go.html. Shown read-only in the panel.
 */
export function trackedLinks(code: string): { portfolio: string; linkedin: string } {
  return {
    portfolio: `${PORTFOLIO_BASE}/?ref=${code}${LINK_ID.portfolio}`,
    linkedin: `${PORTFOLIO_BASE}/go.html?ref=${code}${LINK_ID.linkedin}&dest=linkedin`,
  };
}
