"use client";

import { Button } from "@/components/ui/button";
import { DrawerFooter } from "@/components/ui/drawer";

export interface DrawerFormFooterProps {
  /** Goes back to the previous view, discarding changes. */
  onCancel: () => void;
  onSubmit: () => void;
  /** Validation gate for the primary button; Cancelar only locks while saving. */
  canSubmit: boolean;
  saving: boolean;
  submitLabel: string;
  /** Label while the submit is in flight (defaults to `submitLabel`). */
  savingLabel?: string;
  cancelLabel?: string;
}

/**
 * Pinned footer of a form takeover view (docs/DESIGN.md → drawers): Cancelar
 * returns to where the form was opened from, the primary button saves and the
 * caller navigates back. Shared by the manager form views and RowEditForm so
 * every form drawer closes the same way.
 */
export function DrawerFormFooter({
  onCancel,
  onSubmit,
  canSubmit,
  saving,
  submitLabel,
  savingLabel,
  cancelLabel = "Cancelar",
}: DrawerFormFooterProps) {
  return (
    <DrawerFooter className="flex-row justify-end">
      <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
        {cancelLabel}
      </Button>
      <Button size="sm" onClick={onSubmit} disabled={saving || !canSubmit}>
        {saving ? (savingLabel ?? submitLabel) : submitLabel}
      </Button>
    </DrawerFooter>
  );
}
