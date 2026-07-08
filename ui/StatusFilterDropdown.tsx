"use client";

import { CircleCheck, CircleX, Funnel, List, X, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ApplicationStatus } from "@/core/registry/types";
import { cn } from "@/lib/utils";
import { statusBadgeClass } from "@/ui/StatusToggle";

export type StatusFilter = "todos" | ApplicationStatus;

const OPTIONS: Array<{ value: StatusFilter; label: string; icon: LucideIcon }> = [
  { value: "todos", label: "Todos", icon: List },
  { value: "Activo", label: "Activo", icon: CircleCheck },
  { value: "Rechazado", label: "Rechazado", icon: CircleX },
];

export interface StatusFilterDropdownProps {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
}

/**
 * Status filter as a funnel-icon dropdown. The trigger is always icon-only;
 * when a status is active, a colored badge appears NEXT TO the button and
 * clicking it clears the filter (back to "Todos").
 */
export function StatusFilterDropdown({ value, onChange }: StatusFilterDropdownProps) {
  const active = value !== "todos";

  return (
    <div className="inline-flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              aria-label="Filtrar por estado"
              title="Filtrar por estado"
            />
          }
        >
          <Funnel className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={value === option.value}
                onCheckedChange={() => onChange(option.value)}
              >
                <Icon className="size-4 text-muted-foreground" />
                {option.label}
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {active && (
        <button
          type="button"
          onClick={() => onChange("todos")}
          title="Quitar filtro"
          aria-label={`Quitar filtro ${value}`}
          className="cursor-pointer"
        >
          <Badge className={cn("border-transparent transition-colors", statusBadgeClass(value))}>
            {value}
            <X className="size-3" />
          </Badge>
        </button>
      )}
    </div>
  );
}
