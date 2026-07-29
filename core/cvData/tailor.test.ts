import { describe, expect, it } from "vitest";
import { buildAtsOverrides, initialAtsSelections, suggestCompetencies } from "./tailor";
import { cvDataFor } from "./index";
import type { ParsedJd } from "../jdParse/types";

const DATA = cvDataFor("EN");

const JD: ParsedJd = {
  jobTitle: "Staff Product Designer, Design Systems",
  requiredKeywords: ["Design Systems", "Figma", "Nonexistent Skill XYZ"],
  preferredKeywords: ["Accessibility"],
  tools: ["Figma", "Jira"],
  sectionHeaders: [],
  companyValues: ["Bold", "Human"],
};

describe("suggestCompetencies", () => {
  it("dedupes across sources (Figma appears in required and tools once)", () => {
    const out = suggestCompetencies(JD, DATA);
    expect(out.filter((c) => c.keyword.toLowerCase() === "figma")).toHaveLength(1);
  });

  it("flags terms Lenin already lists vs not", () => {
    const out = suggestCompetencies(JD, DATA);
    const byKw = (k: string) => out.find((c) => c.keyword === k)!;
    expect(byKw("Design Systems").alreadyListed).toBe(true);
    expect(byKw("Figma").alreadyListed).toBe(true);
    expect(byKw("Accessibility").alreadyListed).toBe(true); // "WCAG..." + category
    expect(byKw("Nonexistent Skill XYZ").alreadyListed).toBe(false);
    expect(byKw("Jira").alreadyListed).toBe(false);
  });

  it("orders required, then tools, then preferred", () => {
    const out = suggestCompetencies(JD, DATA);
    const sources = out.map((c) => c.source);
    const firstPreferred = sources.indexOf("preferred");
    const lastRequired = sources.lastIndexOf("required");
    expect(lastRequired).toBeLessThan(firstPreferred);
  });
});

describe("initialAtsSelections", () => {
  it("pre-checks ALL competencies by default (select-all on)", () => {
    const sel = initialAtsSelections(JD, DATA);
    expect(sel.competencies).toContain("Design Systems");
    expect(sel.competencies).toContain("Figma");
    expect(sel.competencies).toContain("Nonexistent Skill XYZ");
    expect(sel.competencies).toContain("Jira");
    // Every deduped candidate is selected initially.
    expect(sel.competencies).toHaveLength(suggestCompetencies(JD, DATA).length);
  });

  it("seeds one empty value row per company value, title unverified", () => {
    const sel = initialAtsSelections(JD, DATA);
    expect(sel.titleVerified).toBe(false);
    expect(sel.values).toEqual([
      { value: "Bold", evidence: "" },
      { value: "Human", evidence: "" },
    ]);
  });
});

describe("buildAtsOverrides", () => {
  it("drops everything unverified/empty", () => {
    const overrides = buildAtsOverrides(JD, {
      titleVerified: false,
      competencies: [],
      values: [{ value: "Bold", evidence: "" }],
      summary: "   ",
      experienceVariant: "default",
    });
    expect(overrides).toEqual({});
  });

  it("includes only confirmed content", () => {
    const overrides = buildAtsOverrides(JD, {
      titleVerified: true,
      competencies: ["Design Systems", "Figma"],
      values: [
        { value: "Bold", evidence: "Led AI adoption across a team." },
        { value: "Human", evidence: "  " }, // dropped
      ],
      summary: "Tailored summary.",
      experienceVariant: "default",
    });
    expect(overrides.title).toBe("Staff Product Designer, Design Systems");
    expect(overrides.summary).toBe("Tailored summary.");
    expect(overrides.coreCompetencies).toEqual(["Design Systems", "Figma"]);
    expect(overrides.valuesAlignment).toEqual([
      { value: "Bold", evidence: "Led AI adoption across a team." },
    ]);
    // "default" variant → no experience override.
    expect(overrides.experienceChrono).toBeUndefined();
    expect(overrides.experienceThematic).toBeUndefined();
  });

  it("omits title when JD has none even if verified", () => {
    const overrides = buildAtsOverrides(
      { ...JD, jobTitle: undefined },
      { titleVerified: true, competencies: [], values: [], experienceVariant: "default" },
    );
    expect(overrides.title).toBeUndefined();
  });

  it("uses thematic experience only when variant is thematic and content exists", () => {
    const thematic = [{ header: "Research", bullets: [{ text: "Ran discovery.", company: "Avaya", dates: "2021" }] }];
    const overrides = buildAtsOverrides(JD, {
      titleVerified: false,
      competencies: [],
      values: [],
      experienceVariant: "thematic",
      experienceThematic: thematic,
    });
    expect(overrides.experienceThematic).toEqual(thematic);
    expect(overrides.experienceChrono).toBeUndefined();
  });

  it("uses chronological experience only when variant is chronological", () => {
    const chrono = [{ role: "Product Designer", company: "Flevo", dates: "2023", context: [], bullets: ["Redesigned KYC."] }];
    const overrides = buildAtsOverrides(JD, {
      titleVerified: false,
      competencies: [],
      values: [],
      experienceVariant: "chronological",
      experienceChrono: chrono,
    });
    expect(overrides.experienceChrono).toEqual(chrono);
    expect(overrides.experienceThematic).toBeUndefined();
  });

  it("ignores restructured content when variant is default", () => {
    const overrides = buildAtsOverrides(JD, {
      titleVerified: false,
      competencies: [],
      values: [],
      experienceVariant: "default",
      experienceThematic: [{ header: "X", bullets: [{ text: "y", company: "z", dates: "2020" }] }],
    });
    expect(overrides.experienceThematic).toBeUndefined();
  });
});
