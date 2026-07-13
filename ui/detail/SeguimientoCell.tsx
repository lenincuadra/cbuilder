"use client";

import { ClockAlert, FileChartLine, FileClock, StickyNote } from "lucide-react";
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
 * Seguimiento column cell. Icons reflect content — sticky-note (notes) and/or
 * file-chart (updates) — and each opens the panel on its tab; a 🚩 after them
 * means at least one update is flagged; an amber clock-alert (front) means no
 * activity for 2+ weeks; a muted file-clock means the CV is pending. With no
 * content, an "Agregar" link.
 *
 * Only the icons/link stop propagation: empty space falls through to the row.
 */
export function SeguimientoCell({ row, onOpen }: SeguimientoCellProps) {
  const hasNotes = Boolean(row.notes?.trim());
  const hasUpdates = Boolean(row.updates?.length);
  const hasFlag = Boolean(row.updates?.some((update) => update.flag));
  const stale = isStale(row, new Date());

  return (
    <div className="flex h-8 items-center gap-0.5">
      {stale && <StaleAlert />}
      {row.cvPending && <PendingCvIcon />}
      {!hasNotes && !hasUpdates ? (
        <Button
          variant="link"
          size="sm"
          className="h-8 px-0"
          onClick={(event) => {
            event.stopPropagation();
            onOpen("notas");
          }}
        >
          Agregar
        </Button>
      ) : (
        <>
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
          {hasUpdates && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
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
          {hasFlag && (
            <span
              className="flex size-8 items-center justify-center text-base leading-none"
              title="Tiene pendientes marcados"
              aria-label="Tiene pendientes marcados"
            >
              🚩
            </span>
          )}
        </>
      )}
    </div>
  );
}
