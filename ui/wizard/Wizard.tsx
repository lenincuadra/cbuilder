"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { GenerateCvInput } from "@/core/generateCv";
import { DEFAULT_ROLE } from "@/core/registry/types";
import { generateCode } from "@/core/spec/code";
import type { LinkSpec } from "@/core/spec/types";
import { StepCompany } from "./StepCompany";
import { StepConfirm } from "./StepConfirm";
import { StepLanguage } from "./StepLanguage";
import { StepOptional } from "./StepOptional";
import { emailRequirementMet, type WizardData } from "./types";

const TOTAL_STEPS = 4;
const STEP_TITLES = ["Empresa y fecha", "Opcionales", "Idioma y foco", "Confirmar"];

function initialData(): WizardData {
  return {
    company: "",
    language: "EN",
    date: new Date(),
    role: DEFAULT_ROLE,
    channel: "",
    email: "",
    who: "",
    jobUrl: "",
    focus: "",
  };
}

export interface WizardProps {
  /** The link contract — drives the preview code. Null while it loads. */
  spec: LinkSpec | null;
  /** Codes already in the registry, for collision-checked preview. */
  existingCodes: string[];
  /** True while a generation is in flight. */
  generating: boolean;
  /** Runs the generation; rejects on error (the caller surfaces the message). */
  onGenerate: (input: GenerateCvInput) => Promise<void>;
  /** Optional: dismiss the wizard from step 1 (turns "Atrás" into "Cancelar"). */
  onCancel?: () => void;
  /** Portal target for the step dropdowns when the wizard runs inside a drawer. */
  container?: HTMLElement | null;
}

export function Wizard({
  spec,
  existingCodes,
  generating,
  onGenerate,
  onCancel,
  container,
}: WizardProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(initialData);
  const [previewCode, setPreviewCode] = useState<string | null>(null);

  const set = (patch: Partial<WizardData>) => setData((current) => ({ ...current, ...patch }));

  const companyValid = data.company.trim() !== "";
  const canAdvance =
    step === 1 ? companyValid : step === 2 ? emailRequirementMet(data) : true;

  function goNext() {
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    if (!spec) {
      toast.error("Esperando el link-spec del portfolio. Probá de nuevo en un momento.");
      return;
    }
    // Entering the confirm step: lock in a collision-checked code for the preview.
    try {
      const code = generateCode({ spec, date: data.date, existingCodes });
      setPreviewCode(code);
      setStep(4);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar el código.");
    }
  }

  function goBack() {
    setStep((current) => Math.max(1, current - 1));
  }

  async function handleGenerate() {
    if (previewCode === null) return;
    try {
      await onGenerate({
        company: data.company,
        languageChoice: data.language,
        date: data.date,
        role: data.role,
        who: data.who,
        channel: data.channel === "" ? undefined : data.channel,
        email: data.email,
        jobUrl: data.jobUrl,
        focus: data.focus === "" ? undefined : data.focus,
        code: previewCode,
      });
      // Success: reset for the next application.
      setData(initialData());
      setPreviewCode(null);
      setStep(1);
    } catch {
      // The page already surfaced the error; stay on the confirm step.
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Paso {step} de {TOTAL_STEPS}
          </span>
          <span className="font-medium text-foreground">{STEP_TITLES[step - 1]}</span>
        </div>
        <Progress value={(step / TOTAL_STEPS) * 100} />
      </div>

      <div className="min-h-[260px]">
        {step === 1 && <StepCompany data={data} set={set} container={container} />}
        {step === 2 && <StepOptional data={data} set={set} container={container} />}
        {step === 3 && <StepLanguage data={data} set={set} container={container} spec={spec} />}
        {step === 4 && previewCode && (
          <StepConfirm data={data} previewCode={previewCode} spec={spec} />
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        {step === 1 && onCancel ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={generating}
          >
            <X className="size-4" />
            Cancelar
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={goBack}
            disabled={step === 1 || generating}
          >
            <ChevronLeft className="size-4" />
            Atrás
          </Button>
        )}

        {step < TOTAL_STEPS ? (
          <Button type="button" size="sm" onClick={goNext} disabled={!canAdvance}>
            Siguiente
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 className="size-4 animate-spin" /> : null}
            Generar
          </Button>
        )}
      </div>
    </div>
  );
}
