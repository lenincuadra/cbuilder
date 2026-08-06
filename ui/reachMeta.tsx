import { Magnet, Megaphone, type LucideIcon } from "lucide-react";

import type { ReachType } from "@/core/registry/types";
import { cn } from "@/lib/utils";
import type { IconSelectOption } from "@/ui/IconSelect";

/**
 * Per-reach display metadata (opposite pair): the short name shown in menus, a
 * descriptive hint for tooltips, the icon and its color. Shared by the table
 * toggle (`ReachToggle`) and the wizard's IconSelect.
 */
export const REACH_META: Record<
  ReachType,
  { name: string; hint: string; Icon: LucideIcon; color: string }
> = {
  inbound: {
    name: "Inbound",
    hint: "Inbound — te contactaron",
    Icon: Magnet,
    color: "text-green-600 dark:text-green-500",
  },
  outbound: {
    name: "Outbound",
    hint: "Outbound — contactaste vos",
    Icon: Megaphone,
    color: "text-blue-600 dark:text-blue-500",
  },
};

export const REACH_VALUES = Object.keys(REACH_META) as ReachType[];

/** Options for an IconSelect (icon + short label) — the wizard's Reach field. */
export const REACH_OPTIONS: IconSelectOption<ReachType>[] = REACH_VALUES.map((value) => {
  const { name, Icon, color } = REACH_META[value];
  return { value, label: name, icon: <Icon className={cn("size-4", color)} /> };
});
