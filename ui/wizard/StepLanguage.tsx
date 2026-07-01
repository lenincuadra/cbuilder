"use client";

import { Label } from "@/components/ui/label";
import { LanguageToggle } from "./LanguageToggle";
import type { StepProps } from "./StepCompany";

/** Step 3 — Idioma (EN / ES / Ambos). Last selection before the review. */
export function StepLanguage({ data, set }: StepProps) {
  return (
    <div className="space-y-2">
      <Label>
        Idioma <span className="text-destructive">*</span>
      </Label>
      <LanguageToggle value={data.language} onChange={(language) => set({ language })} />
      <p className="text-xs text-muted-foreground">
        Determina qué CV se genera: EN, ES o ambos.
      </p>
    </div>
  );
}
