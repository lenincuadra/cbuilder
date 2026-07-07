"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownView } from "./MarkdownView";

export interface NotesTabProps {
  notes?: string;
  onSave: (notes: string | undefined) => void | Promise<void>;
  /** Textarea placeholder shown while editing. */
  placeholder?: string;
}

const DEFAULT_PLACEHOLDER = "## Estado\n- 2da entrevista **mañana**\n- pedir feedback";

/** Notes tab: preview-first markdown. Click the content to edit; Guardar persists. */
export function NotesTab({ notes, onSave, placeholder = DEFAULT_PLACEHOLDER }: NotesTabProps) {
  // `draft` is the edit buffer; null means "not editing". Seeded from `notes`
  // when editing starts, so the preview always renders the latest saved notes
  // without an effect syncing derived state.
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const startEditing = () => setDraft(notes ?? "");

  async function handleSave() {
    if (draft === null) return;
    setSaving(true);
    try {
      const trimmed = draft.trim();
      await onSave(trimmed === "" ? undefined : trimmed);
      setDraft(null);
    } finally {
      setSaving(false);
    }
  }

  if (draft !== null) {
    return (
      <div className="flex flex-col gap-3">
        <Textarea
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          className="min-h-[180px] font-mono text-sm"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDraft(null)} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        onClick={startEditing}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            startEditing();
          }
        }}
        title="Click para editar"
        className="cursor-text rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/30"
      >
        <MarkdownView source={notes ?? ""} />
      </div>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={startEditing}>
          <Pencil className="size-4" />
          Editar
        </Button>
      </div>
    </div>
  );
}
