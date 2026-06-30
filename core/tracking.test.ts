import { describe, expect, it } from "vitest";
import {
  CODE_DIGITS,
  CODE_LETTERS,
  RESERVED_CODES,
  generateCode,
  isReservedCode,
  mmdd,
  trackingUrl,
} from "./tracking";

const CODE_RE = /^\d{4}[abcdefghjkmnpqrstuvwxyz][23456789]$/;

/**
 * Build a deterministic RNG that yields the given (letterIndex, digitIndex)
 * pairs, mapping each index to a value safely inside its bucket.
 */
function codeRng(pairs: Array<[number, number]>): () => number {
  const seq = pairs.flatMap(([letter, digit]) => [
    (letter + 0.5) / CODE_LETTERS.length,
    (digit + 0.5) / CODE_DIGITS.length,
  ]);
  let i = 0;
  return () => seq[Math.min(i++, seq.length - 1)];
}

describe("mmdd", () => {
  it("zero-pads month and day, US reading (month first)", () => {
    expect(mmdd(new Date(2026, 5, 28))).toBe("0628"); // June 28
    expect(mmdd(new Date(2026, 0, 1))).toBe("0101"); // Jan 1
    expect(mmdd(new Date(2026, 11, 9))).toBe("1209"); // Dec 9
  });
});

describe("generateCode", () => {
  it("produces a code in the MMDD+letter+digit format", () => {
    const code = generateCode({ date: new Date(2026, 5, 28), existingCodes: [] });
    expect(code).toMatch(CODE_RE);
    expect(code.startsWith("0628")).toBe(true);
  });

  it("only uses the allowed alphabet and digits", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCode({ date: new Date(2026, 5, 28), existingCodes: [] });
      expect(CODE_LETTERS).toContain(code[4]);
      expect(CODE_DIGITS).toContain(code[5]);
    }
  });

  it("skips a colliding code and returns the next free one", () => {
    // First pick -> "0628a2" (taken), second pick -> "0628b3" (free).
    const code = generateCode({
      date: new Date(2026, 5, 28),
      existingCodes: ["0628a2"],
      rng: codeRng([
        [0, 0],
        [1, 1],
      ]),
    });
    expect(code).toBe("0628b3");
  });

  it("throws when no free code is found within maxAttempts", () => {
    // rng always yields index 0 -> always "0628a2", which is taken.
    expect(() =>
      generateCode({
        date: new Date(2026, 5, 28),
        existingCodes: ["0628a2"],
        rng: () => 0,
        maxAttempts: 10,
      }),
    ).toThrow(/unique tracking code/);
  });
});

describe("reserved codes and tracking url", () => {
  it("flags reserved codes and not real ones", () => {
    for (const code of RESERVED_CODES) expect(isReservedCode(code)).toBe(true);
    expect(isReservedCode("0628r4")).toBe(false);
  });

  it("builds the direct portfolio tracking url (no go.html)", () => {
    expect(trackingUrl("0628r4")).toBe("https://lenincuadra.github.io/portfolio/?ref=0628r4");
  });
});
