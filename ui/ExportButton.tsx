"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { rowsToCsv, rowsToMarkdown } from "@/core/registry/export";
import type { RegistryRow } from "@/core/registry/types";
import { profileLabel } from "@/core/spec/profiles";
import { downloadText } from "@/lib/download";
import { useSpec } from "@/ui/useSpec";

/** Export the registry mapping (code → company / focus / links) to CSV or Markdown. */
export function ExportButton({ rows }: { rows: RegistryRow[] }) {
  const { spec } = useSpec();
  const opts = { focusLabel: (id: string) => (spec ? profileLabel(spec, id) : id) };
  const stamp = new Date().toISOString().slice(0, 10);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" disabled={rows.length === 0} aria-label="Exportar" />
        }
      >
        <Download className="size-4" />
        Exportar
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => downloadText(rowsToCsv(rows, opts), `registro_${stamp}.csv`, "text/csv")}
        >
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            downloadText(rowsToMarkdown(rows, opts), `registro_${stamp}.md`, "text/markdown")
          }
        >
          Markdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
