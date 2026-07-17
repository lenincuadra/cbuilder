"use client";

import { useState } from "react";

import { Switch } from "@/components/ui/switch";
import { toISODate } from "@/core/dates";
import { FUNNEL_STAGES } from "@/core/funnel";
import { MILESTONE_KEYS, type MilestoneKey, type Milestones } from "@/core/registry/types";
import { DatePicker } from "@/ui/wizard/DatePicker";

/** ES label per milestone, from the funnel stage list (single source of truth). */
const MILESTONE_LABELS = Object.fromEntries(
  FUNNEL_STAGES.flatMap((stage) => (stage.milestone ? [[stage.milestone, stage.label]] : [])),
) as Record<MilestoneKey, string>;

export interface MilestonesSectionProps {
  milestones: Milestones | undefined;
  /** Persist the new milestones; undefined drops the field from the row. */
  onSave: (next: Milestones | undefined) => void | Promise<void>;
}

/**
 * Structured process milestones (Seguimiento › Actualizaciones), the data
 * behind the AARRR funnel (core/funnel.ts). Toggling one on stamps today's
 * date, editable inline; every change persists immediately (no Save button,
 * like the status/archive toggles).
 */
export function MilestonesSection({ milestones, onSave }: MilestonesSectionProps) {
  const [saving, setSaving] = useState(false);
  const current = milestones ?? {};

  async function persist(next: Milestones) {
    setSaving(true);
    try {
      await onSave(Object.keys(next).length > 0 ? next : undefined);
    } finally {
      setSaving(false);
    }
  }

  function toggle(key: MilestoneKey, checked: boolean) {
    const next = { ...current };
    if (checked) next[key] = toISODate(new Date());
    else delete next[key];
    void persist(next);
  }

  return (
    <section className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">Hitos del proceso</span>
      <div className="flex flex-col gap-2 rounded-lg border p-3">
        {MILESTONE_KEYS.map((key) => {
          const value = current[key];
          return (
            <div key={key} className="flex min-h-8 items-center justify-between gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm select-none">
                <Switch
                  checked={Boolean(value)}
                  disabled={saving}
                  onCheckedChange={(checked) => toggle(key, checked)}
                />
                <span>{MILESTONE_LABELS[key]}</span>
              </label>
              {value && (
                <div className="w-36">
                  <DatePicker
                    value={new Date(`${value}T00:00:00`)}
                    onChange={(date) => void persist({ ...current, [key]: toISODate(date) })}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Estos hitos alimentan el embudo AARRR (card Embudo). Un hito posterior cuenta también los
        anteriores.
      </p>
    </section>
  );
}
