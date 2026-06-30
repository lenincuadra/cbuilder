"use client";

import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus } from "@/core/registry/types";
import { cn } from "@/lib/utils";

export interface StatusToggleProps {
  status: ApplicationStatus;
  onToggle: () => void;
  className?: string;
}

/** Colored status badge that toggles Activo <-> Rechazado on click. */
export function StatusToggle({ status, onToggle, className }: StatusToggleProps) {
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
      <Badge
        className={cn(
          "border-transparent transition-colors",
          status === "Activo"
            ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300"
            : "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300",
        )}
      >
        {status}
      </Badge>
    </button>
  );
}
