"use client";

import { FolderIcon } from "lucide-react";

import { COVER_LETTER_FILENAME } from "@/core/coverLetter/docx";
import { folderName } from "@/core/folderName";
import { profileLabel } from "@/core/spec/profiles";
import type { LinkSpec } from "@/core/spec/types";
import { languageLabel } from "@/core/types";
import { CV_FILENAME } from "@/core/zip";
import { languagesFor, type WizardData } from "./types";

export interface StepConfirmProps {
  data: WizardData;
  previewCode: string;
  spec: LinkSpec | null;
  /** Name of the selected cover letter template, if any. */
  coverLetterName?: string;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right font-medium break-words">{value}</span>
    </div>
  );
}

/** Step 5 — Confirm. Shows a summary and a preview of the folder name(s) to be created. */
export function StepConfirm({ data, previewCode, spec, coverLetterName }: StepConfirmProps) {
  const folders = languagesFor(data.language).map((language) => ({
    language,
    name: folderName({ language, company: data.company, code: previewCode }),
    // The folder carries a letter only when its language has a non-empty body.
    withLetter:
      data.coverLetterTemplateId !== "" &&
      (data.coverLetterBodies[language]?.trim() ?? "") !== "",
  }));
  const anyLetter = folders.some((folder) => folder.withLetter);
  const capturedQuestions = data.screeningQuestions.filter(
    (entry) => entry.question.trim() !== "",
  ).length;

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
        {anyLetter && coverLetterName && (
          <SummaryRow label="Cover letter" value={coverLetterName} />
        )}
        {capturedQuestions > 0 && (
          <SummaryRow label="Preguntas" value={String(capturedQuestions)} />
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
            {folder.withLetter && (
              <div className="pl-6 font-mono text-xs text-muted-foreground">
                └ {COVER_LETTER_FILENAME}
              </div>
            )}
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          Código de tracking: <span className="font-mono font-medium">{previewCode}</span>. El
          nombre del archivo nunca lleva datos de tracking.
        </p>
      </div>
    </div>
  );
}
