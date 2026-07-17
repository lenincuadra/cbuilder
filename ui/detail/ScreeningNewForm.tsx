"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DrawerBody } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AiContextPanel } from "@/ui/AiContextPanel";
import { DrawerFormFooter } from "@/ui/DrawerFormFooter";
import type { UseScreening } from "@/ui/useScreening";
import { requestAiAnswer } from "@/core/screening/ai";
import type { ScreeningQuestion } from "@/core/screening/types";
import { useScreeningAiContext, type ScreeningAiRow } from "./screeningAi";

export interface ScreeningNewFormProps extends ScreeningAiRow {
  /** Tracking code of the open application — the new question is created pre-linked. */
  code: string;
  /**
   * Existing bank entry to edit (click-to-edit on the section's cards).
   * Absent = create. Editing is manual-only: no AI over an existing answer
   * (see decisions.md → "IA: default barato + sin regenerar").
   */
  entry?: ScreeningQuestion;
  /** Persists jobUrl/jobContext edits made from the context panel onto the row. */
  onUpdateJobFields: (fields: { jobUrl?: string; jobContext?: string }) => void | Promise<void>;
  /** Shared bank instance (same one the Preguntas card manages). */
  screening: UseScreening;
  /** Portal target for popouts (the drawer node). */
  container?: HTMLElement | null;
  /** Back to the Detalles view — after saving or on cancel. */
  onDone: () => void;
}

/**
 * "Nueva pregunta" / "Editar pregunta" takeover of the row detail drawer
 * (same slot as RowEditForm): fields in the scrollable body, Cancelar/Guardar
 * pinned in the footer. A new question is created pre-linked to this
 * application's code; editing updates the bank entry and clears its AI draft
 * flag (a human just reviewed it).
 *
 * AI (create only) follows the two-step rule (docs/DESIGN.md → "Generación
 * con IA"): "Sugerir con IA" only reveals the optional context block; the
 * paid call fires on "Generar y guardar", which persists the draft the
 * moment it's generated (a generation call can't be undone).
 */
export function ScreeningNewForm({
  code,
  entry,
  company,
  role,
  focus,
  jobUrl,
  jobContext,
  onUpdateJobFields,
  screening,
  container,
  onDone,
}: ScreeningNewFormProps) {
  const { add, update } = screening;
  const ctx = useScreeningAiContext({ company, role, focus, jobUrl, jobContext });

  const [question, setQuestion] = useState(entry?.question ?? "");
  const [answer, setAnswer] = useState(entry?.answer ?? "");
  const [saving, setSaving] = useState(false);
  // Step 1 of the two-step AI rule: the context block stays hidden until asked for.
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function generateAndSave() {
    if (question.trim() === "") return;
    setGenerating(true);
    try {
      const suggestion = await requestAiAnswer(question.trim(), ctx.aiContext);
      await Promise.all([
        add({ question: question.trim(), answer: suggestion, codes: [code], draft: true }),
        onUpdateJobFields({ jobUrl: ctx.jobUrl, jobContext: ctx.jobContext }),
      ]);
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo sugerir una respuesta.");
    } finally {
      setGenerating(false);
    }
  }

  async function submit() {
    if (question.trim() === "") return;
    setSaving(true);
    try {
      if (entry) {
        // A human is confirming/editing this now — clears any "IA · sin revisar" flag.
        await update(entry.id, { question: question.trim(), answer: answer.trim(), draft: false });
      } else {
        await add({ question: question.trim(), answer: answer.trim(), codes: [code] });
      }
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la pregunta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DrawerBody className="gap-3">
        <span className="text-xs font-medium text-muted-foreground">
          {entry ? "Editar pregunta" : "Nueva pregunta"}
        </span>

        <div className="flex flex-col gap-3 rounded-lg border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="stn-question">Pregunta</Label>
            <Textarea
              id="stn-question"
              placeholder="Project you are most proud of (optional)"
              value={question}
              rows={2}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="stn-answer">Tu respuesta</Label>
              {!entry && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setSuggestOpen((open) => !open)}
                  disabled={generating || saving}
                >
                  <Sparkles className="size-3.5" />
                  Sugerir con IA
                </Button>
              )}
            </div>
            <Textarea
              id="stn-answer"
              placeholder="Podés dejarla vacía y completarla después."
              value={answer}
              rows={5}
              className="text-xs"
              onChange={(event) => setAnswer(event.target.value)}
            />
          </div>
        </div>

        {suggestOpen && !entry && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Contexto (opcional)
            </span>
            <AiContextPanel
              jobUrl={ctx.jobUrl}
              onJobUrlChange={ctx.setJobUrl}
              jobContext={ctx.jobContext}
              onJobContextChange={ctx.setJobContext}
              model={ctx.model}
              onModelChange={ctx.setModel}
              idPrefix="stn"
              container={container}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={generateAndSave}
                disabled={question.trim() === "" || generating || saving}
              >
                {generating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {generating ? "Generando…" : "Generar y guardar"}
              </Button>
            </div>
          </div>
        )}
      </DrawerBody>

      <DrawerFormFooter
        onCancel={onDone}
        onSubmit={submit}
        canSubmit={question.trim() !== ""}
        saving={saving || generating}
        submitLabel="Guardar"
        savingLabel="Guardando…"
      />
    </>
  );
}
