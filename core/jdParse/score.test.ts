import { describe, expect, it } from "vitest";
import { lintContent, scoreFromClaims, scoreFromText } from "./score";
import type { ParsedJd, VerifiedClaims } from "./types";

const JD: ParsedJd = {
  requiredKeywords: ["Figma", "UX Research", "Design Systems"],
  preferredKeywords: ["Agile"],
  tools: ["Jira", "Notion"],
  sectionHeaders: [],
  companyValues: [],
};

const EMPTY_CLAIMS: VerifiedClaims = {
  titleVerified: false,
  requiredKeywords: [],
  tools: [],
  preferredKeywords: [],
};

describe("scoreFromText", () => {
  it("returns 100 when no target keywords", () => {
    const empty: ParsedJd = { ...JD, requiredKeywords: [], tools: [] };
    expect(scoreFromText(empty, "any text").pct).toBe(100);
  });

  it("scores 0 when nothing matches", () => {
    const result = scoreFromText(JD, "completely unrelated text");
    expect(result.pct).toBe(0);
    expect(result.covered).toHaveLength(0);
    expect(result.missing).toHaveLength(5);
  });

  it("matches case-insensitively", () => {
    const result = scoreFromText(JD, "figma and jira and notion");
    expect(result.covered).toContain("Figma");
    expect(result.covered).toContain("Jira");
    expect(result.covered).toContain("Notion");
  });

  it("scores partial coverage correctly", () => {
    const result = scoreFromText(JD, "experienced with Figma and Design Systems");
    expect(result.covered).toEqual(expect.arrayContaining(["Figma", "Design Systems"]));
    expect(result.pct).toBe(40); // 2 of 5
  });

  it("scores 100 when all match", () => {
    const text = "Figma UX Research Design Systems Jira Notion";
    expect(scoreFromText(JD, text).pct).toBe(100);
    expect(scoreFromText(JD, text).missing).toHaveLength(0);
  });

  it("preferred keywords do not count toward score", () => {
    const result = scoreFromText(JD, "Agile methodology only");
    expect(result.pct).toBe(0);
  });
});

describe("scoreFromClaims", () => {
  it("returns 100 when no target keywords", () => {
    const empty: ParsedJd = { ...JD, requiredKeywords: [], tools: [] };
    expect(scoreFromClaims(empty, EMPTY_CLAIMS).pct).toBe(100);
  });

  it("scores 0 when nothing checked", () => {
    expect(scoreFromClaims(JD, EMPTY_CLAIMS).pct).toBe(0);
  });

  it("counts checked requiredKeywords and tools", () => {
    const claims: VerifiedClaims = {
      ...EMPTY_CLAIMS,
      requiredKeywords: ["Figma", "UX Research"],
      tools: ["Jira"],
    };
    const result = scoreFromClaims(JD, claims);
    expect(result.covered).toHaveLength(3);
    expect(result.pct).toBe(60); // 3 of 5
  });

  it("preferred keywords do not count toward score", () => {
    const claims: VerifiedClaims = { ...EMPTY_CLAIMS, preferredKeywords: ["Agile"] };
    expect(scoreFromClaims(JD, claims).pct).toBe(0);
  });

  it("case-insensitive match on claims", () => {
    const claims: VerifiedClaims = {
      ...EMPTY_CLAIMS,
      requiredKeywords: ["figma"],
    };
    const result = scoreFromClaims(JD, claims);
    expect(result.covered).toContain("Figma");
  });
});

describe("lintContent", () => {
  it("returns no warnings for clean content", () => {
    expect(lintContent({ title: "Senior UX Designer", summary: "Short clean summary." })).toHaveLength(0);
  });

  it("warns on title > 100 chars", () => {
    const warnings = lintContent({ title: "A".repeat(101) });
    expect(warnings.some((w) => w.field === "title")).toBe(true);
  });

  it("warns on summary > 1200 chars", () => {
    const warnings = lintContent({ summary: "A".repeat(1201) });
    expect(warnings.some((w) => w.field === "summary")).toBe(true);
  });

  it("warns on special characters in summary", () => {
    const warnings = lintContent({ summary: "Skills: React • Node" });
    expect(warnings.some((w) => w.field === "summary")).toBe(true);
  });

  it("no warning for summary exactly 1200 chars", () => {
    expect(lintContent({ summary: "A".repeat(1200) })).toHaveLength(0);
  });
});
