"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Archive,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  FileChartLine,
  Pencil,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";

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
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EditableFields, RegistryRow } from "@/core/registry/types";
import { languageLabel } from "@/core/types";
import { StatusToggle } from "@/ui/StatusToggle";
import { useIsMobile } from "@/ui/useIsMobile";
import { NotesTab } from "./NotesTab";
import { RowEditForm } from "./RowEditForm";
import { TrackedLinks } from "./TrackedLinks";
import { UpdatesTab } from "./UpdatesTab";

/** Which Seguimiento tab the panel opens on. */
export type DetailTab = "notas" | "updates";

export interface RowDetailDrawerProps {
  /** The open row (resolved fresh from the table's rows). */
  row: RegistryRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (code: string, fields: EditableFields) => void | Promise<void>;
  onDelete: (code: string) => void | Promise<void>;
  /** Tab to show when the panel opens. */
  initialTab?: DetailTab;
  // --- navigation between table rows ---
  /** 1-based position of the open row in the table. */
  position?: number;
  total?: number;
  hasPrev?: boolean;
  hasNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right">{children}</span>
    </div>
  );
}

/**
 * Full row detail panel in a responsive drawer (DS: right on desktop, bottom on
 * mobile). Shows all the application data, plus the Seguimiento tabs.
 */
