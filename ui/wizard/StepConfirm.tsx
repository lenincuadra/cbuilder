"use client";

import { useState } from "react";
import { FolderIcon, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { folderName } from "@/core/folderName";
import { profileLabel } from "@/core/spec/profiles";
import type { LinkSpec } from "@/core/spec/types";
import type { RegistryRow } from "@/core/registry/types";
import type { ScreeningQuestion } from "@/core/screening/types";
import { languageLabel } from "@/core/types";
import { CV_FILENAME } from "@/core/zip";
import { CoverLetterSection } from "@/ui/detail/CoverLetterSection";
import { ScreeningSection } from "@/ui/detail/ScreeningSection";
import type { UseScreening } from "@/ui/useScreening";
import { languagesFor, type WizardData } from "./types";

export interface StepConfirmProps {
  data: WizardData;
  previewCode: string;
  spec: LinkSpec | null;
  /**
   * Row this session is bound to, once ensured — governs whether the
   * optional cover letter/preguntas sections below show their real, row-bound
   * UI or a collapsed teaser that creates the row on first use.
   */
  activeRow: RegistryRow | null;
  /** Silently creates/reuses the session's Borrador row. Absent hides the optional sections entirely. */
  onEnsureRow?: () => Promise<RegistryRow>;
  onStartCoverLetterGenerate: () => void;
  onStartScreeningNew: () => void;
  onEditScreening: (entry: ScreeningQuestion) => void;
  onSuggestScreening: (entry: ScreeningQuestion) => void;
  /** Shared screening-questions bank — required for the Preguntas section. */
  screening?: UseScreening;
  /** Portal target for the Preguntas section's "Vincular del banco" dropdown. */
  container?: HTMLElement | null;
}

function SummaryRow({
  label,
  value,
  truncate = false,
}: {
  label: string;
  value: string;
  /** Single-line ellipsis for long free-text values (full text in the title tooltip). */
  truncate?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span
        title={truncate ? value : undefined}
        className={
          truncate
            ? "min-w-0 truncate text-right font-medium"
            : "min-w-0 text-right font-medium break-words"
        }
      >
        {value}
      </span>
    </div>
  );
}

/** Last step — Confirm. Shows a summary, a preview of the folder name(s) to be
 *  created, and — at the end — the optional cover letter/preguntas actions
 *  (same sections as the row's post-generation detail view). */
export function StepConfirm({
  data,
  previewCode,
  spec,
  activeRow,
  onEnsureRow,
  onStartCoverLetterGenerate,
  onStartScreeningNew,
  onEditScreening,
  onSuggestScreening,
  screening,
  container,
}: StepConfirmProps) {
  const [ensuring, setEnsuring] = useState(false);
  const folders = languagesFor(data.language).map((language) => ({
    language,
    name: folderName({ language, company: data.company, code: previewCode }),
  }));

  async function ensureThenStart(start: () => void) {
    if (!onEnsureRow) return;
    setEnsuring(true);
    try {
      await onEnsureRow();
      start();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el registro.");
    } finally {
      setEnsuring(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5 rounded-lg border p-3">
        <SummaryRow label="Empresa" value={data.company} />
        <SummaryRow label="Idioma" value={languageLabel(data.language)} />
        {data.focus !== "" && (
          <SummaryRow label="Foco" value={spec ? profileLabel(spec, data.focus) : data.focus} />
        )}
        <SummaryRow label="Fecha" value={data.date.toLocaleDateString("es-AR")} />
        <SummaryRow label="Rol" value={data.role} />
        {data.channel && <SummaryRow label="Canal" value={data.channel} />}
        {data.channel === "Email" && data.email.trim() !== "" && (
          <SummaryRow label="Email" value={data.email} />
        )}
        {data.who.trim() !== "" && <SummaryRow label="Quién" value={data.who} />}
        {data.jobUrl.trim() !== "" && <SummaryRow label="Link del puesto" value={data.jobUrl} />}
        {data.jobContext.trim() !== "" && (
          <SummaryRow label="Contexto del puesto" value={data.jobContext} truncate />
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Se va a generar {folders.length > 1 ? "un .zip con estas carpetas" : "esta carpeta"}:
        </p>
        {folders.map((folder) => (
          <div key={folder.name} className="rounded-lg border bg-muted/40 p-2.5">
            <div className="flex items-center gap-2 font-mono text-sm font-medium">
              <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
              {folder.name}
            </div>
            <div className="mt-1 pl-6 font-mono text-xs text-muted-foreground">
              └ {CV_FILENAME}
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          Código de tracking: <span className="font-mono font-medium">{previewCode}</span>. El
          nombre del archivo nunca lleva datos de tracking.
        </p>
      </div>

      {onEnsureRow && (
        <div className="space-y-2">
          {activeRow ? (
            <CoverLetterSection row={activeRow} onStartGenerate={onStartCoverLetterGenerate} />
          ) : (
            <div className="space-y-2 rounded-lg border px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">Cover letter</span>
              <p className="text-xs text-muted-foreground">Sin cover letter todavía.</p>
              <Button
                variant="outline"
                size="sm"
                disabled={ensuring}
                onClick={() => ensureThenStart(onStartCoverLetterGenerate)}
              >
                <Plus className="size-4" />
                Generar cover letter
              </Button>
            </div>
          )}

          {screening &&
            (activeRow ? (
              <ScreeningSection
                code={activeRow.code}
                screening={screening}
                onStartNew={onStartScreeningNew}
                onEdit={onEditScreening}
                onSuggest={onSuggestScreening}
                container={container}
              />
            ) : (
              <div className="space-y-3 rounded-lg border px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground">Preguntas</span>
                <p className="text-sm text-muted-foreground">
                  Ninguna pregunta registrada para esta aplicación.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={ensuring}
                  onClick={() => ensureThenStart(onStartScreeningNew)}
                >
                  <Plus className="size-4" />
                  Nueva
                </Button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
