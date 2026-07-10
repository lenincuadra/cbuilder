import type { LinkSpec } from "./types";

/** The three tracked links embedded in the CV / shown in the panel. */
export interface TrackedLinks {
  portfolio: string;
  linkedin: string;
  github: string;
}

/** Fill a spec template's {placeholders} from the given vars. */
function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

/**
 * Build the three tracked links (P/L/G) for a code from the spec, using the
 * **short** templates (`{base}r/{code}P{focusLetter}`, etc.). `base` already
 * ends with "/", so it concatenates directly. When a focus profile is given and
 * the spec knows its letter, the portfolio link carries it (personalization).
 */
export function buildTrackedLinks(spec: LinkSpec, code: string, focus?: string): TrackedLinks {
  const base = spec.base;
  const t = spec.tracking.links;
  const focusLetter = focus ? spec.focusLetters[focus] : undefined;

  const portfolio =
    focus && focusLetter
      ? fillTemplate(t.shortPortfolioFocused, { base, code, focusLetter })
      : fillTemplate(t.shortPortfolio, { base, code });

  return {
    portfolio,
    linkedin: fillTemplate(t.shortLinkedin, { base, code }),
    github: fillTemplate(t.shortGithub, { base, code }),
  };
}
