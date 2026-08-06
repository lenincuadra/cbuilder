"use client";

import { Check, PenLine, Sparkles, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CvMode } from "@/core/registry/types";
import type { StepProps } from "./StepCompany";

interface ModeOption {
  value: CvMode;
  label: string;
  description: string;
  icon: typeof Check;
  /** Not yet built — shown but not selectable (would misrecord the CV as tailored). */
  soon?: boolean;
}

const MODES: ModeOption[] = [
  {
    value: "base",
    label: "CV base",
    description:
      "El master de siempre + links de tracking. Sin adaptar a la búsqueda. Rápido, para postulaciones long-shot.",
    icon: Check,
  },
  {
    value: "assisted",
    label: "Adaptado con IA",
    description:
      "La IA reescribe tu experiencia real en el lenguaje y la estructura de la búsqueda. Nunca inventa.",
    icon: Sparkles,
  },
  {
    value: "verbatim",
    label: "Copiar la búsqueda",
    description:
      "Verificás cada frase de la búsqueda antes de inyectarla. Máximo match ATS — solo lo que realmente tenés.",
    icon: PenLine,
  },
  {
    value: "ats",
    label: "ATS máximo",
    description:
      "Arma un CV nuevo desde cero para esta búsqueda: título, Core Competencies verbatim y Values Alignment. Requiere pegar la descripción.",
    icon: Target,
  },
];

/**
 * Step 4 — cómo se arma el cuerpo del CV. Va después de Opcionales, así el modo
 * se elige sabiendo si hay una descripción del puesto (ATS la requiere).
 */
export function StepMode({ data, set, hasJd = false }: StepProps & { hasJd?: boolean }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Cómo se arma el cuerpo del CV. Determina cuánto se adapta a la búsqueda.
      </p>
      <div className="space-y-2">
        {MODES.map((mode) => {
          const selected = data.mode === mode.value;
          // ATS builds a CV from the JD, so it needs one entered in Opcionales.
          const needsJd = mode.value === "ats" && !hasJd;
          const disabled = mode.soon || needsJd;
          const Icon = mode.icon;
          return (
            <button
              key={mode.value}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => set({ mode: mode.value })}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                selected
                  ? "border-ring bg-accent/40 ring-1 ring-ring/40"
                  : "border-border hover:bg-accent/20",
                disabled && "cursor-not-allowed opacity-60 hover:bg-transparent",
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  selected ? "text-foreground" : "text-muted-foreground",
                )}
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{mode.label}</span>
                  {mode.soon && (
                    <Badge variant="outline" className="text-[10px] font-normal">
                      Próximamente
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{mode.description}</p>
                {needsJd && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-500">
                    Necesitás pegar la descripción del puesto (paso Opcionales).
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
