import { describe, expect, it } from "vitest";
import { focusLabel, trackedLinks } from "./links";

describe("trackedLinks", () => {
  it("builds the three links without focus", () => {
    expect(trackedLinks("0628r4")).toEqual({
      portfolio: "https://lenincuadra.com/?ref=0628r4P",
      linkedin: "https://lenincuadra.com/go.html?ref=0628r4L&dest=linkedin",
      github: "https://lenincuadra.com/go.html?ref=0628r4G&dest=github",
    });
  });

  it("appends the focus profile to all links", () => {
    expect(trackedLinks("0628r4", "payments")).toEqual({
      portfolio: "https://lenincuadra.com/?ref=0628r4P&focus=payments",
      linkedin: "https://lenincuadra.com/go.html?ref=0628r4L&dest=linkedin&focus=payments",
      github: "https://lenincuadra.com/go.html?ref=0628r4G&dest=github&focus=payments",
    });
  });
});

describe("focusLabel", () => {
  it("maps a profile id to its Spanish label", () => {
    expect(focusLabel("payments")).toBe("Para plataformas de pagos");
  });

  it("falls back to the raw id for unknown profiles", () => {
    expect(focusLabel("unknown")).toBe("unknown");
  });
});
