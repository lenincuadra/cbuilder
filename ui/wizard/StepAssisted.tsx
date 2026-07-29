"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { languagesFor } from "@/core/types";
import type { Language } from "@/core/types";
import type { StepProps } from "./StepCompany";

/**
 * Step 5 (Modo 2 only) — AI-drafted professional summary.
 *
 * The AI rewrites Lenin's professional summary in the JD's language, grounded
 * in his real background (never invents). The draft is editable before
 * confirming. The gate is "completed" the moment this step is visited:
 * `assistedSummaries` is initialised to {} on mount, and the user can advance
 * even without generating (skips summary injection, same result as base mode).
 */
export function StepAssisted({ data, set }: StepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialise on mount so canAdvance passes as soon as the step is reached.
  useEffect(() => {
    if (data.assistedSummaries === null) {
      set({ assistedSummaries: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const languages = languagesFor(data.language);
  const summaries = data.assistedSummaries ?? {};
  const hasAny = languages.some((lang) => summaries[lang]);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/cv-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: data.company,
          role: data.role,
          focus: data.focus || undefined,
          jobContext: data.jobContext || undefined,
          parsedJd: data.parsedJd || undefined,
          languages,
        }),
      });
      const payload = (await res.json()) as {
        summaries?: Partial<Record<Language, string>>;
        error?: string;
      };
      if (!res.ok) throw new Error(payload.error ?? `Error ${res.status}`);
      set({ assistedSummaries: payload.summaries ?? {} });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  function setSummary(lang: Language, value: string) {
    set({ assistedSummaries: { ...summaries, [lang]: value } });
  }

  const langLabel: Record<Language, string> = { EN: "Inglés", ES: "Español" };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        La IA reescribe tu resumen profesional en el lenguaje de esta búsqueda, usando solo
        tu experiencia real. Editá el borrador antes de confirmar. Si saltás este paso, el
        CV usa el resumen del master sin cambios.
      </p>

      {!data.parsedJd && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-muted-foreground">
          Sin descripción analizada — el resumen usará solo tu perfil general. Para mayor
          precisión, volvé al paso anterior y usá{" "}
          <span className="font-medium text-foreground">Detectar</span>.
        </p>
      )}

      <Button
        type="button"
        variant={hasAny ? "outline" : "default"}
        size="sm"
        onClick={generate}
        disabled={loading}
        className="gap-2"
      >
        {loading ? (
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
        ) : hasAny ? (
          <RefreshCw className="size-3.5" />
        ) : (
          <Sparkles className="size-3.5" />
        )}
        {loading
          ? "Generando…"
          : hasAny
            ? "Regenerar"
            : `Generar con IA${languages.length > 1 ? " (EN + ES)" : ""}`}
      </Button>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {hasAny && (
        <div className="space-y-4">
          {languages.map((lang) =>
            summaries[lang] !== undefined ? (
              <div key={lang} className="space-y-1.5">
                {languages.length > 1 && (
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {langLabel[lang]}
                  </p>
                )}
                <Textarea
                  value={summaries[lang]}
                  onChange={(e) => setSummary(lang, e.target.value)}
                  rows={5}
                  className="resize-none text-sm"
                />
              </div>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
