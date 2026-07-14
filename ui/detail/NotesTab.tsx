"use client";

import { useState, type ReactNode } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DrawerBody, DrawerFooter } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MarkdownView } from "./MarkdownView";

export interface NotesTabProps {
  notes?: string;
  onSave: (notes: string | undefined) => void | Promise<void>;
  /** Textarea placeholder shown while editing. */
  placeholder?: string;
  /**
   * True when the editor is the whole drawer content (Notas generales): it then
   * renders the drawer slots itself — content in the scrollable DrawerBody,
   * actions pinned in the DrawerFooter. Default (inside a tab) keeps everything
   * inline.
   */
  inDrawer?: boolean;
}

const DEFAULT_PLACEHOLDER = "## Estado\n- 2da entrevista **mañana**\n- pedir feedback";

/** Notes tab: preview-first markdown. Click the content to edit; Guardar persists. */
export function NotesTab({
  notes,
  onSave,
  placeholder = DEFAULT_PLACEHOLDER,
  inDrawer = false,
}: NotesTabProps) {
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

  let content: ReactNode;
  let actions: ReactNode;
  if (draft !== null) {
    content = (
      <Textarea
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        className={cn("min-h-[180px] font-mono text-sm", inDrawer && "flex-1")}
      />
    );
    actions = (
      <>
        <Button variant="ghost" size="sm" onClick={() => setDraft(null)} disabled={saving}>
          Cancelar
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </>
    );
  } else {
    content = (
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
        className={cn(
          "cursor-text rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/30",
          inDrawer && "flex-1",
        )}
      >
        <MarkdownView source={notes ?? ""} />
      </div>
    );
    actions = (
      <Button variant="outline" size="sm" onClick={startEditing}>
        <Pencil className="size-4" />
        Editar
      </Button>
    );
  }

  if (inDrawer) {
    return (
      <>
        <DrawerBody>{content}</DrawerBody>
        <DrawerFooter className="flex-row justify-end">{actions}</DrawerFooter>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {content}
      <div className="flex justify-end gap-2">{actions}</div>
    </div>
  );
}
