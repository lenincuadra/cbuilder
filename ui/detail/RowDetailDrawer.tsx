"use client";

import type { ReactNode } from "react";
import { Archive, ArchiveRestore, FileChartLine, StickyNote, X } from "lucide-react";

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
import { StatusToggle } from "@/ui/StatusToggle";
import { useIsMobile } from "@/ui/useIsMobile";
import { NotesTab } from "./NotesTab";
import { UpdatesTab } from "./UpdatesTab";

export interface RowDetailDrawerProps {
  /** The open row (resolved fresh from the table's rows). */
  row: RegistryRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (code: string, fields: EditableFields) => void | Promise<void>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

/**
 * Full row detail panel in a responsive drawer (DS: right on desktop, bottom on
 * mobile). Shows all the application data, plus the Seguimiento tabs.
 */
export function RowDetailDrawer({ row, open, onOpenChange, onUpdate }: RowDetailDrawerProps) {
  const isMobile = useIsMobile();
  const updates = row?.updates ?? [];

  return (
    <Drawer direction={isMobile ? "bottom" : "right"} open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="relative pr-12">
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
            <div className="mt-2 flex items-center gap-2">
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
            </div>
          )}
        </DrawerHeader>

        {row && (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
            <div className="rounded-lg border px-3 py-1">
              <Field label="Rol">{row.role}</Field>
              <Field label="Canal">{row.channel ?? "—"}</Field>
              <Field label="Fecha">
                <span className="tabular-nums">{row.date}</span>
              </Field>
              <Field label="Quién">{row.who ?? "—"}</Field>
              <Field label="Idioma">{row.language ?? "—"}</Field>
              <Field label="Link del puesto">
                {row.jobUrl ? (
                  <a
                    href={row.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2"
                  >
                    Ver puesto
                  </a>
                ) : (
                  "—"
                )}
              </Field>
            </div>

            <Separator />

            <Tabs defaultValue="notas" className="flex-1">
              <TabsList>
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
                  onAdd={(message) =>
                    onUpdate(row.code, {
                      updates: [...updates, { at: new Date().toISOString(), message }],
                    })
                  }
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
