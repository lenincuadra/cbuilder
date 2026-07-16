"use client";

import { useState } from "react";
import { NotebookPen, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DrawerBody, DrawerFooter } from "@/components/ui/drawer";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GeneralNote } from "@/core/notes/types";
import { ConfirmDelete, toastDeleted } from "@/ui/ConfirmDelete";
import { DrawerFormFooter } from "@/ui/DrawerFormFooter";
import { PanelCard, PanelCardFace } from "@/ui/PanelCard";
import { useGeneralNotes, type UseGeneralNotes } from "@/ui/useGeneralNotes";

const PLACEHOLDER =
  "Notas que aplican a todo el proceso…\n\n## Pendientes\n- actualizar portfolio\n- preparar pitch";

/** List ↔ form takeover views of the manager (docs/DESIGN.md → manager drawers). */
type ManagerView = { mode: "list" } | { mode: "form"; item: GeneralNote | null };

function NoteRow({
  note,
  onEdit,
  onRemove,
}: {
  note: GeneralNote;
  onEdit: (note: GeneralNote) => void;
  onRemove: (note: GeneralNote) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Editar ${note.title}`}
      onClick={() => onEdit(note)}
      onKeyDown={(event) => {
        // Only when the row itself is focused — inner buttons handle their own keys.
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onEdit(note);
        }
      }}
      className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors hover:bg-accent/40"
    >
      <span className="truncate text-sm font-medium">{note.title}</span>
      <div className="flex shrink-0 items-center" onClick={(event) => event.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground hover:text-destructive"
          title="Borrar nota"
          aria-label={`Borrar ${note.title}`}
          onClick={() => onRemove(note)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

/** Form takeover: create (note = null) or edit one note, then go back. */
function NoteForm({
  note,
  store,
  onDone,
}: {
  note: GeneralNote | null;
  store: UseGeneralNotes;
  onDone: () => void;
}) {
  const { add, update } = store;
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [saving, setSaving] = useState(false);

  const canSave = title.trim() !== "";

  async function submit() {
    if (!canSave) return;
    setSaving(true);
    try {
      if (note) {
        await update(note.id, { title: title.trim(), body });
        toast.success(`Nota ${title.trim()} actualizada.`);
      } else {
        await add({ title: title.trim(), body });
        toast.success(`Nota ${title.trim()} creada.`);
      }
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la nota.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DrawerBody className="gap-3">
        <span className="text-xs font-medium text-muted-foreground">
          {note ? `Editar nota · ${note.title}` : "Nueva nota"}
        </span>

        <div className="flex flex-col gap-3 rounded-lg border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="gn-title">Título</Label>
            <Input
              id="gn-title"
              placeholder="Pendientes"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gn-body">Contenido</Label>
            <Textarea
              id="gn-body"
              placeholder={PLACEHOLDER}
              value={body}
              rows={10}
              className="font-mono text-xs"
              onChange={(event) => setBody(event.target.value)}
            />
          </div>
        </div>
      </DrawerBody>

      <DrawerFormFooter
        onCancel={onDone}
        onSubmit={submit}
        canSubmit={canSave}
        saving={saving}
        submitLabel={note ? "Guardar cambios" : "Crear nota"}
        savingLabel="Guardando…"
      />
    </>
  );
}

/** Manager: the notes list with the create action pinned in the footer; the form takes over. */
function GeneralNotesManager({ store }: { store: UseGeneralNotes }) {
  const { notes, remove } = store;
  const [view, setView] = useState<ManagerView>({ mode: "list" });
  const [toDelete, setToDelete] = useState<GeneralNote | null>(null);

  if (view.mode === "form") {
    return <NoteForm note={view.item} store={store} onDone={() => setView({ mode: "list" })} />;
  }

  return (
    <>
      <DrawerBody>
        {notes.length === 0 ? (
          <Empty className="py-4">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <NotebookPen />
              </EmptyMedia>
              <EmptyTitle>Sin notas</EmptyTitle>
              <EmptyDescription>
                Notas que aplican a todo el proceso, no atadas a una aplicación puntual.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <NoteRow
                key={note.id}
                note={note}
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
          Nueva nota
        </Button>
      </DrawerFooter>

      <ConfirmDelete
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Borrar nota"
        description={
          toDelete ? (
            <>
              Se va a borrar la nota <strong>{toDelete.title}</strong>. Esta acción no se puede
              deshacer.
            </>
          ) : null
        }
        onConfirm={async () => {
          if (!toDelete) return;
          await remove(toDelete.id);
          toastDeleted(`Nota ${toDelete.title} borrada.`);
          setToDelete(null);
        }}
      />
    </>
  );
}

/**
 * General, cross-application notes (not tied to any registry row). Compact card
 * that opens the manager (list ↔ form) in a drawer — the shared PanelCard
 * pattern, same as Preguntas/Cover letters/Links estables.
 */
export function GeneralNotesCard() {
  const store = useGeneralNotes();

  return (
    <PanelCard
      title="Notas generales"
      description="Notas que aplican a todo el proceso."
      card={(open) => (
        <PanelCardFace
          icon={NotebookPen}
          title="Notas generales"
          description="Notas del proceso, no atadas a una fila."
          onOpen={open}
        />
      )}
    >
      {() => <GeneralNotesManager store={store} />}
    </PanelCard>
  );
}
