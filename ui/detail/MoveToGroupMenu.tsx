"use client";

import { useState } from "react";
import { Check, FolderInput, Plus, X } from "lucide-react";

import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { groupOf } from "@/core/registry/groups";
import type { RegistryRow } from "@/core/registry/types";

function sameName(a: string, b: string): boolean {
  return a.localeCompare(b, "es", { sensitivity: "base" }) === 0;
}

export interface MoveToGroupMenuProps {
  row: RegistryRow;
  /** Existing group names (all rows). */
  groups: string[];
  /** Set the row's group ("" = Sin grupo). */
  onMove: (group: string) => void;
  /** Drawer node the submenu portals into (focus / pointer-events scope). */
  container?: HTMLElement | null;
}

/**
 * "Mover a grupo ›" submenu for the row's actions menu: a text field on top
 * that filters the existing groups and offers "Crear «…»" for a new name
 * (Enter picks the first option), then the groups. The current group is
 * checked; hovering/highlighting it swaps the check for an × + "Quitar", and
 * clicking it removes the row from the group (no separate remove item).
 * One group per row.
 */
export function MoveToGroupMenu({ row, groups, onMove, container }: MoveToGroupMenuProps) {
  const [query, setQuery] = useState("");
  const current = groupOf(row);
  const typed = query.trim();
  const matches = groups.filter((group) => group.toLowerCase().includes(typed.toLowerCase()));
  const canCreate = typed !== "" && !groups.some((group) => sameName(group, typed));

  return (
    <DropdownMenuSub onOpenChange={(open) => !open && setQuery("")}>
      <DropdownMenuSubTrigger>
        <FolderInput />
        Mover a grupo
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent container={container} className="w-56">
        <input
          aria-label="Buscar o crear un grupo"
          placeholder="Buscar o crear un grupo"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            // Keep typing out of the menu's typeahead / item navigation.
            if (event.key === "Escape" || event.key === "ArrowDown") return;
            event.stopPropagation();
            if (event.key === "Enter") {
              event.preventDefault();
              const pick = matches[0] ?? (canCreate ? typed : undefined);
              if (pick !== undefined) onMove(pick);
            }
          }}
          className="mb-1 w-full border-b bg-transparent px-1.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        {canCreate && (
          <DropdownMenuItem onClick={() => onMove(typed)}>
            <Plus />
            <span className="truncate">Crear «{typed}»</span>
          </DropdownMenuItem>
        )}
        {matches.map((group) =>
          group === current ? (
            <DropdownMenuItem
              key={group}
              className="group/current"
              title="Quitar del grupo"
              onClick={() => onMove("")}
            >
              <Check className="group-data-highlighted/current:hidden" />
              <X className="hidden group-data-highlighted/current:block" />
              <span className="truncate">{group}</span>
              <span className="ml-auto hidden pl-2 text-xs text-muted-foreground group-data-highlighted/current:inline">
                Quitar
              </span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem key={group} onClick={() => onMove(group)}>
              <span className="size-4" />
              <span className="truncate">{group}</span>
            </DropdownMenuItem>
          ),
        )}
        {!canCreate && matches.length === 0 && (
          <p className="px-1.5 py-1 text-xs text-muted-foreground">Escribí un nombre para crear uno.</p>
        )}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
