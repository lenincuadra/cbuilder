"use client";

import { useState } from "react";
import { MessageCircleQuestion, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DrawerBody } from "@/components/ui/drawer";
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
import { PanelCard, PanelCardFace } from "@/ui/PanelCard";
import type { UseScreening } from "@/ui/useScreening";

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
    <div className="space-y-1.5 rounded-lg border px-3 py-2">
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
          {entry.answer !== "" && <CopyButton text={entry.answer} title="Copiar respuesta" />}
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            title="Editar pregunta"
            aria-label={`Editar ${entry.question}`}
            onClick={() => onEdit(entry)}
          >
            <Pencil className="size-3.5" />
          </Button>
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

/** Drawer body: bank list + create/edit form. */
function ScreeningManager({ store, rows }: { store: UseScreening; rows: RegistryRow[] }) {
  const { entries, add, update, remove } = store;
  // null = creating; an entry = editing it.
  const [editing, setEditing] = useState<ScreeningQuestion | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<ScreeningQuestion | null>(null);

  const canSave = question.trim() !== "";

  function startEdit(entry: ScreeningQuestion) {
    setEditing(entry);
    setQuestion(entry.question);
    setAnswer(entry.answer);
  }

  function resetForm() {
    setEditing(null);
    setQuestion("");
    setAnswer("");
  }

  async function submit() {
    if (!canSave) return;
    setSaving(true);
    try {
      if (editing) {
        // A human is confirming/editing this now — clears any "IA · sin revisar" flag.
        await update(editing.id, { question: question.trim(), answer: answer.trim(), draft: false });
        toast.success("Pregunta actualizada.");
      } else {
        await add({ question: question.trim(), answer: answer.trim(), codes: [] });
        toast.success("Pregunta guardada en el banco.");
      }
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la pregunta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
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
              onEdit={startEdit}
              onRemove={setToDelete}
            />
          ))}
        </div>
      )}

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
          if (editing?.id === toDelete.id) resetForm();
          setToDelete(null);
        }}
      />

      <div className="space-y-3 rounded-lg border p-3">
        <span className="text-xs font-medium text-muted-foreground">
          {editing ? "Editar pregunta" : "Nueva pregunta"}
        </span>

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

        <p className="text-xs text-muted-foreground">
          Las preguntas se vinculan a cada aplicación desde el tab Preguntas del detalle de
          la fila. La generación con IA también vive ahí (no acá): usa el contexto de esa
          aplicación — empresa, rol, foco y detalle del puesto — para que la respuesta salga
          dirigida y no genérica.
        </p>

        <div className="flex items-center justify-end gap-2">
          {editing && (
            <Button variant="ghost" size="sm" onClick={resetForm} disabled={saving}>
              Cancelar
            </Button>
          )}
          <Button size="sm" onClick={submit} disabled={!canSave || saving}>
            {editing ? "Guardar cambios" : "Agregar al banco"}
          </Button>
        </div>
      </div>
    </div>
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
      {() => (
        <DrawerBody>
          <ScreeningManager store={store} rows={rows} />
        </DrawerBody>
      )}
    </PanelCard>
  );
}
