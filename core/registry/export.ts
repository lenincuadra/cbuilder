import type { RegistryRow } from "./types";

/**
 * Export the registry mapping — the core datum of the system: a tracking code
 * back to its company, date, profile and links (the visit-notification mail only
 * carries the code; this is who it belongs to). CSV for spreadsheets, Markdown
 * for reading. `focusLabel` turns a profile id into its human label (optional).
 */
export interface ExportOptions {
  focusLabel?: (id: string) => string;
}

interface Column {
  header: string;
  value: (row: RegistryRow) => string;
}

function columns(opts: ExportOptions): Column[] {
  const focus = opts.focusLabel ?? ((id: string) => id);
  return [
    { header: "Código", value: (r) => r.code },
    { header: "Empresa", value: (r) => r.company },
    { header: "Rol", value: (r) => r.role },
    { header: "Fecha", value: (r) => r.date },
    { header: "Canal", value: (r) => r.channel ?? "" },
    { header: "Foco", value: (r) => (r.focus ? focus(r.focus) : "") },
    { header: "Estado", value: (r) => r.status },
    { header: "Archivado", value: (r) => (r.archived ? "sí" : "no") },
    { header: "Portfolio", value: (r) => r.links?.portfolio ?? "" },
    { header: "LinkedIn", value: (r) => r.links?.linkedin ?? "" },
    { header: "GitHub", value: (r) => r.links?.github ?? "" },
  ];
}

function csvCell(value: string): string {
  // Quote if the value has a comma, quote or newline; double any inner quotes.
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function rowsToCsv(rows: RegistryRow[], opts: ExportOptions = {}): string {
  const cols = columns(opts);
  const lines = [cols.map((c) => csvCell(c.header)).join(",")];
  for (const row of rows) {
    lines.push(cols.map((c) => csvCell(c.value(row))).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function mdCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export function rowsToMarkdown(rows: RegistryRow[], opts: ExportOptions = {}): string {
  const cols = columns(opts);
  const header = `| ${cols.map((c) => mdCell(c.header)).join(" | ")} |`;
  const sep = `| ${cols.map(() => "---").join(" | ")} |`;
  const body = rows.map(
    (row) => `| ${cols.map((c) => mdCell(c.value(row))).join(" | ")} |`,
  );
  return [header, sep, ...body].join("\n") + "\n";
}
