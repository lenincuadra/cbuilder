"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import type { RegistryRow } from "@/core/registry/types";
import { useIsMobile } from "@/ui/useIsMobile";
import { MarkdownView } from "./MarkdownView";

export interface NotesDrawerProps {
  /** The row whose notes are open (kept during the close animation). */
  row: RegistryRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (code: string, notes: string | undefined) => void | Promise<void>;
}

/**
 * Notes in a responsive drawer (DS: right on desktop, bottom on mobile).
 * Opens showing the formatted markdown (preview); clicking it switches to the
 * markdown editor. Save returns to the preview.
 */
export function NotesDrawer({ row, open, onOpenChange, onSave }: NotesDrawerProps) {
  const isMobile = useIsMobile();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Each time the drawer opens: load the notes and start in preview mode.
  useEffect(() => {
    if (open && row) {
      setDraft(row.notes ?? "");
      setEditing(false);
    }
  }, [open, row]);

  async function handleSave() {
    if (!row) return;
    setSaving(true);
    try {
      const trimmed = draft.trim();
      await onSave(row.code, trimmed === "" ? undefined : trimmed);
      setEditing(false); // back to preview, drawer stays open
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setDraft(row?.notes ?? "");
    setEditing(false);
  }

  return (
    <Drawer direction={isMobile ? "bottom" : "right"} open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Notas · {row?.company}</DrawerTitle>
          <DrawerDescription className="font-mono text-xs">{row?.code}</DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-1 flex-col overflow-y-auto px-4">
          {editing ? (
            <Textarea
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={"## Estado\n- 2da entrevista **mañana**\n- pedir feedback"}
              className="min-h-[200px] flex-1 font-mono text-sm"
            />
          ) : (
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
              className="flex-1 cursor-text rounded-lg border border-transparent p-3 text-left transition-colors hover:border-border hover:bg-muted/30"
            >
              <MarkdownView source={draft} />
            </div>
          )}
        </div>

        <DrawerFooter className="flex-row justify-end gap-2">
          {editing ? (
            <>
              <Button variant="ghost" onClick={cancelEdit} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
              Editar
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
