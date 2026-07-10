"use client";

import { NotebookPen } from "lucide-react";

import { NotesTab } from "@/ui/detail/NotesTab";
import { PanelCard, PanelCardFace } from "@/ui/PanelCard";
import { useGeneralNotes } from "@/ui/useGeneralNotes";

const PLACEHOLDER =
  "Notas que aplican a todo el proceso…\n\n## Pendientes\n- actualizar portfolio\n- preparar pitch";

/**
 * General, cross-application notes (not tied to any registry row). Compact card
 * that opens the markdown editor (preview-first, same as the per-row notes) in a
 * drawer — the shared PanelCard pattern.
 */
export function GeneralNotesCard() {
  const { notes, save } = useGeneralNotes();

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
      {() => <NotesTab notes={notes} onSave={save} placeholder={PLACEHOLDER} />}
    </PanelCard>
  );
}
