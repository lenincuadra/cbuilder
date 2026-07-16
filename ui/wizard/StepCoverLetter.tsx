"use client";

import { useState } from "react";
import { toast } from "sonner";

import { AI_TEMPLATE_NAME, COVER_LETTER_AI, type CoverLetterBodies } from "@/core/coverLetter/types";
import { requestAiDraft } from "@/core/coverLetter/ai";
import type { CoverLetterTemplate } from "@/core/coverLetter/types";
import { CoverLetterFields } from "@/ui/CoverLetterFields";
import { useAiModel } from "@/ui/useAiModel";
import { languagesFor, type WizardData } from "./types";

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
 *
 * Thin adapter over `CoverLetterFields` (pure UI): maps `WizardData`/`set()`
 * to primitive props and owns the wizard-specific draft-persistence side
 * effect. The post-hoc "generate a letter for an already-shipped
 * application" takeover (`ui/detail/CoverLetterGenerateForm.tsx`) is the
 * other adapter over the same shared fields.
 */
export function StepCoverLetter({ data, set, container, templates, onSaveDraft }: StepCoverLetterProps) {
  const isAiMode = data.coverLetterTemplateId === COVER_LETTER_AI;
  const [generating, setGenerating] = useState(false);
  const [model, setModel] = useAiModel("cover-letter");

  async function generateWithAi() {
    if (!isAiMode) return;
    setGenerating(true);
    try {
      const bodies = await requestAiDraft(data, languagesFor(data.language), model);
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

  return (
    <CoverLetterFields
      templates={templates}
      templateId={data.coverLetterTemplateId}
      onTemplateIdChange={(templateId, bodies) =>
        set({ coverLetterTemplateId: templateId, coverLetterBodies: bodies, coverLetterEdited: false })
      }
      bodies={data.coverLetterBodies}
      onBodiesChange={(bodies) => set({ coverLetterBodies: bodies, coverLetterEdited: true })}
      language={data.language}
      company={data.company}
      role={data.role}
      who={data.who}
      jobUrl={data.jobUrl}
      onJobUrlChange={(jobUrl) => set({ jobUrl })}
      jobContext={data.jobContext}
      onJobContextChange={(jobContext) => set({ jobContext })}
      model={model}
      onModelChange={setModel}
      generating={generating}
      onGenerateWithAi={generateWithAi}
      container={container}
      idPrefix="cl"
    />
  );
}
