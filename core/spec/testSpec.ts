import type { LinkSpec } from "./types";

/** A minimal, valid spec for tests — mirrors the live link-spec.json shape. */
export const TEST_SPEC: LinkSpec = {
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
  profiles: {
    payments: {
      label: { en: "For payment platforms", es: "Para plataformas de pagos" },
      featured: "fintech-ecosystem",
      order: ["fintech-ecosystem", "no-handoff"],
      proofs: [{ id: "fintech-ecosystem", en: "launched…", es: "lanzó…" }],
    },
  },
  defaultOrder: ["no-handoff", "fintech-ecosystem"],
  cases: {
    "fintech-ecosystem": {
      title: { en: "Fintech Ecosystem", es: "Ecosistema Fintech" },
      description: { en: "…", es: "…" },
    },
  },
};
