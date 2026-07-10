import type { LinkSpec } from "./types";

/**
 * Tracking code generation, spec-driven. The code must match the spec's
 * `codeFormat` and never collide with the registry or the spec's `reservedRefs`.
 * We pick from an unambiguous alphabet (a subset of what the format allows), so
 * codes stay legible while still honoring the contract.
 */

/** Letters without ambiguous characters (no i, l, o) — a subset of the spec's [a-z]. */
export const CODE_LETTERS = "abcdefghjkmnpqrstuvwxyz";
/** Digits without ambiguous characters (no 0, 1). */
export const CODE_DIGITS = "23456789";

const DEFAULT_MAX_ATTEMPTS = 200;

/** Month + day as a zero-padded "MMDD" string (US reading, local time). */
export function mmdd(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}${day}`;
}

function pick(chars: string, rng: () => number): string {
  return chars[Math.floor(rng() * chars.length)];
}

export interface GenerateCodeOptions {
  /** The link contract — supplies the format and the reserved codes. */
  spec: LinkSpec;
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
 * Generate a unique, non-reserved tracking code for the date, matching the
 * spec's `codeFormat`. Retries until it finds a free code, or throws after
 * `maxAttempts` (registry saturated for that date).
 */
export function generateCode(options: GenerateCodeOptions): string {
  const { spec, date, existingCodes, rng = Math.random, maxAttempts = DEFAULT_MAX_ATTEMPTS } = options;
  const format = new RegExp(spec.tracking.codeFormat);
  const reserved = new Set(spec.tracking.reservedRefs);
  const taken = new Set<string>(existingCodes);
  const prefix = mmdd(date);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = `${prefix}${pick(CODE_LETTERS, rng)}${pick(CODE_DIGITS, rng)}`;
    if (!format.test(code)) continue; // honor the contract even if our alphabet drifts
    if (taken.has(code) || reserved.has(code)) continue;
    return code;
  }

  throw new Error(
    `No se pudo generar un código único para ${prefix} en ${maxAttempts} intentos; ` +
      `el registro puede estar saturado para esa fecha.`,
  );
}

/** Whether a code is reserved by the spec (never to be emitted). */
export function isReservedCode(spec: LinkSpec, code: string): boolean {
  return spec.tracking.reservedRefs.includes(code);
}
