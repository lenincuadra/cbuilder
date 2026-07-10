"use client";

import { Label } from "@/components/ui/label";
import { FOCUS_PROFILES, type FocusProfileId } from "@/core/links";
import { FocusIcon } from "@/ui/FocusIcon";
import { IconSelect, type IconSelectOption } from "@/ui/IconSelect";
import { LanguageToggle } from "./LanguageToggle";
import type { StepProps } from "./StepCompany";
import { FOCUS_NONE } from "./types";

/** "Sin foco" + one option per profile, each with its table icon. */
const FOCUS_OPTIONS: IconSelectOption<string>[] = [
  { value: FOCUS_NONE, label: "Sin foco" },
  ...FOCUS_PROFILES.map((profile) => ({
    value: profile.id,
    label: profile.label,
    icon: <FocusIcon focus={profile.id} className="size-4 text-muted-foreground" />,
  })),
];

/** Step 3 — Idioma (EN / ES / Ambos) + foco del portfolio. Last selections before the review. */
export function StepLanguage({ data, set, container }: StepProps) {
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
        <IconSelect
          id="focus"
          aria-label="Foco del portfolio"
          value={data.focus === "" ? FOCUS_NONE : data.focus}
          onChange={(value) =>
            set({ focus: value === FOCUS_NONE ? "" : (value as FocusProfileId) })
          }
          options={FOCUS_OPTIONS}
          container={container}
        />
        <p className="text-xs text-muted-foreground">
          Reordena los casos del portfolio para quien abre el link del CV: destaca lo más
          afín a la empresa, sin ocultar nada.
        </p>
      </div>
    </div>
  );
}
