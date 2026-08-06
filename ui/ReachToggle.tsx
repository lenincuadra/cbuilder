"use client";

import { HeartHandshake, Magnet, Megaphone, type LucideIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ReachType } from "@/core/registry/types";
import { cn } from "@/lib/utils";

/** Icon, color and label per reach direction (opposite pair). */
const REACH_META: Record<ReachType, { label: string; Icon: LucideIcon; color: string }> = {
  inbound: {
    label: "Inbound — te contactaron",
    Icon: Magnet,
    color: "text-green-600 dark:text-green-500",
  },
  outbound: {
    label: "Outbound — contactaste vos",
    Icon: Megaphone,
    color: "text-blue-600 dark:text-blue-500",
  },
};

const REACH_VALUES = Object.keys(REACH_META) as ReachType[];

export interface ReachToggleProps {
  reach?: ReachType;
  /** Set the reach, or clear it (undefined) by re-selecting the active one. */
  onSetReach: (reach: ReachType | undefined) => void;
}

/**
 * Reach column toggle: inbound (a recruiter/contact reached out — Magnet, verde)
 * vs outbound (Lenin reached out — Megaphone, azul). Optional; re-selecting the
 * active one clears it. Set inline from the table like StatusToggle, so it stops
 * the row's click-to-open. Unset shows a faint heart-handshake (the column icon).
 */
export function ReachToggle({ reach, onSetReach }: ReachToggleProps) {
  const current = reach ? REACH_META[reach] : null;
  const CurrentIcon = current?.Icon ?? HeartHandshake;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            title={current ? current.label : "Definir reach (inbound / outbound)"}
            aria-label={current ? current.label : "Definir reach"}
            // Stop the row's click-to-open from firing when used inside the table.
            onClick={(event) => event.stopPropagation()}
            className="inline-flex cursor-pointer items-center justify-center"
          />
        }
      >
        <CurrentIcon className={cn("size-4", current ? current.color : "text-muted-foreground/50")} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={(event) => event.stopPropagation()}>
        {REACH_VALUES.map((value) => {
          const { label, Icon, color } = REACH_META[value];
          return (
            <DropdownMenuCheckboxItem
              key={value}
              checked={reach === value}
              onCheckedChange={(checked) => onSetReach(checked ? value : undefined)}
            >
              <Icon className={cn("size-4", color)} />
              {label}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
