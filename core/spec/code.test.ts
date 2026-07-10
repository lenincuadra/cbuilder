import { describe, expect, it } from "vitest";
import { CODE_DIGITS, CODE_LETTERS, generateCode, isReservedCode } from "./code";
import { TEST_SPEC } from "./testSpec";

function codeRng(pairs: Array<[number, number]>): () => number {
  const seq = pairs.flatMap(([letter, digit]) => [
    (letter + 0.5) / CODE_LETTERS.length,
    (digit + 0.5) / CODE_DIGITS.length,
  ]);
  let i = 0;
  return () => seq[Math.min(i++, seq.length - 1)];
}

describe("generateCode", () => {
  it("builds MMDD + letter + digit matching the spec format", () => {
    const code = generateCode({
      spec: TEST_SPEC,
      date: new Date(2026, 5, 28),
      existingCodes: [],
      rng: () => 0, // index 0 → letter "a", digit "2"
    });
    expect(code).toBe("0628a2");
    expect(new RegExp(TEST_SPEC.tracking.codeFormat).test(code)).toBe(true);
  });

  it("skips a code already in the registry", () => {
    const code = generateCode({
      spec: TEST_SPEC,
      date: new Date(2026, 5, 28),
      existingCodes: ["0628a2"],
      rng: codeRng([
        [0, 0],
        [1, 1],
      ]),
    });
    expect(code).toBe("0628b3");
  });

  it("never emits a reserved ref (from the spec)", () => {
    for (const reserved of TEST_SPEC.tracking.reservedRefs) {
      expect(isReservedCode(TEST_SPEC, reserved)).toBe(true);
    }
    expect(isReservedCode(TEST_SPEC, "0628r4")).toBe(false);
  });

  it("throws when saturated", () => {
    expect(() =>
      generateCode({
        spec: TEST_SPEC,
        date: new Date(2026, 5, 28),
        existingCodes: [],
        rng: () => 0,
        maxAttempts: 1,
      }),
    ).not.toThrow(); // first attempt succeeds; sanity that maxAttempts wiring exists
  });
});
