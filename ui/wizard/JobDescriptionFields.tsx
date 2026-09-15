"use client";

import { useState } from "react";
import { Loader2, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ParsedJd } from "@/core/jdParse/types";
import type { StepProps } from "./StepCompany";

/** True when the parse yielded at least one usable claim (unlocks the tailored modes). */
function hasParsedContent(p: ParsedJd | null | undefined): boolean {
  return (
    !!p &&
    (!!p.jobTitle ||
      p.requiredKeywords.length > 0 ||
      p.tools.length > 0 ||
      p.preferredKeywords.length > 0)
  );
}

/**
 * Job-posting capture: URL auto-detect, paste, and AI analysis of the job
 * description. Writes the shared wizard state (`jobUrl` / `jobContext` /
 * `parsedJd`), so it can live in more than one step as parallel entry points to
 * the same data — used both in Opcionales (where the JD is first offered) and in
 * Modo (so the JD can be analyzed there to unlock the tailored CV modes without
 * navigating back). `showUrl` hides the URL row where only the paste path fits.
 */
export function JobDescriptionFields({
  data,
  set,
  showUrl = true,
}: Pick<StepProps, "data" | "set"> & { showUrl?: boolean }) {
  const [detecting, setDetecting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  // True after an analysis that returned no usable claims (text isn't a real JD).
  // Persistent inline feedback — a toast alone is too easy to miss.
  const [notFound, setNotFound] = useState(false);

  async function detect() {
    if (data.jobUrl.trim() === "") return;
    setDetecting(true);
    try {
      const res = await fetch("/api/job-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: data.jobUrl.trim() }),
      });
      const payload = (await res.json()) as { context?: string | null; parsed?: ParsedJd | null };
      if (payload.context) {
        set({
          jobContext: payload.context,
          parsedJd: hasParsedContent(payload.parsed) ? payload.parsed : null,
        });
      } else {
        toast.info("No encontramos el detalle del puesto en esa página — completalo a mano.");
      }
    } catch {
      toast.info("No encontramos el detalle del puesto en esa página — completalo a mano.");
    } finally {
      setDetecting(false);
    }
  }

  async function analyze() {
    const text = data.jobContext.trim();
    if (text === "") return;
    // Too short to be a real posting — the API short-circuits (<20 chars) to an
    // empty result anyway; skip the round-trip and surface it inline directly.
    if (text.length < 20) {
      set({ parsedJd: null });
      setNotFound(true);
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch("/api/ai/jd-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const payload = (await res.json()) as { parsed?: ParsedJd | null };
      // Any result without usable claims (empty parse, too short, or AI off) is
      // actionable the same way: paste the real posting. Persistent inline, not
      // a toast — the user is looking right here for why the modes stay locked.
      set({ parsedJd: hasParsedContent(payload.parsed) ? payload.parsed : null });
      setNotFound(!hasParsedContent(payload.parsed));
    } catch {
      set({ parsedJd: null });
      setNotFound(true);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <>
      {showUrl && (
        <div className="space-y-2">
          <Label htmlFor="jobUrl">Link del puesto</Label>
          <div className="flex gap-2">
            <Input
              id="jobUrl"
              type="url"
              placeholder="https://…"
              value={data.jobUrl}
              onChange={(event) => set({ jobUrl: event.target.value })}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={detect}
              disabled={data.jobUrl.trim() === "" || detecting}
            >
              {detecting ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              Detectar
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="jobContext">Descripción del puesto</Label>
        <Textarea
          id="jobContext"
          placeholder="Pegá la descripción del puesto (opcional). Sirve para tailorear el CV y la carta."
          value={data.jobContext}
          rows={4}
          className="text-xs"
          onChange={(event) => {
            set({ jobContext: event.target.value, parsedJd: null });
            setNotFound(false);
          }}
        />
        {data.jobContext.trim() !== "" && !data.parsedJd && (
          <div className="space-y-1.5">
            <Button type="button" size="sm" onClick={analyze} disabled={analyzing} className="gap-2">
              {analyzing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {analyzing ? "Analizando…" : "Analizar con IA"}
            </Button>
            {notFound ? (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                No se detectaron keywords — esto no parece la descripción completa de un puesto.
                Pegá la búsqueda entera y volvé a analizar.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Analizá para extraer keywords y habilitar los modos adaptados.
              </p>
            )}
          </div>
        )}
        {data.parsedJd && (
          <p className="text-xs text-muted-foreground">
            Analizado:{" "}
            <span className="text-foreground font-medium">
              {[
                data.parsedJd.requiredKeywords.length > 0 &&
                  `${data.parsedJd.requiredKeywords.length} keywords`,
                data.parsedJd.tools.length > 0 && `${data.parsedJd.tools.length} tools`,
                data.parsedJd.jobTitle && `título "${data.parsedJd.jobTitle}"`,
              ]
                .filter(Boolean)
                .join(", ")}
            </span>
          </p>
        )}
      </div>
    </>
  );
}
