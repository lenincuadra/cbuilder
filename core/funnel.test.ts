import { describe, expect, it } from "vitest";
import { computeFunnel, FUNNEL_STAGES } from "./funnel";
import type { ApplicationStatus, Milestones, RegistryRow } from "./registry/types";

let seq = 0;

function row(status: ApplicationStatus, milestones?: Milestones): RegistryRow {
  seq += 1;
  return {
    code: `0701a${seq}`,
    company: `ACME ${seq}`,
    role: "UX/UI Designer",
    date: "2026-07-01",
    status,
    ...(milestones ? { milestones } : {}),
  };
}

function counts(rows: RegistryRow[]): number[] {
  return computeFunnel(rows).map((stage) => stage.count);
}

describe("FUNNEL_STAGES", () => {
  it("is the six AARRR stages in order, A A A R R R", () => {
    expect(FUNNEL_STAGES.map((s) => s.id)).toEqual([
      "awareness",
      "acquisition",
      "activation",
      "retention",
      "revenue",
      "referral",
    ]);
    expect(FUNNEL_STAGES.map((s) => s.letter).join("")).toBe("AAARRR");
  });
});

describe("computeFunnel", () => {
  it("returns all zeros and null percentages for an empty registry", () => {
    const stages = computeFunnel([]);
    expect(stages.map((s) => s.count)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(stages.every((s) => s.pctOfTotal === null && s.pctOfPrev === null)).toBe(true);
  });

  it("counts Borrador rows in Awareness only", () => {
    expect(counts([row("Borrador"), row("Borrador")])).toEqual([2, 0, 0, 0, 0, 0]);
  });

  it("counts a typical mix stage by stage", () => {
    const rows = [
      row("Borrador"),
      row("Activo"),
      row("Rechazado"),
      row("Activo", { responded: "2026-07-02" }),
      row("Activo", { responded: "2026-07-02", interview: "2026-07-05" }),
      row("Activo", {
        responded: "2026-07-02",
        interview: "2026-07-05",
        offer: "2026-07-10",
        referral: "2026-07-12",
      }),
    ];
    expect(counts(rows)).toEqual([6, 5, 3, 2, 1, 1]);
  });

  it("counts a later milestone in the earlier stages too (cumulative)", () => {
    const rows = [row("Activo", { interview: "2026-07-05" })];
    expect(counts(rows)).toEqual([1, 1, 1, 1, 0, 0]);
  });

  it("counts a Borrador row with a milestone as acquired (monotonicity guard)", () => {
    const rows = [row("Borrador", { responded: "2026-07-02" })];
    expect(counts(rows)).toEqual([1, 1, 1, 0, 0, 0]);
  });

  it("is monotonically decreasing for any mix", () => {
    const rows = [
      row("Borrador"),
      row("Borrador", { offer: "2026-07-10" }),
      row("Activo"),
      row("Activo", { referral: "2026-07-12" }),
      row("Rechazado", { responded: "2026-07-02", interview: "2026-07-05" }),
    ];
    const result = counts(rows);
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeLessThanOrEqual(result[i - 1]);
    }
  });

  it("computes pctOfTotal against Awareness and pctOfPrev against the previous stage", () => {
    const rows = [
      row("Borrador"),
      row("Activo"),
      row("Activo", { responded: "2026-07-02" }),
      row("Activo", { interview: "2026-07-05" }),
    ];
    const stages = computeFunnel(rows); // counts: 4, 3, 2, 1, 0, 0
    expect(stages[0].pctOfTotal).toBe(100);
    expect(stages[0].pctOfPrev).toBeNull();
    expect(stages[1].pctOfPrev).toBe(75);
    expect(stages[2].pctOfPrev).toBe(67);
    expect(stages[3].pctOfTotal).toBe(25);
    expect(stages[4].pctOfPrev).toBe(0);
  });

  it("nulls pctOfPrev when the previous stage counted 0", () => {
    const stages = computeFunnel([row("Borrador")]); // counts: 1, 0, 0, ...
    expect(stages[1].pctOfPrev).toBe(0);
    expect(stages[2].pctOfPrev).toBeNull();
  });
});

describe("computeFunnel byStatus", () => {
  it("splits each reached stage by the row's outcome (cumulative)", () => {
    const rows = [
      row("Borrador"), // draft, awareness only
      row("Activo"), // active, up to acquisition
      row("Rechazado", { responded: "2026-07-02" }), // rejected, up to activation
      row("Aceptado", { responded: "2026-07-02", interview: "2026-07-05", offer: "2026-07-10" }),
    ];
    const stages = computeFunnel(rows);
    // Awareness: everyone.
    expect(stages[0].byStatus).toEqual({ accepted: 1, active: 1, rejected: 1, draft: 1 });
    // Acquisition: the draft drops (not sent).
    expect(stages[1].byStatus).toEqual({ accepted: 1, active: 1, rejected: 1, draft: 0 });
    // Activation: only rejected + accepted reached.
    expect(stages[2].byStatus).toEqual({ accepted: 1, active: 0, rejected: 1, draft: 0 });
    // Retention onward: only the accepted row — it reaches the very end.
    expect(stages[3].byStatus).toEqual({ accepted: 1, active: 0, rejected: 0, draft: 0 });
    expect(stages[4].byStatus).toEqual({ accepted: 1, active: 0, rejected: 0, draft: 0 });
    // Referral (the end): the accepted row still counts, it's the only one.
    expect(stages[5].byStatus).toEqual({ accepted: 1, active: 0, rejected: 0, draft: 0 });
  });

  it("counts an Aceptado row through every stage, even with no milestones", () => {
    const stages = computeFunnel([row("Aceptado")]);
    expect(stages.map((s) => s.count)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(stages.every((s) => s.byStatus.accepted === 1)).toBe(true);
  });

  it("keeps byStatus totals equal to the stage count", () => {
    const rows = [
      row("Activo"),
      row("Rechazado", { responded: "2026-07-02" }),
      row("Aceptado", { offer: "2026-07-10" }),
    ];
    for (const stage of computeFunnel(rows)) {
      const { accepted, active, rejected, draft } = stage.byStatus;
      expect(accepted + active + rejected + draft).toBe(stage.count);
    }
  });
});
