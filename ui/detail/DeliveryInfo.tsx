"use client";

import { Download, ExternalLink, FilePlus2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { COVER_LETTER_FILENAME } from "@/core/coverLetter/docx";
import type { RegistryRow } from "@/core/registry/types";
import { CV_FILENAME } from "@/core/zip";
import { deliveryFileUrl } from "@/lib/archive";

/**
 * Metadata of an archived delivered file: language (from the folder,
 * `[LANG]_[company]_[code]`), kind (from the generic delivery file name) and
 * the display label — language first: "EN · CV", "ES · Carta".
 */
function deliveryFileMeta(path: string): {
  language: string;
  kind: string;
  variant?: string;
  label: string;
} {
  // Path is "[LANG]_[company]_[code]/[file]" or, for an extra CV variant,
  // "[LANG]_[company]_[code]/[mode]/[file]" (the mode is the middle segment).
  const parts = path.split("/");
  const folder = parts[0] ?? "";
  const file = parts[parts.length - 1] ?? "";
  const variant = parts.length === 3 ? parts[1] : undefined;
  const language = folder.split("_")[0];
  const kind = file === CV_FILENAME ? "CV" : file === COVER_LETTER_FILENAME ? "Carta" : file;
  const label = [language, kind, variant].filter(Boolean).join(" · ");
  return { language, kind, variant, label };
}

/** Direct Google Doc URL for a delivered file, from the row's per-doc links. */
function driveDocUrl(
  row: RegistryRow,
  meta: { language: string; kind: string },
): string | undefined {
  const docs =
    meta.kind === "CV" ? row.driveDocs : meta.kind === "Carta" ? row.driveLetterDocs : undefined;
  return docs?.[meta.language as "EN" | "ES"];
}

export interface DeliveryInfoProps {
  row: RegistryRow;
  /** Open the deferred-generation wizard for this pending row. */
  onGenerateCv?: () => void;
  /** Open the wizard to generate an ADDITIONAL CV (another mode) for this application. */
  onGenerateVariant?: () => void;
}

/**
 * Where this application's deliverables live. Each archived file is one row
 * ("EN · CV", "EN · Carta") with two actions: open its Google Doc in Drive
 * (when the sink ran — replaces the old folder link) and re-download the
 * archived copy (data/cvs/ locally, Supabase Storage on a deploy). Rows
 * without per-file archives fall back to the old folder / doc-links.
 * A pending row (no CV yet) shows the "Generar CV" CTA instead.
 */
export function DeliveryInfo({ row, onGenerateCv, onGenerateVariant }: DeliveryInfoProps) {
  const files = row.deliveryFiles ?? [];
  const docs = Object.entries(row.driveDocs ?? {}) as Array<[string, string]>;

  if (row.cvPending) {
    return (
      <div className="space-y-2 rounded-lg border px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">Entrega</span>
        <p className="text-xs text-muted-foreground">
          Sin CV generado — el proceso está registrado con el código reservado.
        </p>
        <Button variant="outline" size="sm" onClick={onGenerateCv}>
          <FilePlus2 className="size-4" />
          Generar CV
        </Button>
      </div>
    );
  }

  if (files.length === 0 && !row.driveFolder && docs.length === 0 && !onGenerateVariant)
    return null;

  return (
    <div className="space-y-2 rounded-lg border px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">Entrega</span>

      {files.length > 0 && (
        <div className="space-y-0.5">
          <span className="text-xs text-muted-foreground">Archivos enviados</span>
          {files.map((path) => {
            const meta = deliveryFileMeta(path);
            const docUrl = driveDocUrl(row, meta);
            return (
              <div key={path} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-mono text-xs" title={path}>
                  {meta.label}
                </span>
                {docUrl && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0"
                    title={`Abrir ${meta.label} en Google Drive`}
                    render={
                      <a
                        href={docUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Abrir ${meta.label} en Google Drive`}
                      />
                    }
                  >
                    <ExternalLink className="size-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0"
                  title={`Descargar ${meta.label}`}
                  render={<a href={deliveryFileUrl(path)} download aria-label={`Descargar ${path}`} />}
                >
                  <Download className="size-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Legacy fallback: rows without per-file archives have no rows to hang
          the Drive icons on — keep the old folder / per-language doc links. */}
      {files.length === 0 &&
        (row.driveFolder ? (
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Carpeta en Google Drive</span>
            <div className="flex items-start gap-2">
              {/* Drive URLs are safe to click (no tracker), unlike the tracked links above. */}
              <a
                href={row.driveFolder}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate font-mono text-xs underline underline-offset-2 hover:text-foreground"
                title={row.driveFolder}
              >
                {row.driveFolder}
              </a>
              <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
            </div>
          </div>
        ) : (
          docs.map(([language, url]) => (
            <div key={language} className="space-y-0.5">
              <span className="text-xs text-muted-foreground">Google Docs · {language}</span>
              <div className="flex items-start gap-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate font-mono text-xs underline underline-offset-2 hover:text-foreground"
                  title={url}
                >
                  {url}
                </a>
                <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
              </div>
            </div>
          ))
        ))}

      {/* Generate another CV (a different mode) for this same application. */}
      {onGenerateVariant && (
        <Button variant="outline" size="sm" className="mt-1" onClick={onGenerateVariant}>
          <FilePlus2 className="size-4" />
          Generar otro CV
        </Button>
      )}
    </div>
  );
}
