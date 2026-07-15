"use client";

import { useState } from "react";
import { ChevronDown, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DrawerBody } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AiContextPanel } from "@/ui/AiContextPanel";
import { DrawerFormFooter } from "@/ui/DrawerFormFooter";
import { useAiModel } from "@/ui/useAiModel";
import type { UseScreening } from "@/ui/useScreening";
import { requestAiAnswer, type AiAnswerContext } from "./screeningAi";

export interface ScreeningNewFormProps {
  /** Tracking code of the open application — the new question is created pre-linked. */
  code: string;
  /** Company/role/focus of this application — context for AI-suggested answers. */
  company?: string;
  role?: string;
  focus?: string;
  jobUrl?: string;
  jobContext?: string;
  /** Persists jobUrl/jobContext edits made from the shared AI context panel onto the row. */
  onUpdateJobFields: (fields: { jobUrl?: string; jobContext?: string }) => void | Promise<void>;
  /** Shared bank instance (same one the Preguntas card manages). */
  screening: UseScreening;
  /** Portal target for popouts (the drawer node). */
  container?: HTMLElement | null;
  /** Back to the Detalles view — after saving or on cancel. */
  onDone: () => void;
}

/**
 * "Nueva pregunta" takeover of the row detail drawer (same slot as RowEditForm):
 * fields in the scrollable body, Cancelar/Guardar pinned in the footer. The
 * question is created pre-linked to this application's code.
 *
 * "Sugerir y guardar" persists the AI draft the moment it's generated — a
 * generation call can't be undone, so nothing is left in unsaved local state
 * to lose on an accidental close.
 */
export function ScreeningNewForm({
  code,
  company,
  role,
  focus,
  jobUrl: rowJobUrl,
  jobContext: rowJobContext,
  onUpdateJobFields,
  screening,
  container,
  onDone,
}: ScreeningNewFormProps) {
  const { add } = screening;

  // Same shared context panel as the wizard's "Compartir contexto" — starts
  // from the row's current values, edits here save back onto the row the
  // moment they're used to generate (not on every keystroke).
  const [jobUrl, setJobUrl] = useState(rowJobUrl ?? "");
  const [jobContext, setJobContext] = useState(rowJobContext ?? "");
  const [model, setModel] = useAiModel("screening-answer");
  const aiContext: AiAnswerContext = { company, role, focus, jobContext, model };

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  async function suggestAndSave() {
    if (question.trim() === "") return;
    setSuggesting(true);
    try {
      const suggestion = await requestAiAnswer(question.trim(), aiContext);
      await Promise.all([
        add({ question: question.trim(), answer: suggestion, codes: [code], draft: true }),
        onUpdateJobFields({ jobUrl, jobContext }),
      ]);
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo sugerir una respuesta.");
    } finally {
      setSuggesting(false);
    }
  }

  async function submit() {
    if (question.trim() === "") return;
    setSaving(true);
    try {
      await add({ question: question.trim(), answer: answer.trim(), codes: [code] });
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
        <span className="text-xs font-medium text-muted-foreground">Nueva pregunta</span>

        <Collapsible>
          <CollapsibleTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-full justify-between px-2 text-xs text-muted-foreground"
              />
            }
          >
            <span>Contexto para IA · {model}</span>
            <ChevronDown className="size-3.5" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <AiContextPanel
              jobUrl={jobUrl}
              onJobUrlChange={setJobUrl}
              jobContext={jobContext}
              onJobContextChange={setJobContext}
              model={model}
              onModelChange={setModel}
              idPrefix="stn"
              container={container}
            />
          </CollapsibleContent>
        </Collapsible>

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
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={suggestAndSave}
                disabled={question.trim() === "" || suggesting || saving}
              >
                {suggesting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                Sugerir y guardar
              </Button>
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
      </DrawerBody>

      <DrawerFormFooter
        onCancel={onDone}
        onSubmit={submit}
        canSubmit={question.trim() !== ""}
        saving={saving || suggesting}
        submitLabel="Guardar"
        savingLabel="Guardando…"
      />
    </>
  );
}
