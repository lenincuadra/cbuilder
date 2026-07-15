"use client";

import { useState } from "react";
import { Loader2, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  resolveTemplateVars,
  type CoverLetterBodies,
  type CoverLetterTemplate,
} from "@/core/coverLetter/types";
import type { AiModel } from "@/core/ai/models";
import type { Language } from "@/core/types";
import { AiContextPanel } from "@/ui/AiContextPanel";
import { IconSelect, type IconSelectOption } from "@/ui/IconSelect";
import { useAiModel } from "@/ui/useAiModel";
import { COVER_LETTER_AI, COVER_LETTER_NONE, languagesFor, type WizardData } from "./types";

/** Friendly display name for a letter generated without a template. */
export const AI_TEMPLATE_NAME = "Generado con IA";

/**
 * Ask the AI pipeline for a draft body per active language, grounded in the
 * profile context pack + this application's focus + the shared context panel
 * (job link/context + chosen model).
 */
async function requestAiDraft(
  data: WizardData,
  languages: Language[],
  model: AiModel,
): Promise<CoverLetterBodies> {
  const response = await fetch("/api/ai/cover-letter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company: data.company,
      role: data.role,
      who: data.who,
      focus: data.focus,
      jobContext: data.jobContext,
      model,
      languages,
    }),
  });
  const payload = (await response.json()) as { bodies?: CoverLetterBodies; error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `AI generation failed (HTTP ${response.status}).`);
  }
  return payload.bodies ?? {};
}

/**
 * Resolve a template's bodies for the languages this generation will produce,
 * using the wizard fields as variables. Pure — also used by the wizard when
 * entering the step, to keep an unedited preview fresh after field changes.
 */
export function resolveBodiesFor(
  template: CoverLetterTemplate,
  data: Pick<WizardData, "language" | "company" | "role" | "who">,
): CoverLetterBodies {
  const bodies: CoverLetterBodies = {};
  for (const language of languagesFor(data.language)) {
    const body = template.bodies[language];
    if (body) {
      bodies[language] = resolveTemplateVars(body, {
        company: data.company,
        role: data.role,
        who: data.who,
      });
    }
  }
  return bodies;
}

const LANGUAGE_TITLES: Record<Language, string> = { EN: "Cuerpo (inglés)", ES: "Cuerpo (español)" };

export interface StepCoverLetterProps {
  data: WizardData;
  set: (patch: Partial<WizardData>) => void;
  container?: HTMLElement | null;
  templates: CoverLetterTemplate[];
  /**
   * Persists the draft the moment it's generated (see Wizard's persistDraft) —
   * a paid API call is never lost to a closed wizard. Absent = feature off
   * upstream (no ANTHROPIC_API_KEY): the AI mode's button hides itself.
   */
  onSaveDraft?: (draft: {
    templateId: string;
    templateName?: string;
    bodies: CoverLetterBodies;
  }) => Promise<void>;
}

/**
 * Step 4 — Cover letter (optional). Two independent paths, picked from the
 * same dropdown: a real template (mechanical — {company}/{role}/{who}
 * resolved, no AI) or "Compartir contexto" (no template, generated with AI
 * from the shared context panel). AI never touches a template's resolved
 * body — that's plain variable substitution, already solved without an LLM.
 */
