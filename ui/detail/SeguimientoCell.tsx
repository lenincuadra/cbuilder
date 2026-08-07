"use client";

import { ClockAlert, FileClock, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { RegistryRow } from "@/core/registry/types";
import { isStale } from "@/core/staleness";
import type { DetailTab } from "./RowDetailDrawer";

export interface SeguimientoCellProps {
  row: RegistryRow;
  /** Open the detail panel on a specific tab. */
  onOpen: (tab: DetailTab) => void;
}

/** Amber alert shown when the row has had no activity for 2+ weeks. */
function StaleAlert() {
  return (
    <Tooltip>
      <TooltipTrigger className="flex size-8 cursor-default items-center justify-center text-amber-500">
        <ClockAlert className="size-4" />
      </TooltipTrigger>
      <TooltipContent>Sin novedades hace 2+ semanas — pedí feedback o cerrá la búsqueda.</TooltipContent>
    </Tooltip>
  );
}

/** Muted file-clock shown while the process has no CV generated yet. */
function PendingCvIcon() {
  return (
    <Tooltip>
      <TooltipTrigger className="flex size-8 cursor-default items-center justify-center text-muted-foreground">
        <FileClock className="size-4" />
      </TooltipTrigger>
      <TooltipContent>CV pendiente — generalo desde el detalle de la fila.</TooltipContent>
    </Tooltip>
  );
}

/**
 * Seguimiento column cell: a compact, read-only status summary of the row's
 * follow-up — icons only, no call to action. Content indicators come first: a
 * sticky-note (the row has notes; click opens the Notas tab) and a 🚩 (an update
 * is flagged). Then row-status alerts trail: an amber clock-alert (no activity for
 * 2+ weeks) and a muted file-clock (CV still pending). When the row has none of
 * these the cell is empty; clicking it (like any cell) falls through to open the
 * row's detail panel — which is also how you add notes/updates now.
 *
 * (The old "Agregar" link was dropped: it only opened Notas, a narrow slice of
 * the follow-up, and duplicated the row's own click. See docs/decisions.md.)
 *
 * Only the note icon stops propagation; everything else falls through to the row.
 */
export function SeguimientoCell({ row, onOpen }: SeguimientoCellProps) {
  const hasNotes = Boolean(row.notes?.trim());
  const hasFlag = Boolean(row.updates?.some((update) => update.flag));
  const stale = isStale(row, new Date());

  return (
    <div className="flex h-8 items-center gap-0.5">
      {hasNotes && (
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          title="Ver notas"
          aria-label="Ver notas"
          onClick={(event) => {
            event.stopPropagation();
            onOpen("notas");
          }}
        >
          <StickyNote className="size-4 fill-primary/30 text-primary" />
        </Button>
      )}
      {hasFlag && (
        <span
          className="flex size-8 items-center justify-center text-base leading-none"
          title="Tiene pendientes marcados"
          aria-label="Tiene pendientes marcados"
        >
          🚩
        </span>
      )}
      {stale && <StaleAlert />}
      {row.cvPending && <PendingCvIcon />}
    </div>
  );
}
