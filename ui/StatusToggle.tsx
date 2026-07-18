"use client";

import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ApplicationStatus } from "@/core/registry/types";
import { cn } from "@/lib/utils";

export interface StatusToggleProps {
  status: ApplicationStatus;
  /** Set the row to a user-settable status (Activo / Aceptado / Rechazado). */
  onSetStatus: (status: ApplicationStatus) => void;
  className?: string;
}

/** The states the user can set by hand (Borrador is system-derived). */
const SETTABLE: readonly ApplicationStatus[] = ["Activo", "Aceptado", "Rechazado"];

/**
 * Shared badge palette per status (also used by the status filter dropdown).
 * Colors mirror the funnel's outcome semantics — Activo = ámbar (en curso),
 * Aceptado = verde (terminó bien), Rechazado = rojo (terminó mal), Borrador =
 * gris — via the semantic tokens defined in globals.css.
 */
export function statusBadgeClass(status: ApplicationStatus): string {
  if (status === "Activo") {
    return "bg-warning/15 text-warning hover:bg-warning/25";
  }
  if (status === "Aceptado") {
    return "bg-success/15 text-success hover:bg-success/25";
  }
  if (status === "Rechazado") {
    return "bg-destructive/15 text-destructive hover:bg-destructive/25";
  }
  return "bg-muted text-muted-foreground";
}

/** Solid fill for a status color dot (legends, stepper, dropdown options). */
export function statusDotClass(status: ApplicationStatus): string {
  if (status === "Activo") return "bg-warning";
  if (status === "Aceptado") return "bg-success";
  if (status === "Rechazado") return "bg-destructive";
  return "bg-muted-foreground";
}

/**
 * Colored status badge. Borrador is system-derived (mirrors cvPending) — not
 * manually settable, so it renders as a plain, non-interactive badge. The other
 * three states are chosen from a dropdown (a job hunt outcome is single-valued:
 * en curso / terminó bien / terminó mal).
 */
export function StatusToggle({ status, onSetStatus, className }: StatusToggleProps) {
  if (status === "Borrador") {
    return (
      <Badge
        title="Se activa automáticamente al generar el CV"
        className={cn("border-transparent", statusBadgeClass(status), className)}
      >
        {status}
      </Badge>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            title="Cambiar estado"
            // Stop the row's click-to-open from firing when used inside the table.
            onClick={(event) => event.stopPropagation()}
            className={cn("cursor-pointer", className)}
          />
        }
      >
        <Badge className={cn("border-transparent transition-colors", statusBadgeClass(status))}>
          {status}
          <ChevronDown className="size-3" />
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={(event) => event.stopPropagation()}>
        {SETTABLE.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={status === option}
            onCheckedChange={() => onSetStatus(option)}
          >
            <span className={cn("size-2 rounded-full", statusDotClass(option))} />
            {option}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
