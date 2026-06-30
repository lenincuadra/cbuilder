"use client";

import { FileChartLine, Plus, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RegistryRow } from "@/core/registry/types";

export interface SeguimientoCellProps {
  row: RegistryRow;
  onOpen: () => void;
}

/**
 * Seguimiento column cell: icons reflect what the row has — sticky-note if there
 * are notes, file-chart if there are updates, a muted "+" if neither.
 */
export function SeguimientoCell({ row, onOpen }: SeguimientoCellProps) {
  const hasNotes = Boolean(row.notes?.trim());
  const hasUpdates = Boolean(row.updates?.length);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onOpen}
      title="Abrir seguimiento"
      aria-label="Abrir seguimiento"
      className="gap-1.5"
    >
      {hasNotes && <StickyNote className="size-4 text-primary" />}
      {hasUpdates && <FileChartLine className="size-4 text-primary" />}
      {!hasNotes && !hasUpdates && <Plus className="size-4 text-muted-foreground" />}
    </Button>
  );
}
