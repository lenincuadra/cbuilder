"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FOCUS_PROFILES, focusLabel, type FocusProfileId } from "@/core/links";
import { LanguageToggle } from "./LanguageToggle";
import type { StepProps } from "./StepCompany";
import { FOCUS_NONE } from "./types";

/** Step 3 — Idioma (EN / ES / Ambos) + foco del portfolio. Last selections before the review. */
export function StepLanguage({ data, set }: StepProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>
          Idioma <span className="text-destructive">*</span>
        </Label>
        <LanguageToggle value={data.language} onChange={(language) => set({ language })} />
        <p className="text-xs text-muted-foreground">
          Determina qué CV se genera: EN, ES o ambos.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="focus">Foco del portfolio</Label>
        <Select
          value={data.focus === "" ? FOCUS_NONE : data.focus}
          onValueChange={(value) =>
            set({
              focus:
                value == null || value === FOCUS_NONE ? "" : (value as FocusProfileId),
            })
          }
        >
          <SelectTrigger id="focus" className="w-full">
            <SelectValue>
              {(value: unknown) =>
                value && value !== FOCUS_NONE ? focusLabel(value as string) : "Sin foco"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FOCUS_NONE}>Sin foco</SelectItem>
            {FOCUS_PROFILES.map((profile) => (
              <SelectItem key={profile.id} value={profile.id}>
                {profile.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Reordena los casos del portfolio para quien abre el link del CV: destaca lo más
          afín a la empresa, sin ocultar nada.
        </p>
      </div>
    </div>
  );
}
