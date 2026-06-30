/**
 * Tracking code generation.
 *
 * Format: MMDD + one letter + one digit, e.g. "0628r4".
 * - MMDD: month + day of the application date, US reading (month first), local time.
 * - letter: from an alphabet without ambiguous characters (no i, l, o).
 * - digit: from 2-9 (no 0, 1) to avoid confusion with letters.
 */

/** Letters without ambiguous characters (no i, l, o). */
export const CODE_LETTERS = "abcdefghjkmnpqrstuvwxyz";

/** Digits without ambiguous characters (no 0, 1). */
export const CODE_DIGITS = "23456789";

/** Codes the generator must never produce. */
export const RESERVED_CODES = ["me", "li-profile", "organic", "li-cv"] as const;

const DEFAULT_MAX_ATTEMPTS = 200;

/** Month + day as a zero-padded "MMDD" string (US reading, local time). */
export function mmdd(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}${day}`;
}

export function isReservedCode(code: string): boolean {
  return (RESERVED_CODES as readonly string[]).includes(code);
}

/** Direct portfolio tracking URL stored in the registry row (never via go.html). */
export function trackingUrl(code: string): string {
  return `https://lenincuadra.github.io/portfolio/?ref=${code}`;
}

function pick(chars: string, rng: () => number): string {
  return chars[Math.floor(rng() * chars.length)];
}

export interface GenerateCodeOptions {
  /** Application date; its month/day form the MMDD prefix. */
  date: Date;
  /** Codes already present in the registry (collision set). */
  existingCodes: Iterable<string>;
  /** Injectable RNG for deterministic tests. Defaults to Math.random. */
  rng?: () => number;
  /** Max attempts before giving up. Defaults to 200. */
  maxAttempts?: number;
}

/**
 * Generate a unique, non-reserved tracking code for the given date.
 * Retries against the existing-codes set until it finds a free code, or
 * throws after `maxAttempts` (registry saturated for that date).
 */
export function generateCode(options: GenerateCodeOptions): string {
  const {
    date,
    existingCodes,
    rng = Math.random,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
  } = options;
  const prefix = mmdd(date);
  const taken = new Set<string>(existingCodes);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = `${prefix}${pick(CODE_LETTERS, rng)}${pick(CODE_DIGITS, rng)}`;
    if (taken.has(code) || isReservedCode(code)) continue;
    return code;
  }

  throw new Error(
    `Could not generate a unique tracking code for ${prefix} after ${maxAttempts} attempts; the registry may be saturated for this date.`,
  );
}
