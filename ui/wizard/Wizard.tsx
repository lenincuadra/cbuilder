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
import { buildAtsOverrides } from "@/core/cvData/tailor";
import { StepAssisted } from "./StepAssisted";
import { StepAts } from "./StepAts";
import { StepCompany } from "./StepCompany";
import { StepConfirm } from "./StepConfirm";
import { StepLanguage } from "./StepLanguage";
import { StepMode } from "./StepMode";
import { StepOptional } from "./StepOptional";
import { StepVerify } from "./StepVerify";
import { emailRequirementMet, type WizardData } from "./types";

/** True when parsedJd has at least one extractable claim (title, keyword, or tool). */
function hasJdContent(parsedJd: { jobTitle?: string; requiredKeywords: string[]; tools: string[]; preferredKeywords: string[] } | null): boolean {
  if (!parsedJd) return false;
  return (
    !!parsedJd.jobTitle ||
    parsedJd.requiredKeywords.length > 0 ||
    parsedJd.tools.length > 0 ||
    parsedJd.preferredKeywords.length > 0
  );
}

/**
 * Total wizard steps per mode. The ATS mode always has 6 (JD is mandatory, so
 * its gate always runs). Modes 2 and 3 add the extra step only when the JD was
 * parsed into structured claims — no content, no extra step.
 */
