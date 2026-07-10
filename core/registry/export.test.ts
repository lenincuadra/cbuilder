import { describe, expect, it } from "vitest";
import { rowsToCsv, rowsToMarkdown } from "./export";
import type { RegistryRow } from "./types";

const rows: RegistryRow[] = [
  {
    code: "0628r4",
    company: "Acme, Inc.", // comma → must be quoted in CSV
    role: "UX/UI Designer",
    date: "2026-06-28",
    channel: "LinkedIn",
    focus: "payments",
    status: "Activo",
    links: {
      portfolio: "https://lenincuadra.com/r/0628r4Pp",
      linkedin: "https://lenincuadra.com/r/0628r4L",
      github: "https://lenincuadra.com/r/0628r4G",
    },
  },
];

describe("rowsToCsv", () => {
  it("has a header row and quotes cells with commas", () => {
    const csv = rowsToCsv(rows, { focusLabel: (id) => `Perfil ${id}` });
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe(
      "Código,Empresa,Rol,Fecha,Canal,Foco,Estado,Archivado,Portfolio,LinkedIn,GitHub",
    );
    expect(lines[1]).toContain('"Acme, Inc."'); // comma quoted
    expect(lines[1]).toContain("Perfil payments"); // focus label applied
    expect(lines[1]).toContain("https://lenincuadra.com/r/0628r4Pp");
    expect(lines[1]).toContain("no"); // archived = no
  });

  it("falls back to the focus id without a labeler", () => {
    expect(rowsToCsv(rows)).toContain("payments");
  });
});

describe("rowsToMarkdown", () => {
  it("builds a table with header + separator + rows", () => {
    const md = rowsToMarkdown(rows).trim().split("\n");
    expect(md[0]).toContain("| Código |");
    expect(md[1]).toMatch(/^\| --- \|/);
    expect(md[2]).toContain("Acme, Inc.");
  });
});
