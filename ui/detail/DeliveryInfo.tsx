"use client";

import { ExternalLink, FolderOpen } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { RegistryRow } from "@/core/registry/types";
import { revealCvZip } from "@/lib/archive";

/**
 * Where this application's deliverables live: the archived .zip (data/cvs/,
 * revealable in Finder) and the Google Docs folder in Drive. Older rows predate
 * these fields — the card hides what it doesn't know. Falls back to per-language
 * Doc links for rows that have driveDocs but no driveFolder.
 */
export function DeliveryInfo({ row }: { row: RegistryRow }) {
  const docs = Object.entries(row.driveDocs ?? {}) as Array<[string, string]>;
  if (!row.zipName && !row.driveFolder && docs.length === 0) return null;

  async function reveal(name: string) {
    try {
      await revealCvZip(name);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo abrir el Finder.");
    }
  }

  return (
    <div className="space-y-2 rounded-lg border px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">Entrega</span>

      {row.zipName && (
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
