"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, FileClock, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DrawerBody, DrawerFooter } from "@/components/ui/drawer";
import { Progress } from "@/components/ui/progress";
import type { CoverLetterTemplate } from "@/core/coverLetter/types";
import type { GenerateCvInput, PendingRowInput } from "@/core/generateCv";
import { DEFAULT_CV_MODE, DEFAULT_ROLE, type EditableFields, type RegistryRow } from "@/core/registry/types";
import type { ScreeningQuestion } from "@/core/screening/types";
import { generateCode } from "@/core/spec/code";
import type { LinkSpec } from "@/core/spec/types";
import { CoverLetterGenerateForm } from "@/ui/detail/CoverLetterGenerateForm";
import { ScreeningNewForm } from "@/ui/detail/ScreeningNewForm";
import { ScreeningSuggestForm } from "@/ui/detail/ScreeningSuggestForm";
import type { UseScreening } from "@/ui/useScreening";
import { StepCompany } from "./StepCompany";
import { StepConfirm } from "./StepConfirm";
import { StepLanguage } from "./StepLanguage";
import { StepMode } from "./StepMode";
import { StepOptional } from "./StepOptional";
import { emailRequirementMet, type WizardData } from "./types";

const TOTAL_STEPS = 5;
/**
 * What occupies the confirm step's slot: the summary + optional actions, or
 * one of their takeover forms (each brings its own DrawerBody + pinned
 * footer, same "full takeover" shape as the row detail drawer's — see
 * `RowDetailDrawer`'s `DetailMode`).
 */
type ConfirmMode =
  | { kind: "view" }
  | { kind: "cover-letter-generate" }
  | { kind: "screening-new" }
  | { kind: "screening-edit"; entry: ScreeningQuestion }
  | { kind: "screening-suggest"; entry: ScreeningQuestion };
const STEP_TITLES = ["Modo", "Empresa y fecha", "Opcionales", "Idioma y foco", "Confirmar"];

/**
 * Fresh wizard state. With a pending row (deferred generation), steps 1–2 come
 * prefilled from the row; `date` is today — it becomes the cover letter's
 * letterhead date (the CV is generated now), while the row keeps its own
 * process-start date untouched.
 */
function initialData(pendingRow?: RegistryRow): WizardData {
  return {
    mode: pendingRow?.cvMode ?? DEFAULT_CV_MODE,
    company: pendingRow?.company ?? "",
    language: "EN",
    date: new Date(),
    role: pendingRow?.role ?? DEFAULT_ROLE,
    channel: pendingRow?.channel ?? "",
    email: pendingRow?.email ?? "",
    who: pendingRow?.who ?? "",
    jobUrl: pendingRow?.jobUrl ?? "",
    jobContext: pendingRow?.jobContext ?? "",
    parsedJd: pendingRow?.parsedJd ?? null,
    focus: "",
  };
}

