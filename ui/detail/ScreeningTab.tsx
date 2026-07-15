"use client";

import { useState } from "react";
import { ChevronDown, Link2, Loader2, Plus, Sparkles, Unlink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AiModel } from "@/core/ai/models";
import type { ScreeningQuestion } from "@/core/screening/types";
import { AiContextPanel } from "@/ui/AiContextPanel";
import { ConfirmDelete } from "@/ui/ConfirmDelete";
import { CopyButton } from "@/ui/CopyButton";
import { useAiModel } from "@/ui/useAiModel";
import type { UseScreening } from "@/ui/useScreening";

interface AiAnswerContext {
  company?: string;
  role?: string;
  focus?: string;
  jobContext?: string;
  model: AiModel;
}

/** Ask the AI pipeline for a draft answer, grounded in the profile context pack. */
async function requestAiAnswer(question: string, context: AiAnswerContext): Promise<string> {
  const response = await fetch("/api/ai/screening-answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, ...context }),
  });
  const payload = (await response.json()) as { answer?: string; error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `AI generation failed (HTTP ${response.status}).`);
  }
  return payload.answer ?? "";
}

export interface ScreeningTabProps {
  /** Tracking code of the open application. */
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
  /** Portal target for the dropdown (the drawer node). */
  container?: HTMLElement | null;
}

/**
 * Preguntas tab: the pre-screening questions this application asked. Entries
 * live in the global bank (Preguntas card); here they are linked/unlinked to
 * this application's code, created pre-linked, and copied for reuse.
 *
 * "Sugerir y guardar" persists the AI draft the moment it's generated — a
 * generation call can't be undone, so nothing is left in unsaved local state
 * to lose on an accidental close. Wording tweaks after the fact go through
 * the Preguntas card's own edit flow (pencil icon), same as any other entry.
 */
