"use client";

import { useEffect, useState } from "react";

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
 * Notes editor in a responsive drawer (DS: right on desktop, bottom on mobile).
 * Live editor + preview: textarea on top, rendered markdown updating below.
 */
export function NotesDrawer({ row, open, onOpenChange, onSave }: NotesDrawerProps) {
  const isMobile = useIsMobile();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  // Load the row's notes into the editor each time the drawer opens.
  useEffect(() => {
    if (open && row) setDraft(row.notes ?? "");
  }, [open, row]);

  async function handleSave() {
    if (!row) return;
    setSaving(true);
    try {
      const trimmed = draft.trim();
      await onSave(row.code, trimmed === "" ? undefined : trimmed);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer direction={isMobile ? "bottom" : "right"} open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Notas · {row?.company}</DrawerTitle>
          <DrawerDescription className="font-mono text-xs">{row?.code}</DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Editar (Markdown)</span>
            <Textarea
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={"## Estado\n- 2da entrevista **mañana**\n- pedir feedback"}
              className="min-h-[140px] font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Vista previa</span>
            <div className="rounded-lg border bg-muted/30 p-3">
              <MarkdownView source={draft} />
            </div>
          </div>
        </div>

        <DrawerFooter className="flex-row justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
