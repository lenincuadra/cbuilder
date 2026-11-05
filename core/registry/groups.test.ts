import { describe, expect, it } from "vitest";
import { buildSections, groupNames, groupOf } from "./groups";
import type { RegistryRow } from "./types";

function row(code: string, extra: Partial<RegistryRow> = {}): RegistryRow {
  return { code, company: code, role: "UX", date: "2026-11-01", status: "Activo", ...extra };
}

describe("groupOf / groupNames", () => {
  it("trims and treats blank as ungrouped", () => {
    expect(groupOf(row("a", { group: "  Fintech " }))).toBe("Fintech");
    expect(groupOf(row("b", { group: "   " }))).toBe("");
    expect(groupOf(row("c"))).toBe("");
  });

  it("lists distinct names alphabetically", () => {
    const rows = [row("a", { group: "fintech" }), row("b", { group: "Espero" }), row("c", { group: "fintech" }), row("d")];
    expect(groupNames(rows)).toEqual(["Espero", "fintech"]);
  });
});

describe("buildSections", () => {
  it("orders groups, then Sin grupo, then Archivado", () => {
    const sections = buildSections([
      row("a"),
      row("b", { group: "Fintech" }),
      row("c", { group: "Espero respuesta" }),
      row("d", { archived: true }),
    ]);
    expect(sections.map((s) => s.label)).toEqual(["Espero respuesta", "Fintech", "Sin grupo", "Archivado"]);
  });

  it("puts archived rows in Archivado even when they have a group", () => {
    const sections = buildSections([row("a", { group: "Fintech", archived: true })]);
    expect(sections).toHaveLength(1);
    expect(sections[0].kind).toBe("archived");
  });

  it("drops empty sections", () => {
    expect(buildSections([row("a")]).map((s) => s.kind)).toEqual(["ungrouped"]);
    expect(buildSections([])).toEqual([]);
  });

  it("keeps the input order inside a section", () => {
    const [section] = buildSections([row("z", { group: "G" }), row("a", { group: "G" })]);
    expect(section.rows.map((r) => r.code)).toEqual(["z", "a"]);
  });
});
