"use client";

import { StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface NotesButtonProps {
  hasNotes: boolean;
  onClick: () => void;
}

/**
 * Notes cell trigger. Same icon, two states: accented/filled when the row has
 * notes, muted outline when empty — so the column communicates "has details"
 * at a glance without a text preview.
 */
export function NotesButton({ hasNotes, onClick }: NotesButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      title={hasNotes ? "Ver / editar notas" : "Agregar notas"}
      aria-label={hasNotes ? "Ver o editar notas" : "Agregar notas"}
    >
      <StickyNote
        className={cn("size-4", hasNotes ? "fill-primary/20 text-primary" : "text-muted-foreground")}
      />
    </Button>
  );
}
