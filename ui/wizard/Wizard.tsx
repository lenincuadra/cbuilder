"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, FileClock, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DrawerBody, DrawerFooter } from "@/components/ui/drawer";
import { Progress } from "@/components/ui/progress";
import type { CoverLetterBodies, CoverLetterTemplate } from "@/core/coverLetter/types";
import type { GenerateCvInput, PendingRowInput } from "@/core/generateCv";
import { DEFAULT_ROLE, type RegistryRow } from "@/core/registry/types";
import { generateCode } from "@/core/spec/code";
import type { LinkSpec } from "@/core/spec/types";
import { StepCompany } from "./StepCompany";
import { StepConfirm } from "./StepConfirm";
import { AI_TEMPLATE_NAME, StepCoverLetter, resolveBodiesFor } from "./StepCoverLetter";
import { StepLanguage } from "./StepLanguage";
import { StepOptional } from "./StepOptional";
import { COVER_LETTER_AI, emailRequirementMet, languagesFor, type WizardData } from "./types";

const TOTAL_STEPS = 5;
const STEP_TITLES = ["Empresa y fecha", "Opcionales", "Idioma y foco", "Cover letter", "Confirmar"];

/**
 * Fresh wizard state. With a pending row (deferred generation), steps 1–2 come
 * prefilled from the row; `date` is today — it becomes the cover letter's
 * letterhead date (the CV is generated now), while the row keeps its own
 * process-start date untouched.
 */
