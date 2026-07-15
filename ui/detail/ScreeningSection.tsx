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
import type { ScreeningQuestion } from "@/core/screening/types";
import { AiContextPanel } from "@/ui/AiContextPanel";
import { CopyButton } from "@/ui/CopyButton";
import { useAiModel } from "@/ui/useAiModel";
import type { UseScreening } from "@/ui/useScreening";
import { requestAiAnswer, type AiAnswerContext } from "./screeningAi";

export interface ScreeningSectionProps {
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
  /** Opens the "Nueva pregunta" takeover view (ScreeningNewForm, owned by the drawer). */
  onStartNew: () => void;
  /** Portal target for the dropdown (the drawer node). */
  container?: HTMLElement | null;
}

/**
 * Preguntas section of the Detalles tab (same card chrome as Entrega/Links de
 * tracking): the pre-screening questions this application asked. Entries live
 * in the global bank (Preguntas card); here they are linked/unlinked to this
 * application's code, created pre-linked ("Nueva" opens the drawer-level
 * ScreeningNewForm takeover), and copied for reuse.
 *
 * AI suggestions exist only for entries with no answer yet ("Sugerir y
 * guardar" persists the draft the moment it's generated). There is no
 * one-click regenerate over an existing answer: a misclick would overwrite
 * reviewed text AND spend an API call. Wording tweaks go through the
 * Preguntas card's own edit flow, same as any other entry.
 */
export function ScreeningSection({
  code,
  company,
  role,
  focus,
  jobUrl: rowJobUrl,
  jobContext: rowJobContext,
  onUpdateJobFields,
  screening,
  onStartNew,
  container,
}: ScreeningSectionProps) {
  const { entries, update } = screening;
  const asked = entries.filter((entry) => entry.codes.includes(code));
  const linkable = entries.filter((entry) => !entry.codes.includes(code));

  // Same shared context panel as the wizard's "Compartir contexto" — starts
  // from the row's current values, edits here save back onto the row the
  // moment they're used to generate (not on every keystroke).
  const [jobUrl, setJobUrl] = useState(rowJobUrl ?? "");
  const [jobContext, setJobContext] = useState(rowJobContext ?? "");
  const [model, setModel] = useAiModel("screening-answer");
  const aiContext: AiAnswerContext = { company, role, focus, jobContext, model };

  const [suggestingId, setSuggestingId] = useState<string | null>(null);

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
    <div className="space-y-3 rounded-lg border px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">Preguntas</span>
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
                    <CopyButton text={entry.answer} title="Copiar respuesta" />
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

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onStartNew}>
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
    </div>
  );
}
