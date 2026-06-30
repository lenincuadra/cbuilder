"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownView } from "./MarkdownView";

export interface NotesTabProps {
  notes?: string;
  onSave: (notes: string | undefined) => void | Promise<void>;
}

/** Notes tab: preview-first markdown. Click the content to edit; Guardar persists. */
export function NotesTab({ notes, onSave }: NotesTabProps) {
  const [draft, setDraft] = useState(notes ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Keep in sync with external changes while not actively editing.
  useEffect(() => {
    if (!editing) setDraft(notes ?? "");
  }, [notes, editing]);

  async function handleSave() {
    setSaving(true);
    try {
      const trimmed = draft.trim();
      await onSave(trimmed === "" ? undefined : trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(notes ?? "");
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-3">
        <Textarea
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={"## Estado\n- 2da entrevista **mañana**\n- pedir feedback"}
          className="min-h-[180px] font-mono text-sm"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={cancel} disabled={saving}>
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
        onClick={() => setEditing(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setEditing(true);
          }
        }}
        title="Click para editar"
        className="cursor-text rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/30"
      >
        <MarkdownView source={draft} />
      </div>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="size-4" />
          Editar
        </Button>
      </div>
    </div>
  );
}
