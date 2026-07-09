"use client";

import type { ReactNode } from "react";
import { ChevronDownIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface IconSelectOption<T extends string> {
  value: T;
  label: string;
  /** Same icon shown for this value elsewhere (e.g. the registry table). */
  icon?: ReactNode;
}

export interface IconSelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: IconSelectOption<T>[];
  id?: string;
  "aria-label"?: string;
  /** Portal target for the menu (the drawer node) so it keeps its focus/pe scope. */
  container?: HTMLElement | null;
  className?: string;
}

/**
 * Single-select dropdown that shows a per-option icon, built on the DS
 * DropdownMenu (checkbox-items pattern) — the SAME component the status filter
 * uses, so every icon-bearing dropdown is consistent (see docs/DESIGN.md). The
 * trigger mirrors the Select trigger's look and shows the current icon + label;
 * the checked item carries the ✓ on the right.
 */
export function IconSelect<T extends string>({
  value,
  onChange,
  options,
  id,
  container,
  className,
  ...aria
}: IconSelectProps<T>) {
  const selected = options.find((option) => option.value === value);
  return (
    <DropdownMenu modal={container ? false : undefined}>
      <DropdownMenuTrigger
        id={id}
        aria-label={aria["aria-label"]}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {selected?.icon}
          <span className="truncate">{selected?.label}</span>
        </span>
        <ChevronDownIcon className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent container={container}>
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={option.value === value}
            onCheckedChange={() => onChange(option.value)}
          >
            {option.icon}
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
