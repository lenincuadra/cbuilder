import { describe, expect, it } from "vitest";
import { SUPPORTED_SPEC_VERSION, type LinkSpec } from "./types";
import { assertLinkSpec, specVersionSupported } from "./validate";

const validSpec: LinkSpec = {
  version: 1,
  base: "https://lenincuadra.com/",
  tracking: {
    codeFormat: "^\\d{4}[a-z][2-9]$",
    refSuffix: { P: "portfolio", L: "linkedin", G: "github" },
    reservedRefs: ["me", "organic", "li-profile", "li-cv", "web-cv"],
    links: {
      portfolio: "{base}go.html?ref={code}P",
      portfolioFocused: "{base}go.html?ref={code}P&focus={focus}",
      linkedin: "{base}go.html?ref={code}L&dest=linkedin",
      github: "{base}go.html?ref={code}G&dest=github",
      shortPortfolio: "{base}r/{code}P",
      shortPortfolioFocused: "{base}r/{code}P{focusLetter}",
      shortLinkedin: "{base}r/{code}L",
      shortGithub: "{base}r/{code}G",
    },
  },
  focusLetters: { payments: "p", ai: "a", conversion: "c" },
  profiles: {},
  defaultOrder: [],
  cases: {},
};

describe("assertLinkSpec", () => {
  it("accepts a well-formed spec", () => {
    expect(() => assertLinkSpec(validSpec)).not.toThrow();
  });

  it("rejects missing/invalid structure with a clear message", () => {
    expect(() => assertLinkSpec(null)).toThrow(/inválido/);
    expect(() => assertLinkSpec({ version: 1 })).toThrow(/base/);
    expect(() => assertLinkSpec({ ...validSpec, tracking: undefined })).toThrow(/tracking/);
    expect(() =>
      assertLinkSpec({ ...validSpec, tracking: { ...validSpec.tracking, reservedRefs: "x" } }),
    ).toThrow(/reservedRefs/);
    expect(() => assertLinkSpec({ ...validSpec, profiles: undefined })).toThrow(/profiles/);
  });
});

describe("specVersionSupported", () => {
  it("supports the current and older versions, warns on newer", () => {
    expect(specVersionSupported({ ...validSpec, version: SUPPORTED_SPEC_VERSION })).toBe(true);
    expect(specVersionSupported({ ...validSpec, version: 0 })).toBe(true);
    expect(specVersionSupported({ ...validSpec, version: SUPPORTED_SPEC_VERSION + 1 })).toBe(false);
  });
});
