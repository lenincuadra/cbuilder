"use client";

import { useState } from "react";
import { ArrowRight, NotebookPen, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { NotesTab } from "@/ui/detail/NotesTab";
import { useGeneralNotes } from "@/ui/useGeneralNotes";
import { useIsMobile } from "@/ui/useIsMobile";

const PLACEHOLDER =
  "Notas que aplican a todo el proceso…\n\n## Pendientes\n- actualizar portfolio\n- preparar pitch";

/**
 * General, cross-application notes (not tied to any registry row). Preview-first
 * markdown with the same edit/save affordance as the per-row notes. The arrow
 * opens the same editor in a drawer (DS: right on desktop, bottom on mobile);
 * both views share one useGeneralNotes instance, so they stay in sync.
 */
export function GeneralNotesCard() {
  const { notes, save } = useGeneralNotes();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <NotebookPen className="size-4 text-muted-foreground" />
          Notas generales
        </CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setDrawerOpen(true)}
            title="Abrir en un panel"
            aria-label="Abrir las notas generales en un panel"
          >
            <ArrowRight className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <NotesTab notes={notes} onSave={save} placeholder={PLACEHOLDER} />
      </CardContent>

      <Drawer
        direction={isMobile ? "bottom" : "right"}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      >
        <DrawerContent>
          <DrawerHeader className="relative pr-12">
            <DrawerTitle>Notas generales</DrawerTitle>
            <DrawerDescription>Notas que aplican a todo el proceso.</DrawerDescription>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDrawerOpen(false)}
              title="Cerrar"
              className="absolute top-3 right-3"
            >
              <X className="size-4" />
            </Button>
          </DrawerHeader>
          <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-4">
            <NotesTab notes={notes} onSave={save} placeholder={PLACEHOLDER} />
          </div>
        </DrawerContent>
      </Drawer>
    </Card>
  );
}
