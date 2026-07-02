"use client";

import { FolderIcon } from "lucide-react";

import { folderName } from "@/core/folderName";
import { languageLabel } from "@/core/types";
import { CV_FILENAME } from "@/core/zip";
import { languagesFor, type WizardData } from "./types";

export interface StepConfirmProps {
  data: WizardData;
  previewCode: string;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right font-medium break-words">{value}</span>
    </div>
  );
}

/** Step 4 — Confirm. Shows a summary and a preview of the folder name(s) to be created. */
export function StepConfirm({ data, previewCode }: StepConfirmProps) {
  const folders = languagesFor(data.language).map((language) =>
    folderName({ language, company: data.company, code: previewCode }),
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1.5 rounded-lg border p-3">
        <SummaryRow label="Empresa" value={data.company} />
        <SummaryRow label="Idioma" value={languageLabel(data.language)} />
        <SummaryRow label="Fecha" value={data.date.toLocaleDateString("es-AR")} />
        <SummaryRow label="Rol" value={data.role} />
        {data.channel && <SummaryRow label="Canal" value={data.channel} />}
        {data.channel === "Email" && data.email.trim() !== "" && (
          <SummaryRow label="Email" value={data.email} />
        )}
        {data.who.trim() !== "" && <SummaryRow label="Quién" value={data.who} />}
        {data.jobUrl.trim() !== "" && <SummaryRow label="Link del puesto" value={data.jobUrl} />}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Se va a generar {folders.length > 1 ? "un .zip con estas carpetas" : "esta carpeta"}:
        </p>
        {folders.map((folder) => (
          <div key={folder} className="rounded-lg border bg-muted/40 p-2.5">
            <div className="flex items-center gap-2 font-mono text-sm font-medium">
              <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
              {folder}
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
    </div>
  );
}
