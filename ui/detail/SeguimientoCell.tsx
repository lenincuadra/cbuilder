"use client";

import { FileChartLine, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RegistryRow } from "@/core/registry/types";
import type { DetailTab } from "./RowDetailDrawer";

export interface SeguimientoCellProps {
  row: RegistryRow;
  /** Open the detail panel on a specific tab. */
  onOpen: (tab: DetailTab) => void;
}

/**
 * Seguimiento column cell. Icons reflect content — sticky-note (notes) and/or
 * file-chart (updates) — and each opens the panel on its tab. With no content,
 * an "Agregar" text link. All stop propagation so the row click stays generic.
 */
export function SeguimientoCell({ row, onOpen }: SeguimientoCellProps) {
  const hasNotes = Boolean(row.notes?.trim());
  const hasUpdates = Boolean(row.updates?.length);

  if (!hasNotes && !hasUpdates) {
    return (
      <Button
        variant="link"
        size="sm"
        className="h-auto p-0"
        onClick={(event) => {
          event.stopPropagation();
          onOpen("notas");
        }}
      >
        Agregar
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-0.5" onClick={(event) => event.stopPropagation()}>
      {hasNotes && (
        <Button
          variant="ghost"
          size="icon"
          title="Ver notas"
          aria-label="Ver notas"
          onClick={(event) => {
            event.stopPropagation();
            onOpen("notas");
          }}
        >
          <StickyNote className="size-4 text-primary" />
        </Button>
      )}
      {hasUpdates && (
        <Button
          variant="ghost"
          size="icon"
          title="Ver actualizaciones"
          aria-label="Ver actualizaciones"
          onClick={(event) => {
            event.stopPropagation();
            onOpen("updates");
          }}
        >
          <FileChartLine className="size-4 text-primary" />
        </Button>
      )}
    </div>
  );
}
