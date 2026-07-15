"use client";

import { Link2, Plus, Sparkles, Unlink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ScreeningQuestion } from "@/core/screening/types";
import { CopyButton } from "@/ui/CopyButton";
import type { UseScreening } from "@/ui/useScreening";

export interface ScreeningSectionProps {
  /** Tracking code of the open application. */
  code: string;
  /** Shared bank instance (same one the Preguntas card manages). */
  screening: UseScreening;
  /** Opens the "Nueva pregunta" takeover view (ScreeningNewForm, owned by the drawer). */
  onStartNew: () => void;
  /** Opens the "Sugerir respuesta" takeover for a linked entry with no answer yet. */
  onSuggest: (entry: ScreeningQuestion) => void;
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
 * This section only reads and navigates — generation lives in the takeover
 * forms, following the two-step AI rule (docs/DESIGN.md → "Generación con
 * IA"): "Sugerir con IA" opens the suggest view, never fires a call directly.
 * Wording tweaks go through the Preguntas card's own edit flow.
 */
export function ScreeningSection({
  code,
  screening,
  onStartNew,
  onSuggest,
  container,
}: ScreeningSectionProps) {
  const { entries, update } = screening;
  const asked = entries.filter((entry) => entry.codes.includes(code));
  const linkable = entries.filter((entry) => !entry.codes.includes(code));

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
                    onClick={() => onSuggest(entry)}
                  >
                    <Sparkles className="size-3.5" />
                    Sugerir con IA
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
