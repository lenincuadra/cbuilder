"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WizardData } from "./types";

export interface StepProps {
  data: WizardData;
  set: (patch: Partial<WizardData>) => void;
}

/** Step 1 — Empresa (the only required text field). */
export function StepCompany({ data, set }: StepProps) {
  return (
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
      <p className="text-xs text-muted-foreground">
        A qué empresa estás aplicando. Es lo único obligatorio en este paso.
      </p>
    </div>
  );
}
