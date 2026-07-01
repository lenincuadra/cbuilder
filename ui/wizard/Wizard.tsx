"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { GenerateCvInput } from "@/core/generateCv";
import { DEFAULT_ROLE } from "@/core/registry/types";
import { generateCode } from "@/core/tracking";
import { StepCompany } from "./StepCompany";
import { StepConfirm } from "./StepConfirm";
import { StepLanguage } from "./StepLanguage";
import { StepOptional } from "./StepOptional";
import { emailRequirementMet, type WizardData } from "./types";

const TOTAL_STEPS = 4;
const STEP_TITLES = ["Empresa y fecha", "Opcionales", "Idioma", "Confirmar"];

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
  };
}

export interface WizardProps {
  /** Codes already in the registry, for collision-checked preview. */
  existingCodes: string[];
  /** True while a generation is in flight. */
  generating: boolean;
  /** Runs the generation; rejects on error (the caller surfaces the message). */
  onGenerate: (input: GenerateCvInput) => Promise<void>;
}

export function Wizard({ existingCodes, generating, onGenerate }: WizardProps) {
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
    // Entering the confirm step: lock in a collision-checked code for the preview.
    try {
      const code = generateCode({ date: data.date, existingCodes });
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
        {step === 1 && <StepCompany data={data} set={set} />}
        {step === 2 && <StepOptional data={data} set={set} />}
        {step === 3 && <StepLanguage data={data} set={set} />}
        {step === 4 && previewCode && <StepConfirm data={data} previewCode={previewCode} />}
      </div>

      <div className="flex items-center justify-between gap-2">
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