export function ScreeningTab({
  code,
  company,
  role,
  focus,
  jobUrl: rowJobUrl,
  jobContext: rowJobContext,
  onUpdateJobFields,
  screening,
  container,
}: ScreeningTabProps) {
  const { entries, add, update } = screening;
  const asked = entries.filter((entry) => entry.codes.includes(code));
  const linkable = entries.filter((entry) => !entry.codes.includes(code));

  // Same shared context panel as the wizard's "Compartir contexto" — starts
  // from the row's current values, edits here save back onto the row the
  // moment they're used to generate (not on every keystroke).
  const [jobUrl, setJobUrl] = useState(rowJobUrl ?? "");
  const [jobContext, setJobContext] = useState(rowJobContext ?? "");
  const [model, setModel] = useAiModel("screening-answer");
  const aiContext: AiAnswerContext = { company, role, focus, jobContext, model };

  const [adding, setAdding] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [suggestingNew, setSuggestingNew] = useState(false);
  const [suggestingId, setSuggestingId] = useState<string | null>(null);
  // Regenerating over an EXISTING answer overwrites hand-written (or reviewed)
  // text AND spends an API call — both irreversible, so it confirms first.
  const [toRegenerate, setToRegenerate] = useState<ScreeningQuestion | null>(null);

  async function suggestForNew() {
    if (question.trim() === "") return;
    setSuggestingNew(true);
    try {
      const suggestion = await requestAiAnswer(question.trim(), aiContext);
      await Promise.all([
        add({ question: question.trim(), answer: suggestion, codes: [code], draft: true }),
        onUpdateJobFields({ jobUrl, jobContext }),
      ]);
      setQuestion("");
      setAnswer("");
      setAdding(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo sugerir una respuesta.");
    } finally {
      setSuggestingNew(false);
    }
  }

  async function suggestForEntry(entry: ScreeningQuestion) {
    setSuggestingId(entry.id);
    try {
      const suggestion = await requestAiAnswer(entry.question, aiContext);
      await Promise.all([
        update(entry.id, { answer: suggestion, draft: true }),
        onUpdateJobFields({ jobUrl, jobContext }),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo sugerir una respuesta.");
    } finally {
      setSuggestingId(null);
    }
  }

  async function submitNew() {
    if (question.trim() === "") return;
    setSaving(true);
    try {
      await add({ question: question.trim(), answer: answer.trim(), codes: [code] });
      setQuestion("");
      setAnswer("");
      setAdding(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la pregunta.");
    } finally {
      setSaving(false);
    }
  }

  async function link(entry: ScreeningQuestion) {
    try {
      await update(entry.id, { codes: [...entry.codes, code] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo vincular la pregunta.");
    }
  }

  async function unlink(entry: ScreeningQuestion) {
    try {
      await update(entry.id, { codes: entry.codes.filter((existing) => existing !== code) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo desvincular la pregunta.");
    }
  }

  return (
    <div className="space-y-3">
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
            idPrefix="st"
            container={container}
          />
        </CollapsibleContent>
      </Collapsible>

      {asked.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ninguna pregunta registrada para esta aplicación.
        </p>
      ) : (
        <div className="space-y-2">
          {asked.map((entry) => (
            <div key={entry.id} className="space-y-1 rounded-lg border px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 text-sm font-medium break-words">
                  {entry.question}
                  {entry.draft && (
                    <span className="ml-1.5 text-[10px] font-normal text-muted-foreground italic">
                      IA · sin revisar
                    </span>
                  )}
                </span>
                <div className="flex shrink-0 items-center">
                  {entry.answer !== "" && (
                    <>
                      <CopyButton text={entry.answer} title="Copiar respuesta" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 text-muted-foreground"
                        title="Regenerar respuesta con IA (pisa la actual)"
                        aria-label={`Regenerar respuesta de ${entry.question}`}
                        disabled={suggestingId === entry.id}
                        onClick={() => setToRegenerate(entry)}
                      >
                        {suggestingId === entry.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="size-3.5" />
                        )}
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground hover:text-destructive"
                    title="Quitar de esta aplicación (queda en el banco)"
                    aria-label={`Quitar ${entry.question} de esta aplicación`}
                    onClick={() => unlink(entry)}
                  >
                    <Unlink className="size-3.5" />
                  </Button>
                </div>
              </div>
              {entry.answer === "" ? (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground italic">sin respuesta todavía</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => suggestForEntry(entry)}
                    disabled={suggestingId === entry.id}
                  >
                    {suggestingId === entry.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="size-3.5" />
                    )}
                    Sugerir y guardar
                  </Button>
                </div>
              ) : (
                <p className="text-xs whitespace-pre-wrap text-muted-foreground">
                  {entry.answer}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDelete
        open={toRegenerate !== null}
        onOpenChange={(open) => !open && setToRegenerate(null)}
        title="Regenerar respuesta con IA"
        description={
          toRegenerate ? (
            <>
              Se va a <strong>pisar la respuesta actual</strong> de{" "}
              <strong>{toRegenerate.question}</strong> con una nueva generada por IA
              (una llamada a la API). El texto actual no se puede recuperar.
            </>
          ) : null
        }
        confirmLabel="Regenerar"
        onConfirm={() => {
          if (!toRegenerate) return;
          const entry = toRegenerate;
          setToRegenerate(null);
          // Fire-and-track: suggestForEntry drives the row's spinner + toast.
          void suggestForEntry(entry);
        }}
      />

      {adding ? (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="st-question">Pregunta</Label>
            <Textarea
              id="st-question"
              placeholder="Project you are most proud of (optional)"
              value={question}
              rows={2}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="st-answer">Tu respuesta</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={suggestForNew}
                disabled={question.trim() === "" || suggestingNew}
              >
                {suggestingNew ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                Sugerir y guardar
              </Button>
            </div>
            <Textarea
              id="st-answer"
              placeholder="Podés dejarla vacía y completarla después."
              value={answer}
              rows={5}
              className="text-xs"
              onChange={(event) => setAnswer(event.target.value)}
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button size="sm" onClick={submitNew} disabled={question.trim() === "" || saving}>
              Guardar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" />
            Nueva
          </Button>
          {linkable.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                <Link2 className="size-4" />
                Vincular del banco
              </DropdownMenuTrigger>
              <DropdownMenuContent container={container} className="max-w-72">
                {linkable.map((entry) => (
                  <DropdownMenuItem key={entry.id} onClick={() => link(entry)}>
                    <span className="truncate">{entry.question}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </div>
  );
}
