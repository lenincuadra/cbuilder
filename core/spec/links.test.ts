import { describe, expect, it } from "vitest";
import { buildTrackedLinks } from "./links";
import { TEST_SPEC } from "./testSpec";

describe("buildTrackedLinks", () => {
  it("builds the three short links without focus", () => {
    expect(buildTrackedLinks(TEST_SPEC, "0628r4")).toEqual({
      portfolio: "https://lenincuadra.com/r/0628r4P",
      linkedin: "https://lenincuadra.com/r/0628r4L",
      github: "https://lenincuadra.com/r/0628r4G",
    });
  });

  it("appends the profile letter to the portfolio short link when focused", () => {
    expect(buildTrackedLinks(TEST_SPEC, "0628r4", "payments")).toEqual({
      portfolio: "https://lenincuadra.com/r/0628r4Pp", // payments → "p"
      linkedin: "https://lenincuadra.com/r/0628r4L",
      github: "https://lenincuadra.com/r/0628r4G",
    });
  });

  it("falls back to the plain portfolio link for an unknown focus", () => {
    expect(buildTrackedLinks(TEST_SPEC, "0628r4", "nope").portfolio).toBe(
      "https://lenincuadra.com/r/0628r4P",
    );
  });
});
