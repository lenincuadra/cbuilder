"use client";

import { Download, ExternalLink, FilePlus2, FolderOpen } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { COVER_LETTER_FILENAME } from "@/core/coverLetter/docx";
import type { RegistryRow } from "@/core/registry/types";
import { CV_FILENAME } from "@/core/zip";
import { deliveryFileUrl, revealDelivery } from "@/lib/archive";

/**
 * Human label for an archived delivered file: "CV · EN", "Carta · ES".
 * The folder is `[LANG]_[company]_[code]`; the file name is one of the two
 * generic delivery names.
 */
function deliveryFileLabel(path: string): string {
  const [folder = "", file = ""] = path.split("/");
  const language = folder.split("_")[0];
  const kind = file === CV_FILENAME ? "CV" : file === COVER_LETTER_FILENAME ? "Carta" : file;
  return language ? `${kind} · ${language}` : kind;
}

export interface DeliveryInfoProps {
  row: RegistryRow;
  /** Open the deferred-generation wizard for this pending row. */
  onGenerateCv?: () => void;
}

/**
 * Where this application's deliverables live: the archived files (data/cvs/
 * locally, Supabase Storage on a deploy — each directly downloadable), the
 * legacy archived .zip (pre per-file rows, revealable in Finder) and the
 * Google Docs folder in Drive. Older rows predate some fields — the card hides
 * what it doesn't know. A pending row (no CV yet) shows the "Generar CV" CTA
 * instead.
 */
export function DeliveryInfo({ row, onGenerateCv }: DeliveryInfoProps) {
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

  if (files.length === 0 && !row.zipName && !row.driveFolder && docs.length === 0) return null;

  async function reveal(name: string) {
    try {
      // null = revealed; a message = feature not available here (deploy) — info, not error.
      const unavailable = await revealDelivery(name);
      if (unavailable) toast.info(unavailable);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo abrir el Finder.");
    }
  }

  return (
    <div className="space-y-2 rounded-lg border px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">Entrega</span>

      {files.length > 0 && (
        <div className="space-y-0.5">
          <span className="text-xs text-muted-foreground">Archivos enviados</span>
          {files.map((path) => (
            <div key={path} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-mono text-xs" title={path}>
                {deliveryFileLabel(path)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0"
                title={`Descargar ${deliveryFileLabel(path)}`}
                render={<a href={deliveryFileUrl(path)} download aria-label={`Descargar ${path}`} />}
              >
                <Download className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Legacy rows (pre per-file archive): the zip in data/cvs/, Finder-only. */}
      {row.zipName && files.length === 0 && (
        <div className="space-y-0.5">
          <span className="text-xs text-muted-foreground">Zip archivado (data/cvs)</span>
          <div className="flex items-start gap-2">
            <span className="min-w-0 flex-1 font-mono text-xs break-all select-all">
              {row.zipName}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 shrink-0"
              onClick={() => reveal(row.zipName!)}
              title="Mostrar en Finder"
              aria-label={`Mostrar ${row.zipName} en Finder`}
            >
              <FolderOpen className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {row.driveFolder ? (
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
      )}
    </div>
  );
}