export function StepCoverLetter({ data, set, container, templates, onSaveDraft }: StepCoverLetterProps) {
  const languages = languagesFor(data.language);
  const selected = templates.find((template) => template.id === data.coverLetterTemplateId);
  const isAiMode = data.coverLetterTemplateId === COVER_LETTER_AI;
  const [generating, setGenerating] = useState(false);
  const [model, setModel] = useAiModel("cover-letter");

  async function generateWithAi() {
    if (!isAiMode) return;
    setGenerating(true);
    try {
      const bodies = await requestAiDraft(data, languages, model);
      const merged = { ...data.coverLetterBodies, ...bodies };
      set({ coverLetterBodies: merged, coverLetterEdited: true });
      if (onSaveDraft) {
        try {
          await onSaveDraft({ templateId: COVER_LETTER_AI, templateName: AI_TEMPLATE_NAME, bodies: merged });
        } catch (saveError) {
          toast.error(
            "El borrador se generó pero no se pudo guardar: " +
              (saveError instanceof Error ? saveError.message : "error desconocido") +
              ". Si cerrás el wizard ahora, se pierde.",
          );
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar el borrador.");
    } finally {
      setGenerating(false);
    }
  }

  const options: IconSelectOption<string>[] = [
    { value: COVER_LETTER_NONE, label: "Sin cover letter" },
    { value: COVER_LETTER_AI, label: "Compartir contexto", icon: <Sparkles className="size-4 text-muted-foreground" /> },
    ...templates.map((template) => ({
      value: template.id,
      label: template.name,
      icon: <Mail className="size-4 text-muted-foreground" />,
    })),
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cover-letter">Cover letter</Label>
        <IconSelect
          id="cover-letter"
          aria-label="Cover letter"
          value={data.coverLetterTemplateId === "" ? COVER_LETTER_NONE : data.coverLetterTemplateId}
          onChange={(value) => {
            if (value === COVER_LETTER_NONE) {
              set({ coverLetterTemplateId: "", coverLetterBodies: {}, coverLetterEdited: false });
              return;
            }
            if (value === COVER_LETTER_AI) {
              set({ coverLetterTemplateId: COVER_LETTER_AI, coverLetterBodies: {}, coverLetterEdited: false });
              return;
            }
            const template = templates.find((candidate) => candidate.id === value);
            if (!template) return;
            set({
              coverLetterTemplateId: template.id,
              coverLetterBodies: resolveBodiesFor(template, data),
              coverLetterEdited: false,
            });
          }}
          options={options}
          container={container}
        />
        {templates.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No hay templates todavía. Crealos desde la card <strong>Cover letters</strong>, o elegí
            <strong> Compartir contexto</strong> para generar sin uno.
          </p>
        )}
      </div>

      {isAiMode && (
        <>
          <AiContextPanel
            jobUrl={data.jobUrl}
            onJobUrlChange={(value) => set({ jobUrl: value })}
            jobContext={data.jobContext}
            onJobContextChange={(value) => set({ jobContext: value })}
            model={model}
            onModelChange={setModel}
            idPrefix="cl"
            container={container}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={generateWithAi}
            disabled={generating || data.company.trim() === "" || data.role.trim() === ""}
          >
            {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Generar con IA
          </Button>
        </>
      )}

      {(selected || isAiMode) &&
        languages.map((language) => {
          const body = data.coverLetterBodies[language];
          if (body === undefined) {
            if (isAiMode) return null; // nothing yet — "Generar con IA" above is the next step
            return (
              <p key={language} className="text-xs text-amber-500">
                El template no tiene cuerpo en {language === "EN" ? "inglés" : "español"} — esa
                carpeta va sin carta.
              </p>
            );
          }
          return (
            <div key={language} className="space-y-2">
              <Label htmlFor={`cl-body-${language}`}>{LANGUAGE_TITLES[language]}</Label>
              <Textarea
                id={`cl-body-${language}`}
                value={body}
                rows={languages.length > 1 ? 7 : 12}
                className="font-mono text-xs"
                onChange={(event) =>
                  set({
                    coverLetterBodies: { ...data.coverLetterBodies, [language]: event.target.value },
                    coverLetterEdited: true,
                  })
                }
              />
            </div>
          );
        })}

      {selected && (
        <p className="text-xs text-muted-foreground">
          Variables ya resueltas con los datos de esta aplicación. Lo que ves acá es exactamente
          lo que va en el .docx — editalo libremente para esta aplicación.
        </p>
      )}

      {isAiMode && Object.keys(data.coverLetterBodies).length > 0 && (
        <p className="text-xs text-muted-foreground">
          Generado por IA a partir del contexto que compartiste — editalo libremente para esta
          aplicación.
        </p>
      )}
    </div>
  );
}
