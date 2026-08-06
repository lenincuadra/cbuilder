"use client";

import { useState } from "react";
import { FileDown, FileWarning, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DrawerBody } from "@/components/ui/drawer";
import { formatDateShort } from "@/core/dates";
import { generatePortfolioCv, WEB_CV_REF } from "@/core/generatePortfolioCv";
import type { Language } from "@/core/types";
import { downloadBytes } from "@/lib/download";
import { loadMaster } from "@/lib/masters";
import { cn } from "@/lib/utils";
import { MASTER_VERSION } from "@/lib/version";
import { PanelCard, PanelCardFace } from "@/ui/PanelCard";
import { useSpec } from "@/ui/useSpec";
import { usePortfolioCv, type UsePortfolioCv } from "@/ui/usePortfolioCv";

const LANGUAGES = ["EN", "ES"] as const;
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Whether a language's published portfolio CV is behind the current master. */
function isStale(published: { version: number } | undefined): boolean {
  return !published || published.version < MASTER_VERSION;
}

/**
 * Drawer body: one row per language with its master vs. published version, a
 * "Generar" button (downloads the .docx with the web-cv tracked links) and a
 * "Marcar publicado" button (records the current master version as live).
 */
function PortfolioCvManager({ store }: { store: UsePortfolioCv }) {
  const { spec, loading: specLoading } = useSpec();
  const [busy, setBusy] = useState<Language | null>(null);

  async function generate(language: Language) {
    if (!spec) {
      toast.error("Esperando el link-spec del portfolio. Probá de nuevo en un momento.");
      return;
    }
    setBusy(language);
    try {
      const result = await generatePortfolioCv(language, { spec, loadMaster });
      const bytes = result.files[language];
      if (!bytes) throw new Error("No se generó el archivo.");
      downloadBytes(bytes, `Lenin_Cuadra_CV_${language}.docx`, DOCX_MIME);
      toast.success(`CV genérico ${language} generado. Subilo al portafolio y marcá publicado.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar el CV genérico.");
    } finally {
      setBusy(null);
    }
  }

  async function markPublished(language: Language) {
    try {
      await store.markPublished(language, MASTER_VERSION);
      toast.success(`CV del portafolio (${language}) marcado como publicado v${MASTER_VERSION}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo marcar como publicado.");
    }
  }

  return (
    <DrawerBody className="gap-3">
      <p className="text-xs text-muted-foreground">
        El CV público del portafolio (ES/EN) con los 3 links de tracking horneados bajo el
        código fijo <code className="font-mono">{WEB_CV_REF}</code>. Generalo, subilo al
        portafolio y marcá la versión publicada; cuando el master cambie, la card avisa que
        quedó desactualizado.
      </p>

      <div className="space-y-2">
        {LANGUAGES.map((language) => {
          const published = store.state[language];
          const stale = isStale(published);
          return (
            <div
              key={language}
              className={cn(
                "rounded-lg border p-3",
                stale && "border-amber-500/40 bg-amber-500/5",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {language} · master v{MASTER_VERSION}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium",
                    stale ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground",
                  )}
                >
                  {stale ? "Desactualizado" : "Al día"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {published
                  ? `Publicado: v${published.version} · ${formatDateShort(published.publishedAt.slice(0, 10))}`
                  : "Nunca publicado."}
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generate(language)}
                  disabled={busy !== null || specLoading}
                >
                  {busy === language ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FileDown className="size-4" />
                  )}
                  Generar {language}
                </Button>
                {/* Only meaningful while stale — once marked publicado it's "Al
                    día", so it hides until a master bump makes it stale again. */}
                {stale && (
                  <Button
                    size="sm"
                    onClick={() => markPublished(language)}
                    disabled={busy !== null}
                  >
                    Marcar publicado v{MASTER_VERSION}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </DrawerBody>
  );
}

/**
 * Right-column card for the generic portfolio CV: generate the public ES/EN CV
 * with tracking (fixed `web-cv` code) and track which master version is live on
 * the portfolio, flagging it when a master bump leaves it stale. Same PanelCard
 * pattern as the other cards.
 */
export function PortfolioCvCard() {
  const store = usePortfolioCv();
  const anyStale = !store.loading && LANGUAGES.some((language) => isStale(store.state[language]));

  return (
    <PanelCard
      title="CV del portafolio"
      description="CV público (ES/EN) con tracking."
      card={(open) => (
        <PanelCardFace
          icon={anyStale ? FileWarning : FileDown}
          title="CV del portafolio"
          description={
            anyStale ? "Desactualizado — regeneralo y subilo." : "CV público (ES/EN) con tracking."
          }
          onOpen={open}
        />
      )}
    >
      {() => <PortfolioCvManager store={store} />}
    </PanelCard>
  );
}
