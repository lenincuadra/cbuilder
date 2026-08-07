import { describe, expect, it } from "vitest";

import { stripEmDashes } from "./sanitize";

describe("stripEmDashes", () => {
  it("replaces an em-dash between words with a spaced hyphen", () => {
    expect(stripEmDashes("Atomic Design principles—Flevo's Figma system")).toBe(
      "Atomic Design principles - Flevo's Figma system",
    );
  });

  it("collapses whitespace hugging the em-dash to a single spaced hyphen", () => {
    expect(stripEmDashes("a — b")).toBe("a - b");
    expect(stripEmDashes("a —b")).toBe("a - b");
    expect(stripEmDashes("a\t—\tb")).toBe("a - b");
  });

  it("handles multiple em-dashes in one string", () => {
    expect(stripEmDashes("one—two—three")).toBe("one - two - three");
  });

  it("leaves paragraph breaks intact (only horizontal whitespace is consumed)", () => {
    expect(stripEmDashes("Para one.\n\nPara two.")).toBe("Para one.\n\nPara two.");
  });

  it("leaves en-dashes (ranges, dates) alone", () => {
    expect(stripEmDashes("2–3 sentences, 2020–2023")).toBe("2–3 sentences, 2020–2023");
  });

  it("returns text without em-dashes unchanged", () => {
    expect(stripEmDashes("No dashes here at all.")).toBe("No dashes here at all.");
  });
});
