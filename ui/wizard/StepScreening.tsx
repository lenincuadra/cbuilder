"use client";

import { useState } from "react";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RegistryRow } from "@/core/registry/types";
import { requestAiAnswer } from "@/core/screening/ai";
import { AiContextPanel } from "@/ui/AiContextPanel";
import { useAiModel } from "@/ui/useAiModel";
import type { UseScreening } from "@/ui/useScreening";
import type { StepProps } from "./StepCompany";
import type { WizardScreeningQuestion } from "./types";

export interface StepScreeningProps extends StepProps {
  /** Shared bank instance — absent disables the AI path (capture-only). */
  screening?: UseScreening;
  /**
   * Returns the row this session is bound to, creating the silent Borrador row
   * (reserved code) on first use — same mechanism as the AI cover letter
   * draft. Needed before an AI answer can persist (it links to the code).
   */
  onEnsureRow?: () => Promise<RegistryRow>;
}

/**
 * Step 5 — Preguntas (optional). Capture the pre-screening questions the
 * application asked, with answers if you have them; everything is created in
 * the bank pre-linked to this application's code when the wizard finishes
 * (Generar CV or Registrar sin CV).
 *
 * AI follows the two-step rule (docs/DESIGN.md → "Generación con IA"):
 * "Sugerir con IA" only reveals the shared context block; each entry's
 * "Generar y guardar" is the one paid call — and it persists immediately
 * (bank entry `draft: true` linked to the session's reserved code), so a paid
 * answer is never lost to a closed wizard.
 */
export function StepScreening({ data, set, container, screening, onEnsureRow }: StepScreeningProps) {
  const [model, setModel] = useAiModel("screening-answer");
  // Step 1 of the two-step AI rule: the context block stays hidden until asked for.
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);

  const aiAvailable = Boolean(screening && onEnsureRow);
  const questions = data.screeningQuestions;

  function patchQuestion(index: number, patch: Partial<WizardScreeningQuestion>) {
    set({
      screeningQuestions: questions.map((entry, i) =>
        i === index ? { ...entry, ...patch } : entry,
      ),
    });
  }

  async function generateFor(index: number) {
    if (!screening || !onEnsureRow) return;
    const entry = questions[index];
    const question = entry.question.trim();
    if (question === "") return;
    setGeneratingIndex(index);
    try {
      const row = await onEnsureRow();
      const answer = await requestAiAnswer(question, {
        company: data.company,
        role: data.role,
        focus: data.focus === "" ? undefined : data.focus,
        jobContext: data.jobContext,
        model,
      });
      // Persist immediately — a paid call never sits in unsaved local state.
      let savedId = entry.savedId;
      if (savedId) {
        await screening.update(savedId, { question, answer, draft: true });
      } else {
        savedId = await screening.add({ question, answer, codes: [row.code], draft: true });
      }
      patchQuestion(index, { answer, savedId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo sugerir una respuesta.");
    } finally {
      setGeneratingIndex(null);
    }
  }

  return (
    <div className="space-y-4">
      {questions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          ¿La aplicación te hizo preguntas de pre-screening? Capturalas acá y quedan en el
          banco, vinculadas a esta aplicación.
        </p>
      )}

      {questions.map((entry, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-lg border p-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor={`sq-w-question-${index}`}>Pregunta</Label>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 text-muted-foreground hover:text-destructive"
                title="Quitar pregunta"
                aria-label={`Quitar pregunta ${index + 1}`}
                disabled={generatingIndex !== null}
                onClick={() =>
                  set({ screeningQuestions: questions.filter((_, i) => i !== index) })
                }
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
            <Textarea
              id={`sq-w-question-${index}`}
              placeholder="Project you are most proud of (optional)"
              value={entry.question}
              rows={2}
              onChange={(event) => patchQuestion(index, { question: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor={`sq-w-answer-${index}`}>Tu respuesta</Label>
              {aiAvailable &&
                (suggestOpen ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => generateFor(index)}
                    disabled={entry.question.trim() === "" || generatingIndex !== null}
                  >
                    {generatingIndex === index ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="size-3.5" />
                    )}
                    Generar y guardar
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setSuggestOpen(true)}
                    disabled={generatingIndex !== null}
                  >
                    <Sparkles className="size-3.5" />
                    Sugerir con IA
                  </Button>
                ))}
            </div>
            <Textarea
              id={`sq-w-answer-${index}`}
              placeholder="Podés dejarla vacía y completarla después."
              value={entry.answer}
              rows={4}
              className="text-xs"
              onChange={(event) => patchQuestion(index, { answer: event.target.value })}
            />
          </div>
        </div>
      ))}

      {suggestOpen && aiAvailable && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Contexto (opcional)</span>
          <AiContextPanel
            jobUrl={data.jobUrl}
            onJobUrlChange={(value) => set({ jobUrl: value })}
            jobContext={data.jobContext}
            onJobContextChange={(value) => set({ jobContext: value })}
            model={model}
            onModelChange={setModel}
            idPrefix="sqw"
            container={container}
          />
          <p className="text-xs text-muted-foreground">
            &quot;Generar y guardar&quot; dispara una llamada por pregunta y la guarda al
            instante en el banco (&quot;IA · sin revisar&quot;), vinculada a esta aplicación.
          </p>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={generatingIndex !== null}
        onClick={() =>
          set({ screeningQuestions: [...questions, { question: "", answer: "" }] })
        }
      >
        <Plus className="size-4" />
        Agregar pregunta
      </Button>

      <p className="text-xs text-muted-foreground">
        Todo opcional — también podés agregarlas después desde la sección Preguntas del
        detalle de la fila.
      </p>
    </div>
  );
}
