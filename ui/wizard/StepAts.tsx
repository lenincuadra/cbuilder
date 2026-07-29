"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { cvDataFor } from "@/core/cvData";
import { initialAtsSelections, suggestCompetencies } from "@/core/cvData/tailor";
import type { AtsSelections, ExperienceVariant } from "@/core/cvData/tailor";
import type { ThematicGroup } from "@/core/cvData/docx";
import type { ExperienceEntry } from "@/core/cvData/types";
import { scoreFromText } from "@/core/jdParse/score";
import { languagesFor, type Language } from "@/core/types";
import type { StepProps } from "./StepCompany";

/** The gate's primary language for AI drafts (ES only when ES-only; else EN). */
function primaryLanguage(choice: string): Language {
  return choice === "ES" ? "ES" : "EN";
}

/**
 * Step 5 (Modo ATS máximo only) — the human verification gate. Everything that
 * lands in the fresh-built CV passes through here:
 * - Title: confirm the JD title is truthful.
 * - Core Competencies: check the verbatim JD keywords Lenin has (pre-checked
 *   to the ones already in his skills).
 * - Values Alignment: one evidence line per company value (AI-draftable, edited).
 * - Summary: AI-tailored, editable.
 *
 * Initialised on mount so `canAdvance` passes once visited; nothing is injected
 * that Lenin didn't confirm (see `buildAtsOverrides`).
 */
