import { describe, expect, it } from "vitest";
import { profileIds, profileLabel, profilePreview } from "./profiles";
import { TEST_SPEC } from "./testSpec";

describe("profiles helpers", () => {
  it("labels a profile in Spanish, falling back to the id", () => {
    expect(profileLabel(TEST_SPEC, "payments")).toBe("Para plataformas de pagos");
    expect(profileLabel(TEST_SPEC, "payments", "en")).toBe("For payment platforms");
    expect(profileLabel(TEST_SPEC, "unknown")).toBe("unknown");
  });

  it("lists the profile ids from the spec", () => {
    expect(profileIds(TEST_SPEC)).toEqual(["payments"]);
  });

  it("builds the preview from featured case + proofs", () => {
    const preview = profilePreview(TEST_SPEC, "payments");
    expect(preview?.label).toBe("Para plataformas de pagos");
    expect(preview?.featured?.title).toBe("Ecosistema Fintech");
    expect(preview?.proofs).toEqual(["lanzó…"]);
    expect(profilePreview(TEST_SPEC, "unknown")).toBeNull();
  });
});