function totalStepsFor(mode: string, hasJd: boolean): number {
  if (mode === "ats") return 6;
  return (mode === "verbatim" || mode === "assisted") && hasJd ? 6 : 5;
}

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
const STEP_TITLES_BASE = ["Empresa y contacto", "Opcionales", "Idioma y foco", "Modo", "Confirmar"];
const STEP_TITLES_ASSISTED = ["Empresa y contacto", "Opcionales", "Idioma y foco", "Modo", "Resumen IA", "Confirmar"];
const STEP_TITLES_VERBATIM = ["Empresa y contacto", "Opcionales", "Idioma y foco", "Modo", "Verificar claims", "Confirmar"];
const STEP_TITLES_ATS = ["Empresa y contacto", "Opcionales", "Idioma y foco", "Modo", "Armar CV (ATS)", "Confirmar"];

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
    // Outbound is the common case (you applied / reached out); seeded from the row on resume.
    reach: pendingRow?.reach ?? "outbound",
    jobUrl: pendingRow?.jobUrl ?? "",
    jobContext: pendingRow?.jobContext ?? "",
    parsedJd: pendingRow?.parsedJd ?? null,
    assistedSummaries: null,
    verifiedClaims: null,
    atsSelections: null,
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
  /**
   * "Generate another CV" for an application that already has one: the row is
   * the seed (its code/data reused), but the flow starts at Modo so a different
   * mode can be picked, and generation appends a variant instead of replacing.
   */
  variantMode?: boolean;
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
  variantMode,
  onCancel,
  container,
}: WizardProps) {
  // Fresh flow starts at Empresa (1). Deferred generation skips Empresa/
  // Opcionales (their data lives on the row) and resumes at Idioma y foco (3) —
  // unless the row has no company yet (a contact-only draft), in which case it
  // starts at Empresa (1) so the now-required company can be added. It then flows
  // through Modo (4), so a deferred CV can also be tailored. "Generate another CV"
  // (variantMode) seeds from the row and walks the whole wizard from step 1.
  const startStep = variantMode ? 1 : pendingRow ? (pendingRow.company.trim() === "" ? 1 : 3) : 1;
  const [step, setStep] = useState(startStep);
  const [data, setData] = useState<WizardData>(() => initialData(pendingRow));
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [savingPending, setSavingPending] = useState(false);
  // The row this session is bound to — the `pendingRow` prop, or one silently
  // created mid-session by an optional cover letter/preguntas action (see StepConfirm).
  const [activeRow, setActiveRow] = useState<RegistryRow | null>(pendingRow ?? null);
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>({ kind: "view" });

  const set = (patch: Partial<WizardData>) => setData((current) => ({ ...current, ...patch }));

  const hasJd = hasJdContent(data.parsedJd);
  const totalSteps = totalStepsFor(data.mode, hasJd);
  const stepTitles =
    data.mode === "ats"
      ? STEP_TITLES_ATS
      : data.mode === "verbatim" && hasJd
        ? STEP_TITLES_VERBATIM
        : data.mode === "assisted" && hasJd
          ? STEP_TITLES_ASSISTED
          : STEP_TITLES_BASE;
  // Confirm step is always last: totalSteps (5 without a gate step, 6 with one).
  const confirmStep = totalSteps;

  // Registering never blocks on the CV: a process is identified by empresa OR
  // contacto (a recruiter can reach out before the company is known). Empresa
  // becomes required only at CV generation — see docs/decisions.md → "Registro
  // nunca bloqueante".
  const identityValid = data.company.trim() !== "" || data.who.trim() !== "";
  // Empresa alone is required to generate the CV (it names the delivery folder).
  const companyForGen = data.company.trim() !== "";
  // Step 1 gates on identity (empresa o contacto). ATS is chosen at Modo (step
  // 4) and needs a JD (from Opcionales). Step 5 (the gate) gates on the mode's
  // data being initialised (StepAts / StepVerify / StepAssisted).
  const canAdvance =
    step === 1
      ? identityValid
      : // ATS mode is picked at Modo and needs a JD to build from.
        step === 4 && data.mode === "ats"
        ? hasJd
        : step === 5 && data.mode === "ats"
          ? data.atsSelections !== null
          : step === 5 && data.mode === "verbatim" && hasJd
            ? data.verifiedClaims !== null
            : step === 5 && data.mode === "assisted" && hasJd
              ? data.assistedSummaries !== null
              : true;

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
    if (step < confirmStep - 1) {
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
      setStep(confirmStep);
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
          reach: data.reach,
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
          reach: data.reach,
          who: data.who,
          channel: data.channel === "" ? undefined : data.channel,
          email: sanitizedEmail(),
          jobUrl: data.jobUrl,
          jobContext: data.jobContext,
          parsedJd: data.parsedJd ?? undefined,
          assistedSummaries:
            data.assistedSummaries && Object.keys(data.assistedSummaries).length > 0
              ? data.assistedSummaries
              : undefined,
          verifiedClaims: data.verifiedClaims ?? undefined,
          atsOverrides:
            data.mode === "ats" && data.parsedJd && data.atsSelections
              ? buildAtsOverrides(data.parsedJd, data.atsSelections)
              : undefined,
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
  if (step === confirmStep && confirmMode.kind === "cover-letter-generate" && activeRow) {
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
    step === confirmStep &&
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
              Paso {step} de {totalSteps}
            </span>
            <span className="font-medium text-foreground">{stepTitles[step - 1]}</span>
          </div>
          <Progress value={((step - 1) / (totalSteps - 1)) * 100} />
        </div>

        <div className="min-h-[260px]">
          {step === 1 && <StepCompany data={data} set={set} container={container} />}
          {step === 2 && <StepOptional data={data} set={set} container={container} />}
          {step === 3 && <StepLanguage data={data} set={set} container={container} spec={spec} />}
          {step === 4 && <StepMode data={data} set={set} container={container} hasJd={hasJd} />}
          {step === 5 && data.mode === "assisted" && hasJd && (
            <StepAssisted data={data} set={set} container={container} />
          )}
          {step === 5 && data.mode === "verbatim" && hasJd && (
            <StepVerify data={data} set={set} container={container} />
          )}
          {step === 5 && data.mode === "ats" && (
            <StepAts data={data} set={set} container={container} />
          )}
          {step === confirmStep && previewCode && (
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
          {step === confirmStep && previewCode && !companyForGen && (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-500">
              Falta la empresa. Volvé al paso Empresa y contacto para completarla —
              hace falta para generar el CV.
            </p>
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
              on every step before Confirmar — registering only needs empresa OR
              contacto, never the CV path. */}
          {step < confirmStep && onSavePending && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSavePending}
              disabled={!identityValid || savingPending || generating}
            >
              {savingPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileClock className="size-4" />
              )}
              Registrar sin CV
            </Button>
          )}
          {step < confirmStep ? (
            <Button type="button" size="sm" onClick={goNext} disabled={!canAdvance || savingPending}>
              Siguiente
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handleGenerate}
              disabled={generating || !companyForGen}
              title={companyForGen ? undefined : "Completá la empresa para generar el CV"}
            >
              {generating ? <Loader2 className="size-4 animate-spin" /> : null}
              Generar CV
            </Button>
          )}
        </div>
      </DrawerFooter>
    </>
  );
}
