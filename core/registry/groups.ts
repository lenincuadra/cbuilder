import type { RegistryRow } from "./types";

/**
 * Registry sections: user-defined groups (one per row, `row.group`) shown as
 * collapsible sections of the same table. Order (docs/decisions.md → "Grupos"):
 * named groups alphabetically, then the ungrouped rows, then Archivado last.
 * Archived rows always land in Archivado regardless of their group — they keep
 * `group`, so unarchiving puts them back where they were.
 *
 * Groups have no table of their own: a group exists while at least one row
 * carries its name (derived, like the funnel).
 */

export type SectionKind = "group" | "ungrouped" | "archived";

export interface RegistrySection {
  /** Stable key (collapse state is remembered per key). */
  key: string;
  kind: SectionKind;
  /** Header label: the group name, "Sin grupo" or "Archivado". */
  label: string;
  rows: RegistryRow[];
}

export const UNGROUPED_KEY = "__ungrouped__";
export const ARCHIVED_KEY = "__archived__";

/** Normalized group name of a row ("" when ungrouped). */
export function groupOf(row: Pick<RegistryRow, "group">): string {
  return row.group?.trim() ?? "";
}

/** Distinct group names across all rows (archived included), alphabetical. */
export function groupNames(rows: Pick<RegistryRow, "group">[]): string[] {
  const names = new Set(rows.map(groupOf).filter((name) => name !== ""));
  return [...names].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}

/**
 * Split rows into ordered sections. Empty sections are dropped, so a filter
 * that leaves a group with no rows hides its header too. Row order inside a
 * section is preserved from the input.
 */
export function buildSections(rows: RegistryRow[]): RegistrySection[] {
  const live = rows.filter((row) => !row.archived);
  const sections: RegistrySection[] = groupNames(live).map((name) => ({
    key: `group:${name}`,
    kind: "group",
    label: name,
    rows: live.filter((row) => groupOf(row) === name),
  }));
  sections.push({
    key: UNGROUPED_KEY,
    kind: "ungrouped",
    label: "Sin grupo",
    rows: live.filter((row) => groupOf(row) === ""),
  });
  sections.push({
    key: ARCHIVED_KEY,
    kind: "archived",
    label: "Archivado",
    rows: rows.filter((row) => row.archived),
  });
  return sections.filter((section) => section.rows.length > 0);
}