function initialData(pendingRow?: RegistryRow): WizardData {
  const draft = pendingRow?.coverLetterDraft;
  return {
    company: pendingRow?.company ?? "",
    language: "EN",
    date: new Date(),
    role: pendingRow?.role ?? DEFAULT_ROLE,
    channel: pendingRow?.channel ?? "",
    email: pendingRow?.email ?? "",
    who: pendingRow?.who ?? "",
    jobUrl: pendingRow?.jobUrl ?? "",
    jobContext: pendingRow?.jobContext ?? "",
    focus: "",
    coverLetterTemplateId: draft?.templateId ?? "",
    coverLetterBodies: draft?.bodies ?? {},
    // true when resuming a saved draft: keeps goNext's step 3→4 transition
    // from overwriting it with a freshly-resolved (unedited) template body.
    coverLetterEdited: draft !== undefined,
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
  /**
   * Runs the generation; rejects on error (the caller surfaces the message).
   * The second argument is the row this session ended up bound to (either the
   * original `pendingRow` prop, or one silently created mid-session by an AI
   * cover-letter draft) — present means "update this row", absent "add new".
   */
  onGenerate: (input: GenerateCvInput, activeRow?: RegistryRow) => Promise<void>;
  /**
   * Registers the process without generating a CV (reserves the code). When
   * provided, step 2 offers a "Guardar sin CV" exit. Rejects on error.
   */
  onSavePending?: (input: PendingRowInput) => Promise<void>;
  /**
   * Persists the cover letter step's AI draft the moment it's generated — a
   * paid API call is never lost to a closed wizard. Creates a Borrador row
   * (reserved code, `cvPending: true`) if this session doesn't have one yet,
   * or patches the existing one. Returns the row so the wizard can track it.
   */
  onSaveDraft?: (
    data: WizardData,
    activeRow: RegistryRow | null,
    draft: { templateId: string; templateName?: string; bodies: CoverLetterBodies },
  ) => Promise<RegistryRow>;
  /**
   * Deferred generation for a pending row: steps 1–2 are skipped (their data
   * lives on the row, editable from the detail panel) and the confirm step
   * uses the row's already-reserved code instead of generating one.
   */
  pendingRow?: RegistryRow;
  /** Optional: dismiss the wizard from the first step (turns "Atrás" into "Cancelar"). */
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
  onSavePending,
  onSaveDraft,
  pendingRow,
  onCancel,
  container,
}: WizardProps) {
  const startStep = pendingRow ? 3 : 1;
  const [step, setStep] = useState(startStep);
  const [data, setData] = useState<WizardData>(() => initialData(pendingRow));
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [savingPending, setSavingPending] = useState(false);
  // The row this session is bound to — the `pendingRow` prop, or one silently
  // created mid-session by an AI cover-letter draft (see StepCoverLetter).
  const [activeRow, setActiveRow] = useState<RegistryRow | null>(pendingRow ?? null);

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
    // Entering the confirm step: lock in a collision-checked code for the
    // preview — or the code already reserved (pendingRow, or a Borrador
    // silently created by an AI draft earlier in this same session).
    try {
      const code = activeRow?.code ?? generateCode({ spec, date: data.date, existingCodes });
      setPreviewCode(code);
      setStep(5);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar el código.");
    }
  }

  function goBack() {
    setStep((current) => Math.max(startStep, current - 1));
  }

  async function handleSavePending() {
    if (!onSavePending) return;
    setSavingPending(true);
    try {
      await onSavePending({
        company: data.company,
        date: data.date,
        role: data.role,
        who: data.who,
        channel: data.channel === "" ? undefined : data.channel,
        email: data.email,
        jobUrl: data.jobUrl,
        jobContext: data.jobContext,
      });
      // Success: reset for the next application.
      setData(initialData());
      setStep(1);
    } catch {
      // The page already surfaced the error; stay on the step.
    } finally {
      setSavingPending(false);
    }
  }

  /**
   * Persist an AI-generated cover letter draft immediately (see StepCoverLetter):
   * creates the Borrador row on the first call this session, patches it on
   * later ones. Errors surface via toast in the caller — the generated text
   * still shows in the textarea either way.
   */
  async function persistDraft(draft: {
    templateId: string;
    templateName?: string;
    bodies: CoverLetterBodies;
  }) {
    if (!onSaveDraft) return;
    const row = await onSaveDraft(data, activeRow, draft);
    setActiveRow(row);
  }

  async function handleGenerate() {
    if (previewCode === null) return;
    // Final letter bodies: only the languages this generation produces, only
    // non-empty texts. No template/AI mode or all-empty bodies → no letter.
    const template = templates.find((candidate) => candidate.id === data.coverLetterTemplateId);
    const isAiMode = data.coverLetterTemplateId === COVER_LETTER_AI;
    const letterBodies: CoverLetterBodies = {};
    if (template || isAiMode) {
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
        jobContext: data.jobContext,
        focus: data.focus === "" ? undefined : data.focus,
        coverLetter:
          (template || isAiMode) && Object.keys(letterBodies).length > 0
            ? {
                templateId: isAiMode ? COVER_LETTER_AI : template!.id,
                templateName: isAiMode ? AI_TEMPLATE_NAME : template!.name,
                bodies: letterBodies,
              }
            : undefined,
        code: previewCode,
      }, activeRow ?? undefined);
      // Success: reset for the next application.
      setData(initialData(pendingRow));
      setPreviewCode(null);
      setActiveRow(pendingRow ?? null);
      setStep(startStep);
    } catch {
      // The page already surfaced the error; stay on the confirm step.
    }
  }

  // The wizard always runs inside a drawer, so it renders the drawer slots
  // itself: the progress + step in the scrollable body, the nav pinned below.
  return (
    <>
      <DrawerBody className="gap-4">
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
            <StepCoverLetter
              data={data}
              set={set}
              container={container}
              templates={templates}
              onSaveDraft={onSaveDraft ? persistDraft : undefined}
            />
          )}
          {step === 5 && previewCode && (
            <StepConfirm
              data={data}
              previewCode={previewCode}
              spec={spec}
              coverLetterName={
                data.coverLetterTemplateId === COVER_LETTER_AI
                  ? AI_TEMPLATE_NAME
                  : templates.find((candidate) => candidate.id === data.coverLetterTemplateId)?.name
              }
            />
          )}
        </div>
      </DrawerBody>

      <DrawerFooter className="flex-row items-center justify-between">
        {step === startStep && onCancel ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={generating || savingPending}
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
            disabled={step === startStep || generating || savingPending}
          >
            <ChevronLeft className="size-4" />
            Atrás
          </Button>
        )}

        <div className="flex items-center gap-2">
          {/* Fork: register the process now, generate the CV later (e.g. a
              recruiter reached out). Steps 1–2 hold exactly the process data. */}
          {step === 2 && onSavePending && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSavePending}
              disabled={!canAdvance || savingPending}
            >
              {savingPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileClock className="size-4" />
              )}
              Guardar sin CV
            </Button>
          )}
          {step < TOTAL_STEPS ? (
            <Button type="button" size="sm" onClick={goNext} disabled={!canAdvance || savingPending}>
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
      </DrawerFooter>
    </>
  );
}