export interface WizardProps {
  /** The link contract — drives the preview code. Null while it loads. */
  spec: LinkSpec | null;
  /** Codes already in the registry, for collision-checked preview. */
  existingCodes: string[];
  /** Cover letter templates for the confirm step's optional "Generar cover letter" takeover. */
  templates: CoverLetterTemplate[];
  /** True while a generation is in flight. */
  generating: boolean;
  /**
   * Runs the generation; rejects on error (the caller surfaces the message).
   * The second argument is the row this session ended up bound to (either the
   * original `pendingRow` prop, or one silently created mid-session by an
   * optional cover letter/preguntas action) — present means "update this
   * row", absent "add new".
   */
  onGenerate: (input: GenerateCvInput, activeRow?: RegistryRow) => Promise<void>;
  /**
   * Registers the process without generating a CV. When provided, every step
   * before Confirmar offers a "Registrar sin CV" exit (Empresa is the only
   * requirement). With `activeRow` (a Borrador silently created mid-session)
   * it must update that row instead of adding a second one. Returns the
   * registered row. Rejects on error.
   */
  onSavePending?: (input: PendingRowInput, activeRow?: RegistryRow) => Promise<RegistryRow>;
  /**
   * Persists row field edits — needed by the confirm step's optional cover
   * letter/preguntas takeovers once a row exists (same shape the detail
   * drawer already uses).
   */
  onUpdate: (code: string, fields: EditableFields) => void | Promise<void>;
  /**
   * Shared screening-questions bank — the confirm step's Preguntas section
   * reads/writes it, same as the row detail drawer.
   */
  screening?: UseScreening;
  /**
   * Returns the row this session is bound to, creating the silent Borrador
   * row (reserved code — `code` when given, otherwise a fresh one) on first
   * use. The confirm step's optional cover letter/preguntas actions need it
   * before either can attach to a real row.
   */
  onEnsureRow?: (data: WizardData, activeRow: RegistryRow | null, code?: string) => Promise<RegistryRow>;
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
  onUpdate,
  screening,
  onEnsureRow,
  pendingRow,
  onCancel,
  container,
}: WizardProps) {
  // Fresh flow starts at Modo (1); deferred generation skips Modo/Empresa/
  // Opcionales (their data lives on the row) and starts at Idioma y foco (4).
  // The Modo step isn't shown in the deferred flow yet — it defaults to "base".
  const startStep = pendingRow ? 4 : 1;
  const [step, setStep] = useState(startStep);
  const [data, setData] = useState<WizardData>(() => initialData(pendingRow));
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [savingPending, setSavingPending] = useState(false);
  // The row this session is bound to — the `pendingRow` prop, or one silently
  // created mid-session by an optional cover letter/preguntas action (see StepConfirm).
  const [activeRow, setActiveRow] = useState<RegistryRow | null>(pendingRow ?? null);
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>({ kind: "view" });

  const set = (patch: Partial<WizardData>) => setData((current) => ({ ...current, ...patch }));

  // Empresa is the only blocking field — everything else can be completed
  // later from the detail panel (see docs/decisions.md → "Registro nunca
  // bloqueante").
  const companyValid = data.company.trim() !== "";
  // Empresa (step 2) is the only field that gates advancing; Modo (step 1) is
  // always valid (a mode is always selected — default "base").
  const canAdvance = step === 2 ? companyValid : true;

  /**
   * Email to persist: an invalid typed email is omitted (never stored broken)
   * with a heads-up toast — it doesn't block registering or generating.
   */
  function sanitizedEmail(): string {
    if (data.channel !== "Email" || emailRequirementMet(data)) return data.email;
    if (data.email.trim() !== "") {
      toast.info("Email inválido — quedó sin guardar; completalo desde Editar.");
    }
    return "";
  }

  function goNext() {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
      return;
    }
    if (!spec) {
      toast.error("Esperando el link-spec del portfolio. Probá de nuevo en un momento.");
      return;
    }
    // Entering the confirm step: lock in a collision-checked code for the
    // preview — or the code already reserved (pendingRow, or a Borrador
    // silently created earlier in this same session).
    try {
      const code = activeRow?.code ?? generateCode({ spec, date: data.date, existingCodes });
      setPreviewCode(code);
      setStep(TOTAL_STEPS);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar el código.");
    }
  }

  function goBack() {
    setConfirmMode({ kind: "view" });
    setStep((current) => Math.max(startStep, current - 1));
  }

  async function handleSavePending() {
    if (!onSavePending) return;
    setSavingPending(true);
    try {
      await onSavePending(
        {
          company: data.company,
          date: data.date,
          role: data.role,
          who: data.who,
          channel: data.channel === "" ? undefined : data.channel,
          email: sanitizedEmail(),
          jobUrl: data.jobUrl,
          jobContext: data.jobContext,
          parsedJd: data.parsedJd ?? undefined,
        },
        activeRow ?? undefined,
      );
      // Success: reset for the next application.
      setData(initialData());
      setActiveRow(null);
      setConfirmMode({ kind: "view" });
      setStep(1);
    } catch {
      // The page already surfaced the error; stay on the step.
    } finally {
      setSavingPending(false);
    }
  }

  /**
   * Row this session is bound to, creating the silent Borrador row on first
   * use — same mechanism `onSavePending`/`pendingRow` rely on, triggered here
   * by the confirm step's optional cover letter/preguntas actions instead.
   * Reuses `previewCode` (already shown in the folder preview) so the row's
   * code always matches what's on screen.
   */
  async function ensureRow(): Promise<RegistryRow> {
    if (activeRow) return activeRow;
    if (!onEnsureRow) throw new Error("No se pudo crear el registro.");
    const row = await onEnsureRow(data, activeRow, previewCode ?? undefined);
    setActiveRow(row);
    return row;
  }

  async function handleGenerate() {
    if (previewCode === null) return;
    try {
      await onGenerate(
        {
          company: data.company,
          languageChoice: data.language,
          date: data.date,
          role: data.role,
          who: data.who,
          channel: data.channel === "" ? undefined : data.channel,
          email: sanitizedEmail(),
          jobUrl: data.jobUrl,
          jobContext: data.jobContext,
          parsedJd: data.parsedJd ?? undefined,
          focus: data.focus === "" ? undefined : data.focus,
          cvMode: data.mode,
          code: previewCode,
        },
        activeRow ?? undefined,
      );
      // Success: reset for the next application.
      setData(initialData(pendingRow));
      setPreviewCode(null);
      setActiveRow(pendingRow ?? null);
      setConfirmMode({ kind: "view" });
      setStep(startStep);
    } catch {
      // The page already surfaced the error; stay on the confirm step.
    }
  }

  // Confirm step's optional cover letter/preguntas actions take over the
  // whole slot (own DrawerBody + pinned footer, same shape as every other
  // form takeover in the app) — the wizard's own body/nav step aside for it,
  // exactly like RowDetailDrawer does for its own takeovers.
  if (step === TOTAL_STEPS && confirmMode.kind === "cover-letter-generate" && activeRow) {
    return (
      <CoverLetterGenerateForm
        row={activeRow}
        templates={templates}
        onUpdate={onUpdate}
        container={container}
        onDone={() => setConfirmMode({ kind: "view" })}
      />
    );
  }
  if (
    step === TOTAL_STEPS &&
    activeRow &&
    screening &&
    (confirmMode.kind === "screening-new" ||
      confirmMode.kind === "screening-edit" ||
      confirmMode.kind === "screening-suggest")
  ) {
    const jobFields = {
      company: activeRow.company,
      role: activeRow.role,
      focus: activeRow.focus,
      jobUrl: activeRow.jobUrl,
      jobContext: activeRow.jobContext,
      onUpdateJobFields: (fields: { jobUrl?: string; jobContext?: string }) =>
        onUpdate(activeRow.code, fields),
      screening,
      container,
      onDone: () => setConfirmMode({ kind: "view" }),
    };
    if (confirmMode.kind === "screening-suggest") {
      return <ScreeningSuggestForm entry={confirmMode.entry} {...jobFields} />;
    }
    return (
      <ScreeningNewForm
        code={activeRow.code}
        entry={confirmMode.kind === "screening-edit" ? confirmMode.entry : undefined}
        {...jobFields}
      />
    );
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
          {step === 1 && <StepMode data={data} set={set} container={container} />}
          {step === 2 && <StepCompany data={data} set={set} container={container} />}
          {step === 3 && <StepOptional data={data} set={set} container={container} />}
          {step === 4 && <StepLanguage data={data} set={set} container={container} spec={spec} />}
          {step === 5 && previewCode && (
            <StepConfirm
              data={data}
              previewCode={previewCode}
              spec={spec}
              activeRow={activeRow}
              onEnsureRow={onEnsureRow ? ensureRow : undefined}
              onStartCoverLetterGenerate={() => setConfirmMode({ kind: "cover-letter-generate" })}
              onStartScreeningNew={() => setConfirmMode({ kind: "screening-new" })}
              onEditScreening={(entry) => setConfirmMode({ kind: "screening-edit", entry })}
              onSuggestScreening={(entry) => setConfirmMode({ kind: "screening-suggest", entry })}
              screening={screening}
              container={container}
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
          {/* Fork: register the process now, generate the CV later. Available
              from step 1 (Empresa is the only requirement) on every step
              before Confirmar — registering is never gated on the CV path. */}
          {step < TOTAL_STEPS && onSavePending && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSavePending}
              disabled={!companyValid || savingPending || generating}
            >
              {savingPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileClock className="size-4" />
              )}
              Registrar sin CV
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
              Generar CV
            </Button>
          )}
        </div>
      </DrawerFooter>
    </>
  );
}
