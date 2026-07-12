"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { CoverLetterBodies, CoverLetterTemplate } from "@/core/coverLetter/types";
import type { GenerateCvInput } from "@/core/generateCv";
import { DEFAULT_ROLE } from "@/core/registry/types";
import { generateCode } from "@/core/spec/code";
import type { LinkSpec } from "@/core/spec/types";
import { StepCompany } from "./StepCompany";
import { StepConfirm } from "./StepConfirm";
import { StepCoverLetter, resolveBodiesFor } from "./StepCoverLetter";
import { StepLanguage } from "./StepLanguage";
import { StepOptional } from "./StepOptional";
import { emailRequirementMet, languagesFor, type WizardData } from "./types";

const TOTAL_STEPS = 5;
const STEP_TITLES = ["Empresa y fecha", "Opcionales", "Idioma y foco", "Cover letter", "Confirmar"];

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
    coverLetterTemplateId: "",
    coverLetterBodies: {},
    coverLetterEdited: false,
  };
}

export interface WizardProps {
  /** The link contract — drives the preview code. Null while it loads. */
  spec: LinkSpec | null;
  /** Codes already in the registry, for collision-checked preview. */
  existingCodes: string[];
  /** Cover letter templates for the optional letter step. */
  templates: CoverLetterTemplate[];
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
  templates,
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
    if (step === 3) {
      // Entering the letter step: refresh the resolved bodies so earlier field
      // changes (empresa/rol/quién/idioma) are reflected. Hand-edited texts win;
      // resolution still fills languages added after the edit (EN → Ambos).
      const template = templates.find((candidate) => candidate.id === data.coverLetterTemplateId);
      if (template) {
        const resolved = resolveBodiesFor(template, data);
        set({
          coverLetterBodies: data.coverLetterEdited
            ? { ...resolved, ...data.coverLetterBodies }
            : resolved,
        });
      }
      setStep(4);
      return;
    }
    if (step < 4) {
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
      setStep(5);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar el código.");
    }
  }

  function goBack() {
    setStep((current) => Math.max(1, current - 1));
  }

  async function handleGenerate() {
    if (previewCode === null) return;
    // Final letter bodies: only the languages this generation produces, only
    // non-empty texts. No template or all-empty bodies → no letter.
    const template = templates.find((candidate) => candidate.id === data.coverLetterTemplateId);
    const letterBodies: CoverLetterBodies = {};
    if (template) {
      for (const language of languagesFor(data.language)) {
        const body = data.coverLetterBodies[language]?.trim();
        if (body) letterBodies[language] = body;
      }
    }
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
        coverLetter:
          template && Object.keys(letterBodies).length > 0
            ? { templateId: template.id, templateName: template.name, bodies: letterBodies }
            : undefined,
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
        {step === 4 && (
          <StepCoverLetter data={data} set={set} container={container} templates={templates} />
        )}
        {step === 5 && previewCode && (
          <StepConfirm
            data={data}
            previewCode={previewCode}
            spec={spec}
            coverLetterName={
              templates.find((candidate) => candidate.id === data.coverLetterTemplateId)?.name
            }
          />
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
