"use client";

import { Label } from "@/components/ui/label";
import { DatePicker } from "./DatePicker";
import { LanguageToggle } from "./LanguageToggle";
import type { StepProps } from "./StepCompany";

/** Step 2 — Idioma (3-state toggle) + Fecha (default hoy, editable). */
export function StepLanguageDate({ data, set }: StepProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>
          Idioma <span className="text-destructive">*</span>
        </Label>
        <LanguageToggle value={data.language} onChange={(language) => set({ language })} />
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
