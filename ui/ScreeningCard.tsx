"use client";

import { useState } from "react";
import { MessageCircleQuestion, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DrawerBody, DrawerFooter } from "@/components/ui/drawer";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RegistryRow } from "@/core/registry/types";
import type { ScreeningQuestion } from "@/core/screening/types";
import { ConfirmDelete, toastDeleted } from "@/ui/ConfirmDelete";
import { CopyButton } from "@/ui/CopyButton";
import { DrawerFormFooter } from "@/ui/DrawerFormFooter";
import { PanelCard, PanelCardFace } from "@/ui/PanelCard";
import type { UseScreening } from "@/ui/useScreening";

/** List ↔ form takeover views of the manager (docs/DESIGN.md → manager drawers). */
type ManagerView = { mode: "list" } | { mode: "form"; item: ScreeningQuestion | null };

/** Chip label for a referenced application: its company name, or the raw code. */
function codeLabel(code: string, rows: RegistryRow[]): string {
  return rows.find((row) => row.code === code)?.company ?? code;
}

function EntryRow({
  entry,
  rows,
  onEdit,
  onRemove,
}: {
  entry: ScreeningQuestion;
  rows: RegistryRow[];
  onEdit: (entry: ScreeningQuestion) => void;
  onRemove: (entry: ScreeningQuestion) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Editar ${entry.question}`}
      onClick={() => onEdit(entry)}
      onKeyDown={(event) => {
        // Only when the row itself is focused — inner buttons handle their own keys.
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onEdit(entry);
        }
      }}
      className="cursor-pointer space-y-1.5 rounded-lg border px-3 py-2 transition-colors hover:bg-accent/40"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-sm font-medium break-words">
          {entry.question}
          {entry.draft && (
            <span className="ml-1.5 text-[10px] font-normal text-muted-foreground italic">
              IA · sin revisar
            </span>
          )}
        </span>
        <div className="flex shrink-0 items-center" onClick={(event) => event.stopPropagation()}>
          {entry.answer !== "" && <CopyButton text={entry.answer} title="Copiar respuesta" />}
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-destructive"
            title="Borrar pregunta"
            aria-label={`Borrar ${entry.question}`}
            onClick={() => onRemove(entry)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
      {entry.answer === "" ? (
        <p className="text-xs text-muted-foreground italic">sin respuesta todavía</p>
      ) : (
        <p className="text-xs whitespace-pre-wrap text-muted-foreground">{entry.answer}</p>
      )}
      {entry.codes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.codes.map((code) => (
            <Badge
              key={code}
              variant="secondary"
              className="max-w-40 truncate text-[10px]"
              title={code}
            >
              {codeLabel(code, rows)}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

/** Form takeover: create (entry = null) or edit one bank entry, then go back. */
function EntryForm({
  entry,
  store,
  onDone,
}: {
  entry: ScreeningQuestion | null;
  store: UseScreening;
  onDone: () => void;
}) {
  const { add, update } = store;
  const [question, setQuestion] = useState(entry?.question ?? "");
  const [answer, setAnswer] = useState(entry?.answer ?? "");
  const [saving, setSaving] = useState(false);

  const canSave = question.trim() !== "";

  async function submit() {
    if (!canSave) return;
    setSaving(true);
    try {
      if (entry) {
        // A human is confirming/editing this now — clears any "IA · sin revisar" flag.
        await update(entry.id, { question: question.trim(), answer: answer.trim(), draft: false });
        toast.success("Pregunta actualizada.");
      } else {
        await add({ question: question.trim(), answer: answer.trim(), codes: [] });
        toast.success("Pregunta guardada en el banco.");
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
            <Label htmlFor="sq-question">Pregunta</Label>
            <Textarea
              id="sq-question"
              placeholder="Project you are most proud of (optional)"
              value={question}
              rows={2}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sq-answer">Tu respuesta</Label>
            <Textarea
              id="sq-answer"
              placeholder="Podés dejarla vacía y completarla después."
              value={answer}
              rows={6}
              className="text-xs"
              onChange={(event) => setAnswer(event.target.value)}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Las preguntas se vinculan a cada aplicación desde la sección Preguntas del detalle
          de la fila. La generación con IA también vive ahí (no acá): usa el contexto de esa
          aplicación — empresa, rol, foco y detalle del puesto — para que la respuesta salga
          dirigida y no genérica.
        </p>
      </DrawerBody>

      <DrawerFormFooter
        onCancel={onDone}
        onSubmit={submit}
        canSubmit={canSave}
        saving={saving}
        submitLabel={entry ? "Guardar cambios" : "Agregar al banco"}
        savingLabel="Guardando…"
      />
    </>
  );
}

/** Manager: the bank list with the create action pinned in the footer; the form takes over. */
function ScreeningManager({ store, rows }: { store: UseScreening; rows: RegistryRow[] }) {
  const { entries, remove } = store;
  const [view, setView] = useState<ManagerView>({ mode: "list" });
  const [toDelete, setToDelete] = useState<ScreeningQuestion | null>(null);

  if (view.mode === "form") {
    return <EntryForm entry={view.item} store={store} onDone={() => setView({ mode: "list" })} />;
  }

  return (
    <>
      <DrawerBody>
        {entries.length === 0 ? (
          <Empty className="py-4">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MessageCircleQuestion />
              </EmptyMedia>
              <EmptyTitle>Sin preguntas</EmptyTitle>
              <EmptyDescription>
                Guardá las preguntas de pre-screening que te hacen las aplicaciones y tus
                respuestas — la próxima vez las tenés a un copiar de distancia.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                rows={rows}
                onEdit={(item) => setView({ mode: "form", item })}
                onRemove={setToDelete}
              />
            ))}
          </div>
        )}
      </DrawerBody>

      <DrawerFooter className="flex-row justify-end">
        <Button size="sm" onClick={() => setView({ mode: "form", item: null })}>
          <Plus className="size-4" />
          Nueva pregunta
        </Button>
      </DrawerFooter>

      <ConfirmDelete
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Borrar pregunta"
        description={
          toDelete ? (
            <>
              Se va a borrar la pregunta <strong>{toDelete.question}</strong> y su respuesta
              del banco. Esta acción no se puede deshacer.
            </>
          ) : null
        }
        onConfirm={async () => {
          if (!toDelete) return;
          await remove(toDelete.id);
          toastDeleted("Pregunta borrada.");
          setToDelete(null);
        }}
      />
    </>
  );
}

export interface ScreeningCardProps {
  /** Shared bank instance (the page owns it; the drawer tab reads the same one). */
  store: UseScreening;
  /** Registry rows, to label each referenced code with its company. */
  rows: RegistryRow[];
}

/** Right-column card: the pre-screening questions bank (manager in a drawer). */
export function ScreeningCard({ store, rows }: ScreeningCardProps) {
  return (
    <PanelCard
      title="Preguntas"
      description="Banco de preguntas de pre-screening y tus respuestas."
      card={(open) => (
        <PanelCardFace
          icon={MessageCircleQuestion}
          title="Preguntas"
          description="Respuestas de pre-screening, reutilizables."
          onOpen={open}
        />
      )}
    >
      {() => <ScreeningManager store={store} rows={rows} />}
    </PanelCard>
  );
}
