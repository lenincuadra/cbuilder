"use client";

import { useEffect } from "react";
import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { emptyVerifiedClaims } from "@/core/jdParse/slots";
import type { VerifiedClaims } from "@/core/jdParse/types";
import type { StepProps } from "./StepCompany";

/**
 * A single verifiable claim with a checkbox.
 * Checking = "I truthfully have this skill/attribute."
 */
function ClaimRow({
  id,
  label,
  checked,
  onToggle,
}: {
  id: string;
  label: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value: boolean | "indeterminate") => onToggle(value === true)}
        className="mt-0.5 shrink-0"
      />
      <Label htmlFor={id} className="cursor-pointer text-sm font-normal leading-snug">
        {label}
      </Label>
    </div>
  );
}

/**
 * Step 5 (Modo 3 only) — human verification gate.
 *
 * Shows every verbatim claim extracted from the parsed JD. Lenin checks only
 * the items that are truthfully applicable — checked items get injected into
 * the CV slots at generation time. Un-checked items are skipped.
 *
 * The gate is "completed" (Siguiente unlocks) the moment this step is visited:
 * `verifiedClaims` is initialised to empty arrays on mount. Lenin makes
 * conscious decisions about each item — that's the gate's purpose.
 */
export function StepVerify({ data, set }: StepProps) {
  const parsedJd = data.parsedJd;
  const claims = data.verifiedClaims;

  // Initialise on mount so canAdvance passes as soon as the step is reached.
  useEffect(() => {
    if (!claims) {
      set({ verifiedClaims: emptyVerifiedClaims() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function patch(update: Partial<VerifiedClaims>) {
    set({ verifiedClaims: { ...(claims ?? emptyVerifiedClaims()), ...update } });
  }

  function toggleList(
    key: "requiredKeywords" | "tools" | "preferredKeywords",
    value: string,
    checked: boolean,
  ) {
    const current = claims?.[key] ?? [];
    patch({
      [key]: checked ? [...current, value] : current.filter((v) => v !== value),
    });
  }

  if (!parsedJd) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          No hay descripción analizada para este puesto. Volvé al paso anterior y usá{" "}
          <span className="font-medium text-foreground">Detectar</span> o{" "}
          <span className="font-medium text-foreground">Analizar con IA</span> para extraer
          los claims de la búsqueda.
        </p>
        <p className="text-xs text-muted-foreground">
          Podés seguir igual — el CV se generará como base sin inyección de claims.
        </p>
      </div>
    );
  }

  const hasAnything =
    parsedJd.jobTitle ||
    parsedJd.requiredKeywords.length > 0 ||
    parsedJd.tools.length > 0 ||
    parsedJd.preferredKeywords.length > 0;

  if (!hasAnything) {
    return (
      <p className="text-sm text-muted-foreground">
        El análisis de la búsqueda no detectó claims estructurados. El CV se generará como
        base.
      </p>
    );
  }

  const c = claims ?? emptyVerifiedClaims();

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-500" />
        <p className="text-xs text-muted-foreground">
          Marcá solo lo que <span className="font-medium text-foreground">realmente tenés</span>.
          Copiar skills que no tenés explota en la entrevista.
        </p>
      </div>

      {parsedJd.jobTitle && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Título del puesto
          </p>
          <ClaimRow
            id="title-claim"
            label={parsedJd.jobTitle}
            checked={c.titleVerified}
            onToggle={(checked) => patch({ titleVerified: checked })}
          />
        </div>
      )}

      {parsedJd.requiredKeywords.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Keywords requeridas
          </p>
          <div className="space-y-2">
            {parsedJd.requiredKeywords.map((kw) => (
              <ClaimRow
                key={kw}
                id={`req-${kw}`}
                label={kw}
                checked={c.requiredKeywords.includes(kw)}
                onToggle={(checked) => toggleList("requiredKeywords", kw, checked)}
              />
            ))}
          </div>
        </div>
      )}

      {parsedJd.tools.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tools
          </p>
          <div className="space-y-2">
            {parsedJd.tools.map((tool) => (
              <ClaimRow
                key={tool}
                id={`tool-${tool}`}
                label={tool}
                checked={c.tools.includes(tool)}
                onToggle={(checked) => toggleList("tools", tool, checked)}
              />
            ))}
          </div>
        </div>
      )}

      {parsedJd.preferredKeywords.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Keywords preferidas{" "}
            <Badge variant="outline" className="text-[10px] font-normal">
              Opcional
            </Badge>
          </p>
          <div className="space-y-2">
            {parsedJd.preferredKeywords.map((kw) => (
              <ClaimRow
                key={kw}
                id={`pref-${kw}`}
                label={kw}
                checked={c.preferredKeywords.includes(kw)}
                onToggle={(checked) => toggleList("preferredKeywords", kw, checked)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
