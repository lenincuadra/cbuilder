"use client";

import { Check, PenLine, Sparkles } from "lucide-react";

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

/**
 * The three CV-tailoring modes (see `docs/cv-tailoring-plan.md`). Only "base"
 * is selectable for now: modes 2 and 3 don't change the output yet, so offering
 * them would record a CV as tailored when it isn't.
 */
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
    soon: true,
  },
  {
    value: "verbatim",
    label: "Copiar la búsqueda",
    description:
      "Inyecta las frases exactas de la búsqueda en el CV, con verificación por afirmación. Máximo match ATS.",
    icon: PenLine,
    soon: true,
  },
];

/** Step 1 — cómo se arma el cuerpo del CV. Se elige al principio del wizard. */
export function StepMode({ data, set }: StepProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Cómo se arma el cuerpo del CV. Determina cuánto se adapta a la búsqueda.
      </p>
      <div className="space-y-2">
        {MODES.map((mode) => {
          const selected = data.mode === mode.value;
          const Icon = mode.icon;
          return (
            <button
              key={mode.value}
              type="button"
              disabled={mode.soon}
              aria-pressed={selected}
              onClick={() => set({ mode: mode.value })}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                selected
                  ? "border-ring bg-accent/40 ring-1 ring-ring/40"
                  : "border-border hover:bg-accent/20",
                mode.soon && "cursor-not-allowed opacity-60 hover:bg-transparent",
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
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
