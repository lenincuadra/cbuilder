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
 * Seguimiento column cell. A sticky-note icon (notes, opens its tab) and a 🚩
 * when an update is flagged; an amber clock-alert (front) means no activity for
 * 2+ weeks; a muted file-clock (last, so "Agregar" stays left-aligned) means the
 * CV is pending. With no notes/flag, an "Agregar" link. (The "ver actualizaciones"
 * shortcut was dropped: every process now carries updates, so it stopped
 * differentiating rows — open the row to see them.)
 *
 * Only the icons/link stop propagation: empty space falls through to the row.
 */
export function SeguimientoCell({ row, onOpen }: SeguimientoCellProps) {
  const hasNotes = Boolean(row.notes?.trim());
  const hasFlag = Boolean(row.updates?.some((update) => update.flag));
  const stale = isStale(row, new Date());

  return (
    <div className="flex h-8 items-center gap-0.5">
      {stale && <StaleAlert />}
      {!hasNotes && !hasFlag ? (
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
      {/* Last, so the "Agregar" link stays left-aligned across rows. */}
      {row.cvPending && <PendingCvIcon />}
    </div>
  );
}
