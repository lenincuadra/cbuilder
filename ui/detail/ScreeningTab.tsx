"use client";

import { useState } from "react";
import { Link2, Plus, Unlink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ScreeningQuestion } from "@/core/screening/types";
import { CopyButton } from "@/ui/CopyButton";
import type { UseScreening } from "@/ui/useScreening";

export interface ScreeningTabProps {
  /** Tracking code of the open application. */
  code: string;
  /** Shared bank instance (same one the Preguntas card manages). */
  screening: UseScreening;
  /** Portal target for the dropdown (the drawer node). */
  container?: HTMLElement | null;
}

/**
 * Preguntas tab: the pre-screening questions this application asked. Entries
 * live in the global bank (Preguntas card); here they are linked/unlinked to
 * this application's code, created pre-linked, and copied for reuse.
 */
export function ScreeningTab({ code, screening, container }: ScreeningTabProps) {
  const { entries, add, update } = screening;
  const asked = entries.filter((entry) => entry.codes.includes(code));
  const linkable = entries.filter((entry) => !entry.codes.includes(code));

  const [adding, setAdding] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);

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
      {asked.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ninguna pregunta registrada para esta aplicación.
        </p>
      ) : (
        <div className="space-y-2">
          {asked.map((entry) => (
            <div key={entry.id} className="space-y-1 rounded-lg border px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 text-sm font-medium break-words">{entry.question}</span>
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
                <p className="text-xs text-muted-foreground italic">sin respuesta todavía</p>
              ) : (
                <p className="text-xs whitespace-pre-wrap text-muted-foreground">
                  {entry.answer}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

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
            <Label htmlFor="st-answer">Tu respuesta</Label>
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
