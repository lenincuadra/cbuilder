"use client";

import { HeartHandshake } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ReachType } from "@/core/registry/types";
import { cn } from "@/lib/utils";
import { REACH_META, REACH_VALUES } from "@/ui/reachMeta";

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
            title={current ? current.hint : "Definir reach (inbound / outbound)"}
            aria-label={current ? current.hint : "Definir reach"}
            // Stop the row's click-to-open from firing when used inside the table.
            onClick={(event) => event.stopPropagation()}
            className="inline-flex cursor-pointer items-center justify-center"
          />
        }
      >
        <CurrentIcon className={cn("size-4", current ? current.color : "text-muted-foreground/50")} />
      </DropdownMenuTrigger>
      {/* min-w-40 overrides the default anchor-width popup (the trigger is a tiny
          icon, so it'd otherwise clamp to min-w-32 and wrap). */}
      <DropdownMenuContent
        align="start"
        className="min-w-40"
        onClick={(event) => event.stopPropagation()}
      >
        {REACH_VALUES.map((value) => {
          const { name, Icon, color } = REACH_META[value];
          return (
            <DropdownMenuCheckboxItem
              key={value}
              checked={reach === value}
              onCheckedChange={(checked) => onSetReach(checked ? value : undefined)}
            >
              <Icon className={cn("size-4", color)} />
              {name}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
