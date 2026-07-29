import { describe, expect, it } from "vitest";
import { parseJdResponse } from "./prompt";

const OBJECT = {
  jobTitle: "Product Designer",
  requiredKeywords: ["User Research", "Interaction Design", "Design Systems"],
  preferredKeywords: ["HTML/CSS"],
  tools: ["Figma", "Miro", "Maze"],
  sectionHeaders: ["Technical Stack / Tools"],
  companyValues: ["Collaboration"],
};

describe("parseJdResponse", () => {
  it("parses clean JSON", () => {
    const out = parseJdResponse(JSON.stringify(OBJECT));
    expect(out.jobTitle).toBe("Product Designer");
    expect(out.tools).toEqual(["Figma", "Miro", "Maze"]);
  });

  it("parses JSON wrapped in ```json fences (the Haiku failure mode)", () => {
    const out = parseJdResponse("```json\n" + JSON.stringify(OBJECT) + "\n```");
    expect(out.requiredKeywords).toHaveLength(3);
    expect(out.tools).toContain("Figma");
  });

  it("parses JSON wrapped in bare ``` fences", () => {
    const out = parseJdResponse("```\n" + JSON.stringify(OBJECT) + "\n```");
    expect(out.jobTitle).toBe("Product Designer");
  });

  it("parses JSON with surrounding prose", () => {
    const out = parseJdResponse(
      "Here is the extracted data:\n" + JSON.stringify(OBJECT) + "\nHope this helps!",
    );
    expect(out.tools).toContain("Maze");
    expect(out.companyValues).toEqual(["Collaboration"]);
  });

  it("returns an empty structure on genuinely unparseable text", () => {
    const out = parseJdResponse("I could not parse this job description, sorry.");
    expect(out.jobTitle).toBeUndefined();
    expect(out.requiredKeywords).toHaveLength(0);
    expect(out.tools).toHaveLength(0);
  });
});
