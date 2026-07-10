"use client";

import type { CSSProperties, ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * App-wide delete pattern: a **confirm modal** here, then a **destructive toast**
 * of what happened (`toastDeleted`). Every delete in the app goes through this —
 * see docs/DESIGN.md ("Borrado: confirmar + avisar"). Controlled dialog; the
 * confirm button runs `onConfirm` then closes. `children` renders extra content
 * between the header and the footer (e.g. a warning).
 */
export interface ConfirmDeleteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDelete({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel = "Borrar",
  onConfirm,
}: ConfirmDeleteProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10">
            <Trash2 className="text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            // Destructive solid (not the DS's tenue): an irreversible action must read as dangerous.
            className="bg-destructive text-white hover:bg-destructive/90 focus-visible:border-destructive/40 focus-visible:ring-destructive/20"
            onClick={async () => {
              await onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** The app-wide "X was deleted" toast: destructive-styled, trash icon. */
export function toastDeleted(message: string): void {
  toast(message, {
    icon: <Trash2 className="size-4 text-destructive" />,
    style: {
      "--normal-text": "var(--destructive)",
      "--normal-border": "var(--destructive)",
    } as CSSProperties,
  });
}

/**
 * For a drawer hosting a nested AlertDialog (which portals to <body>, outside the
 * drawer): pass this to the DrawerContent's `onPointerDownOutside` /
 * `onInteractOutside` so a click on the dialog doesn't dismiss the drawer. Reads
 * the DOM target (no React state) to avoid stale-closure races.
 */
export function keepDrawerOnDialogInteraction(event: {
  detail?: { originalEvent?: Event };
  target?: EventTarget | null;
  preventDefault: () => void;
}): void {
  const target = event.detail?.originalEvent?.target ?? event.target;
  if (
    target instanceof Element &&
    target.closest('[data-slot="alert-dialog-content"], [data-slot="alert-dialog-overlay"]')
  ) {
    event.preventDefault();
  }
}
