"use client";

import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus } from "@/core/registry/types";
import { cn } from "@/lib/utils";

export interface StatusToggleProps {
  status: ApplicationStatus;
  onToggle: () => void;
  className?: string;
}

/** Shared badge palette for a status (also used by the status filter dropdown). */
export function statusBadgeClass(status: ApplicationStatus): string {
  if (status === "Activo") {
    return "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300";
  }
  if (status === "Rechazado") {
    return "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300";
  }
  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

/**
 * Colored status badge that toggles Activo <-> Rechazado on click. Borrador
 * is system-derived (mirrors cvPending) — not manually settable, so it
 * renders as a plain, non-interactive badge instead of a toggle button.
 */
export function StatusToggle({ status, onToggle, className }: StatusToggleProps) {
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
  const next: ApplicationStatus = status === "Activo" ? "Rechazado" : "Activo";
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      title={`Cambiar a ${next}`}
      className={cn("cursor-pointer", className)}
    >
      <Badge className={cn("border-transparent transition-colors", statusBadgeClass(status))}>
        {status}
      </Badge>
    </button>
  );
}
