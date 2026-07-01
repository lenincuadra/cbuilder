"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "./DatePicker";
import type { WizardData } from "./types";

export interface StepProps {
  data: WizardData;
  set: (patch: Partial<WizardData>) => void;
}

/** Step 1 — Empresa (required) + Fecha de aplicación (default hoy). */
export function StepCompany({ data, set }: StepProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="company">
          Empresa <span className="text-destructive">*</span>
        </Label>
        <Input
          id="company"
          autoFocus
          placeholder="GlobalLogic"
          value={data.company}
          onChange={(event) => set({ company: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>
          Fecha de aplicación <span className="text-destructive">*</span>
        </Label>
        <DatePicker value={data.date} onChange={(date) => set({ date })} />
        <p className="text-xs text-muted-foreground">
          Forma parte del código de tracking. Default: hoy.
        </p>
      </div>
    </div>
  );
}