export function StepAts({ data, set }: StepProps) {
  const lang = primaryLanguage(data.language);
  const cvData = useMemo(() => cvDataFor(lang), [lang]);
  const candidates = useMemo(
    () => (data.parsedJd ? suggestCompetencies(data.parsedJd, cvData) : []),
    [data.parsedJd, cvData],
  );
  const sel = data.atsSelections;

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [valuesLoading, setValuesLoading] = useState(false);
  const [expLoading, setExpLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialise the gate on mount (pre-checks competencies Lenin already lists).
  useEffect(() => {
    if (!sel && data.parsedJd) {
      set({ atsSelections: initialAtsSelections(data.parsedJd, cvData) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data.parsedJd) {
    return (
      <p className="text-sm text-muted-foreground">
        Este modo necesita la descripción del puesto. Volvé al paso{" "}
        <span className="font-medium text-foreground">Opcionales</span> y pegá/analizá la búsqueda.
      </p>
    );
  }
  if (!sel) return null; // mounting

  const parsedJd = data.parsedJd;

  function patch(update: Partial<AtsSelections>) {
    set({ atsSelections: { ...sel!, ...update } });
  }

  function toggleCompetency(keyword: string, checked: boolean) {
    const current = sel!.competencies;
    patch({
      competencies: checked ? [...current, keyword] : current.filter((k) => k !== keyword),
    });
  }

  function setValueEvidence(value: string, evidence: string) {
    patch({ values: sel!.values.map((v) => (v.value === value ? { ...v, evidence } : v)) });
  }

  async function generateSummary() {
    setSummaryLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/cv-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: data.company,
          role: parsedJd.jobTitle || data.role,
          focus: data.focus || undefined,
          jobContext: data.jobContext || undefined,
          parsedJd,
          languages: [lang],
        }),
      });
      const payload = (await res.json()) as { summaries?: Partial<Record<Language, string>>; error?: string };
      if (!res.ok) throw new Error(payload.error ?? `Error ${res.status}`);
      patch({ summary: payload.summaries?.[lang] ?? "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generando el resumen.");
    } finally {
      setSummaryLoading(false);
    }
  }

  async function generateValues() {
    if (parsedJd.companyValues.length === 0) return;
    setValuesLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/values-alignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          values: parsedJd.companyValues,
          focus: data.focus || undefined,
          jobContext: data.jobContext || undefined,
          language: lang,
        }),
      });
      const payload = (await res.json()) as {
        alignments?: { value: string; evidence: string }[];
        error?: string;
      };
      if (!res.ok) throw new Error(payload.error ?? `Error ${res.status}`);
      if (payload.alignments) patch({ values: payload.alignments });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generando la alineación.");
    } finally {
      setValuesLoading(false);
    }
  }

  function setExperienceVariant(variant: ExperienceVariant) {
    patch({ experienceVariant: variant });
  }

  async function generateExperience() {
    const variant = sel!.experienceVariant;
    if (variant === "default") return;
    setExpLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/ats-experience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant, parsedJd, language: lang }),
      });
      const payload = (await res.json()) as {
        chrono?: ExperienceEntry[];
        thematic?: ThematicGroup[];
        error?: string;
      };
      if (!res.ok) throw new Error(payload.error ?? `Error ${res.status}`);
      if (variant === "thematic") patch({ experienceThematic: payload.thematic ?? [] });
      else patch({ experienceChrono: payload.chrono ?? [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error reestructurando la experiencia.");
    } finally {
      setExpLoading(false);
    }
  }

  function setChronoBullets(index: number, text: string) {
    const chrono = (sel!.experienceChrono ?? []).map((e, i) =>
      i === index ? { ...e, bullets: text.split("\n").map((b) => b.trim()).filter(Boolean) } : e,
    );
    patch({ experienceChrono: chrono });
  }

  function setThematicHeader(index: number, header: string) {
    const groups = (sel!.experienceThematic ?? []).map((g, i) => (i === index ? { ...g, header } : g));
    patch({ experienceThematic: groups });
  }

  function setThematicBulletText(gi: number, bi: number, textValue: string) {
    const groups = (sel!.experienceThematic ?? []).map((g, i) =>
      i === gi
        ? { ...g, bullets: g.bullets.map((b, j) => (j === bi ? { ...b, text: textValue } : b)) }
        : g,
    );
    patch({ experienceThematic: groups });
  }

  const score = sel.summary ? scoreFromText(parsedJd, sel.summary) : null;
  const multiLang = languagesFor(data.language).length > 1;
  const expVariants: { value: ExperienceVariant; label: string }[] = [
    { value: "default", label: "Por defecto" },
    { value: "chronological", label: "Cronológica" },
    { value: "thematic", label: "Temática" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-500" />
        <p className="text-xs text-muted-foreground">
          Se arma un CV nuevo para esta búsqueda. Marcá y escribí solo lo que{" "}
          <span className="font-medium text-foreground">realmente tenés/hiciste</span>. Nada se
          inyecta sin tu confirmación.
          {multiLang && (
            <> Los borradores IA se generan en <span className="font-medium text-foreground">{lang}</span>.</>
          )}
        </p>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Title */}
      {parsedJd.jobTitle && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Título del puesto
          </p>
          <div className="flex items-start gap-2">
            <Checkbox
              id="ats-title"
              checked={sel.titleVerified}
              onCheckedChange={(v: boolean | "indeterminate") => patch({ titleVerified: v === true })}
              className="mt-0.5 shrink-0"
            />
            <Label htmlFor="ats-title" className="cursor-pointer text-sm font-normal leading-snug">
              {parsedJd.jobTitle}
            </Label>
          </div>
        </div>
      )}

      {/* Core Competencies */}
      {candidates.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Core Competencies{" "}
              <span className="font-normal normal-case">({sel.competencies.length} marcadas)</span>
            </p>
            <button
              type="button"
              onClick={() =>
                patch({
                  competencies:
                    sel.competencies.length === candidates.length
                      ? []
                      : candidates.map((c) => c.keyword),
                })
              }
              className="text-xs text-foreground hover:underline"
            >
              {sel.competencies.length === candidates.length ? "Deseleccionar todo" : "Seleccionar todo"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Keywords verbatim de la búsqueda. Vienen todas marcadas — destildá lo que no tengas.
          </p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {candidates.map((c) => (
              <div key={c.keyword} className="flex items-start gap-2">
                <Checkbox
                  id={`comp-${c.keyword}`}
                  checked={sel.competencies.includes(c.keyword)}
                  onCheckedChange={(v: boolean | "indeterminate") =>
                    toggleCompetency(c.keyword, v === true)
                  }
                  className="mt-0.5 shrink-0"
                />
                <Label
                  htmlFor={`comp-${c.keyword}`}
                  className="cursor-pointer text-sm font-normal leading-snug"
                >
                  {c.keyword}
                  {c.source === "preferred" && (
                    <Badge variant="outline" className="ml-1 text-[10px] font-normal">
                      pref
                    </Badge>
                  )}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Experience structure */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Estructura de experiencia
        </p>
        <div className="flex gap-1.5">
          {expVariants.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => setExperienceVariant(v.value)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs transition-colors",
                sel.experienceVariant === v.value
                  ? "border-ring bg-accent/40 font-medium"
                  : "border-border hover:bg-accent/20",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
        {sel.experienceVariant === "default" ? (
          <p className="text-xs text-muted-foreground">
            Usa tu experiencia tal cual (por empresa y fecha), sin reestructurar.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {sel.experienceVariant === "chronological"
                  ? "Mantiene tus trabajos; reescribe bullets con términos de la JD. Revisá cada línea."
                  : "Reagrupa tus bullets bajo headers de la JD. Revisá cada línea."}
              </p>
              <button
                type="button"
                onClick={generateExperience}
                disabled={expLoading}
                className="flex shrink-0 items-center gap-1 text-xs text-foreground hover:underline disabled:opacity-50"
              >
                {expLoading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                {(sel.experienceVariant === "chronological" ? sel.experienceChrono : sel.experienceThematic)
                  ?.length
                  ? "Regenerar"
                  : "Generar con IA"}
              </button>
            </div>

            {/* Chronological editor */}
            {sel.experienceVariant === "chronological" &&
              sel.experienceChrono?.map((e, i) => (
                <div key={`${e.company}-${i}`} className="space-y-1">
                  <p className="text-xs font-medium text-foreground">
                    {e.role} · {e.company} <span className="text-muted-foreground">· {e.dates}</span>
                  </p>
                  <Textarea
                    value={e.bullets.join("\n")}
                    onChange={(ev) => setChronoBullets(i, ev.target.value)}
                    rows={Math.max(2, e.bullets.length)}
                    className="resize-none text-xs"
                  />
                </div>
              ))}

            {/* Thematic editor */}
            {sel.experienceVariant === "thematic" &&
              sel.experienceThematic?.map((g, gi) => (
                <div key={`${g.header}-${gi}`} className="space-y-1.5 rounded-md border p-2">
                  <input
                    value={g.header}
                    onChange={(ev) => setThematicHeader(gi, ev.target.value)}
                    className="w-full bg-transparent text-xs font-medium text-foreground outline-none"
                  />
                  {g.bullets.map((b, bi) => (
                    <div key={bi} className="space-y-0.5">
                      <Textarea
                        value={b.text}
                        onChange={(ev) => setThematicBulletText(gi, bi, ev.target.value)}
                        rows={2}
                        className="resize-none text-xs"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        — {b.company} · {b.dates}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Values Alignment */}
      {parsedJd.companyValues.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Values Alignment
            </p>
            <button
              type="button"
              onClick={generateValues}
              disabled={valuesLoading}
              className="flex items-center gap-1 text-xs text-foreground hover:underline disabled:opacity-50"
            >
              {valuesLoading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
              Sugerir con IA
            </button>
          </div>
          <div className="space-y-3">
            {sel.values.map((v) => (
              <div key={v.value} className="space-y-1">
                <Label className="text-xs font-medium text-foreground">{v.value}</Label>
                <Textarea
                  value={v.evidence}
                  onChange={(e) => setValueEvidence(v.value, e.target.value)}
                  placeholder="Evidencia real (ej. un proyecto, resultado o forma de trabajar)"
                  rows={2}
                  className="resize-none text-xs"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Resumen profesional
          </p>
          <button
            type="button"
            onClick={generateSummary}
            disabled={summaryLoading}
            className="flex items-center gap-1 text-xs text-foreground hover:underline disabled:opacity-50"
          >
            {summaryLoading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
            {sel.summary ? "Regenerar" : "Generar con IA"}
          </button>
        </div>
        <Textarea
          value={sel.summary ?? ""}
          onChange={(e) => patch({ summary: e.target.value })}
          placeholder="Resumen tailoreado al puesto. Generalo con IA o escribilo. Vacío = usa tu resumen del master."
          rows={5}
          className="resize-none text-sm"
        />
        {score && score.covered.length + score.missing.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Keywords en el resumen: {score.covered.length}/{score.covered.length + score.missing.length} ({score.pct}%)
          </p>
        )}
      </div>
    </div>
  );
}
