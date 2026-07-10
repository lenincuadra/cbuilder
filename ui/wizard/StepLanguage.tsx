"use client";

import { Label } from "@/components/ui/label";
import { profileIds, profileLabel, profilePreview } from "@/core/spec/profiles";
import type { LinkSpec } from "@/core/spec/types";
import { FocusIcon } from "@/ui/FocusIcon";
import { IconSelect, type IconSelectOption } from "@/ui/IconSelect";
import { LanguageToggle } from "./LanguageToggle";
import type { StepProps } from "./StepCompany";
import { FOCUS_NONE } from "./types";

/** "Sin foco" + one option per spec profile, each with its icon. */
function focusOptions(spec: LinkSpec | null): IconSelectOption<string>[] {
  const options: IconSelectOption<string>[] = [{ value: FOCUS_NONE, label: "Sin foco" }];
  if (!spec) return options;
  for (const id of profileIds(spec)) {
    options.push({
      value: id,
      label: profileLabel(spec, id),
      icon: <FocusIcon focus={id} className="size-4 text-muted-foreground" />,
    });
  }
  return options;
}

/** Preview of what the recruiter sees when opening a focused link (Uso A). */
function FocusPreview({ spec, focus }: { spec: LinkSpec; focus: string }) {
  const preview = profilePreview(spec, focus);
  if (!preview) return null;
  return (
    <div className="space-y-2 rounded-lg border border-ring/20 bg-accent/20 p-3 text-xs">
      <div className="flex items-center gap-1.5 font-medium">
        <FocusIcon focus={focus} className="size-3.5 shrink-0 text-muted-foreground" />
        Lo que verá quien abra el link
      </div>
      {preview.featured && (
        <p className="text-muted-foreground">
          Destaca <span className="font-medium text-foreground">{preview.featured.title}</span>:{" "}
          {preview.featured.description}
        </p>
      )}
      {preview.proofs.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
          {preview.proofs.map((proof) => (
            <li key={proof}>{proof}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Step 3 — Idioma (EN / ES / Ambos) + foco del portfolio (perfiles del spec). */
export function StepLanguage({ data, set, container, spec }: StepProps) {
  const specValue = spec ?? null;
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
          onChange={(value) => set({ focus: value === FOCUS_NONE ? "" : value })}
          options={focusOptions(specValue)}
          container={container}
        />
        <p className="text-xs text-muted-foreground">
          Reordena los casos del portfolio para quien abre el link del CV: destaca lo más
          afín a la empresa, sin ocultar nada.
        </p>
        {specValue && data.focus !== "" && <FocusPreview spec={specValue} focus={data.focus} />}
      </div>
    </div>
  );
}
