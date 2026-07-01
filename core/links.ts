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
