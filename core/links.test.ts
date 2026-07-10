import { describe, expect, it } from "vitest";
import { focusLabel } from "./links";

describe("focusLabel", () => {
  it("maps a profile id to its Spanish label", () => {
    expect(focusLabel("payments")).toBe("Para plataformas de pagos");
  });

  it("falls back to the raw id for unknown profiles", () => {
    expect(focusLabel("unknown")).toBe("unknown");
  });
});