export function RowDetailDrawer({
  row,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  initialTab = "notas",
  position,
  total,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: RowDetailDrawerProps) {
  const isMobile = useIsMobile();
  const updates = row?.updates ?? [];
  const [tab, setTab] = useState<DetailTab>(initialTab);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // The edit form's Select portals its popup into this node (the drawer) so it stays inside
  // the drawer's pointer-events / stacking / focus scope — a base-ui popup portaled to <body>
  // gets vaul's `pointer-events: none` and its focus gets trapped back, breaking selection.
  const [drawerNode, setDrawerNode] = useState<HTMLDivElement | null>(null);

  // The confirm dialog renders at its default (viewport-centered) position, so it portals
  // to <body> — outside the drawer. vaul would read a click on it as an outside click and
  // dismiss the drawer. Keep the drawer open by inspecting the event's DOM target (no React
  // state, so no stale-closure races): if the interaction is inside the alert dialog, cancel
  // the dismissal. Explicit closes (X, Archivar, confirm) still call onOpenChange directly.
  const keepDrawerOnDialogInteraction = (event: { detail?: { originalEvent?: Event }; target?: EventTarget | null; preventDefault: () => void }) => {
    const target = event.detail?.originalEvent?.target ?? event.target;
    if (
      target instanceof Element &&
      target.closest('[data-slot="alert-dialog-content"], [data-slot="alert-dialog-overlay"]')
    ) {
      event.preventDefault();
    }
  };

  // Honor the requested tab each time the panel opens.
  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  // Leave edit mode (and drop any pending delete) when the panel opens or switches rows.
  useEffect(() => {
    setEditing(false);
    setConfirmDelete(false);
  }, [open, row?.code]);

  return (
    <>
    <Drawer direction={isMobile ? "bottom" : "right"} open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        ref={setDrawerNode}
        onPointerDownOutside={keepDrawerOnDialogInteraction}
        onInteractOutside={keepDrawerOnDialogInteraction}
        onEscapeKeyDown={(event) => {
          // Escape while confirming should close only the dialog, not the drawer.
          if (document.querySelector('[data-slot="alert-dialog-content"]')) event.preventDefault();
        }}
      >
        <DrawerHeader className="relative pr-12">
          {(onPrev || onNext) && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={onPrev}
                disabled={!hasPrev}
                title="Fila anterior"
                aria-label="Fila anterior"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs tabular-nums">
                {position} / {total}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={onNext}
                disabled={!hasNext}
                title="Fila siguiente"
                aria-label="Fila siguiente"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
          <DrawerTitle>{row?.company}</DrawerTitle>
          <DrawerDescription className="font-mono text-xs">{row?.code}</DrawerDescription>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            title="Cerrar"
            className="absolute top-3 right-3"
          >
            <X className="size-4" />
          </Button>
          {row && (
            // -mr-8 cancels the header's pr-12 so "Borrar" lines up with the body's right edge.
            <div className="mt-2 -mr-8 flex items-center gap-2">
              <StatusToggle
                status={row.status}
                onToggle={() =>
                  onUpdate(row.code, {
                    status: row.status === "Activo" ? "Rechazado" : "Activo",
                  })
                }
              />
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  // Archiving moves the row out of the current view, so close.
                  await onUpdate(row.code, { archived: !row.archived });
                  onOpenChange(false);
                }}
              >
                {row.archived ? (
                  <>
                    <ArchiveRestore className="size-4" />
                    Desarchivar
                  </>
                ) : (
                  <>
                    <Archive className="size-4" />
                    Archivar
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4" />
                Borrar
              </Button>
            </div>
          )}
        </DrawerHeader>

        {row && (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
            {editing ? (
              <RowEditForm
                row={row}
                portalContainer={drawerNode}
                onCancel={() => setEditing(false)}
                onSave={async (fields) => {
                  await onUpdate(row.code, fields);
                  setEditing(false);
                }}
              />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Datos</span>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                    <Pencil className="size-4" />
                    Editar
                  </Button>
                </div>
                <div className="rounded-lg border px-3 py-1">
                  {/* Only fields with a value are shown. */}
                  <Field label="Rol">{row.role}</Field>
                  <Field label="Fecha">
                    <span className="tabular-nums">{row.date}</span>
                  </Field>
                  {row.channel && <Field label="Canal">{row.channel}</Field>}
                  {row.email && (
                    <Field label="Email">
                      <span className="break-all">{row.email}</span>
                    </Field>
                  )}
                  {row.who && <Field label="Quién">{row.who}</Field>}
                  {row.language && <Field label="Idioma">{languageLabel(row.language)}</Field>}
                  {row.jobUrl && (
                    <Field label="Link del puesto">
                      <a
                        href={row.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={row.jobUrl}
                        className="block max-w-full truncate text-primary underline underline-offset-2"
                      >
                        {row.jobUrl}
                      </a>
                    </Field>
                  )}
                </div>
                <TrackedLinks code={row.code} />
              </div>
            )}

            <Separator />

            <Tabs
              value={tab}
              onValueChange={(value) => setTab(value as DetailTab)}
              className="flex-1"
            >
              <TabsList className="w-full">
                <TabsTrigger value="notas">
                  <StickyNote />
                  Notas
                </TabsTrigger>
                <TabsTrigger value="updates">
                  <FileChartLine />
                  Actualizaciones
                </TabsTrigger>
              </TabsList>
              <TabsContent value="notas" className="pt-3">
                <NotesTab notes={row.notes} onSave={(notes) => onUpdate(row.code, { notes })} />
              </TabsContent>
              <TabsContent value="updates" className="pt-3">
                <UpdatesTab
                  updates={updates}
                  onSave={(next) => onUpdate(row.code, { updates: next })}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DrawerContent>
    </Drawer>

      {row && (
        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-destructive/10">
                <Trash2 className="text-destructive" />
              </AlertDialogMedia>
              <AlertDialogTitle>Borrar registro</AlertDialogTitle>
              <AlertDialogDescription>
                Se va a borrar la aplicación a <strong>{row.company}</strong>
                {row.role ? <> · {row.role}</> : null} (código{" "}
                <span className="font-mono">{row.code}</span>, {row.date}). Esta acción no se
                puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90 focus-visible:border-destructive/40 focus-visible:ring-destructive/20"
                onClick={async () => {
                  await onDelete(row.code);
                  setConfirmDelete(false);
                  onOpenChange(false);
                }}
              >
                Borrar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
