"use client";

import { useState, type ReactNode } from "react";
import {
  Archive,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  FileChartLine,
  Info,
  Pencil,
  StickyNote,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateLong } from "@/core/dates";
import type { CoverLetterTemplate } from "@/core/coverLetter/types";
import type { EditableFields, RegistryRow } from "@/core/registry/types";
import { languageLabel } from "@/core/types";
import type { ScreeningQuestion } from "@/core/screening/types";
import { ConfirmDelete, keepDrawerOnDialogInteraction } from "@/ui/ConfirmDelete";
import { StatusToggle } from "@/ui/StatusToggle";
import { useIsMobile } from "@/ui/useIsMobile";
import type { UseScreening } from "@/ui/useScreening";
import { CoverLetterGenerateForm } from "./CoverLetterGenerateForm";
import { CoverLetterSection } from "./CoverLetterSection";
import { DeliveryInfo } from "./DeliveryInfo";
import { NotesTab } from "./NotesTab";
import { RowEditForm } from "./RowEditForm";
import { ScreeningNewForm } from "./ScreeningNewForm";
import { ScreeningSection } from "./ScreeningSection";
import { ScreeningSuggestForm } from "./ScreeningSuggestForm";
import { TrackedLinks } from "./TrackedLinks";
import { UpdatesTab } from "./UpdatesTab";

/** Which panel tab the drawer opens on. */
export type DetailTab = "detalles" | "notas" | "updates";

/**
 * What occupies the tab area: the read view, or one of the form takeovers
 * (each brings its own DrawerBody + pinned footer, same slot as the tabs
 * body). Suggest carries the entry the AI answer writes onto.
 */
type DetailMode =
  | { kind: "view" }
  | { kind: "edit" }
  | { kind: "screening-new" }
  | { kind: "screening-suggest"; entry: ScreeningQuestion }
  | { kind: "cover-letter-generate" };

export interface RowDetailDrawerProps {
  /** The open row (resolved fresh from the table's rows). */
  row: RegistryRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (code: string, fields: EditableFields) => void | Promise<void>;
  onDelete: (code: string) => void | Promise<void>;
  /** Open the deferred-generation wizard for a pending row ("Generar CV"). */
  onGenerateCv?: (row: RegistryRow) => void;
  /** Shared screening-questions bank (the Preguntas section reads/writes it). */
  screening: UseScreening;
  /** Cover letter templates, for the post-hoc "Generar cover letter" takeover. */
  templates: CoverLetterTemplate[];
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
 * mobile). Everything below the action bar lives in three tabs — Detalles (all
 * the application data + the Preguntas section), Notas, Actualizaciones — with
 * the TabsList pinned under the header so it survives body scroll.
 */
export function RowDetailDrawer({
  row,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  onGenerateCv,
  screening,
  templates,
  initialTab = "detalles",
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
  const [mode, setMode] = useState<DetailMode>({ kind: "view" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  // The edit form's Select portals its popup into this node (the drawer) so it stays inside
  // the drawer's pointer-events / stacking / focus scope — a base-ui popup portaled to <body>
  // gets vaul's `pointer-events: none` and its focus gets trapped back, breaking selection.
  const [drawerNode, setDrawerNode] = useState<HTMLDivElement | null>(null);

  // Sync transient panel state during render instead of in an effect: React
  // re-renders synchronously after a set-in-render, so each key matches on the
  // next pass and it settles at once — no extra committed paint, no
  // react-hooks/set-state-in-effect. (See "storing information from previous
  // renders" in the React docs.)

  // Honor the requested tab when the panel opens or the requested tab changes —
  // e.g. prev/next navigation, or clicking another Seguimiento icon while open.
  const tabSyncKey = `${open}:${initialTab}`;
  const [prevTabSyncKey, setPrevTabSyncKey] = useState(tabSyncKey);
  if (tabSyncKey !== prevTabSyncKey) {
    setPrevTabSyncKey(tabSyncKey);
    if (open) setTab(initialTab);
  }

  // Leave any form takeover (and drop any pending delete) when the panel opens or switches rows.
  const rowSyncKey = `${open}:${row?.code ?? ""}`;
  const [prevRowSyncKey, setPrevRowSyncKey] = useState(rowSyncKey);
  if (rowSyncKey !== prevRowSyncKey) {
    setPrevRowSyncKey(rowSyncKey);
    setMode({ kind: "view" });
    setConfirmDelete(false);
  }

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
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as DetailTab)}
            className="min-h-0 flex-1 gap-0"
          >
            {/* Pinned under the action bar; only the body below scrolls. While
                a form takeover is active, the inactive triggers disable so the
                form has to be saved/cancelled first — the active one stays lit
                as the "you are here" marker. */}
            <div className="shrink-0 px-4 pb-3">
              <TabsList className="w-full">
                <TabsTrigger value="detalles" disabled={mode.kind !== "view" && tab !== "detalles"}>
                  <Info />
                  Detalles
                </TabsTrigger>
                <TabsTrigger value="notas" disabled={mode.kind !== "view" && tab !== "notas"}>
                  <StickyNote />
                  Notas
                </TabsTrigger>
                <TabsTrigger value="updates" disabled={mode.kind !== "view" && tab !== "updates"}>
                  <FileChartLine />
                  Actualizaciones
                </TabsTrigger>
              </TabsList>
            </div>

            {mode.kind === "edit" ? (
              // The form takes over the tab area: fields in the scrollable
              // body, Cancelar/Guardar pinned in the footer.
              <RowEditForm
                row={row}
                portalContainer={drawerNode}
                onCancel={() => setMode({ kind: "view" })}
                onSave={async (fields) => {
                  await onUpdate(row.code, fields);
                  setMode({ kind: "view" });
                }}
              />
            ) : mode.kind === "screening-new" ? (
              // Same takeover slot: a new screening question, pre-linked to this row.
              <ScreeningNewForm
                code={row.code}
                company={row.company}
                role={row.role}
                focus={row.focus}
                jobUrl={row.jobUrl}
                jobContext={row.jobContext}
                onUpdateJobFields={(fields) => onUpdate(row.code, fields)}
                screening={screening}
                container={drawerNode}
                onDone={() => setMode({ kind: "view" })}
              />
            ) : mode.kind === "screening-suggest" ? (
              // Same takeover slot: step 2 of the two-step AI suggest for a linked entry.
              <ScreeningSuggestForm
                entry={mode.entry}
                company={row.company}
                role={row.role}
                focus={row.focus}
                jobUrl={row.jobUrl}
                jobContext={row.jobContext}
                onUpdateJobFields={(fields) => onUpdate(row.code, fields)}
                screening={screening}
                container={drawerNode}
                onDone={() => setMode({ kind: "view" })}
              />
            ) : mode.kind === "cover-letter-generate" ? (
              // Same takeover slot: generate + deliver a letter for an application whose CV already shipped.
              <CoverLetterGenerateForm
                row={row}
                templates={templates}
                onUpdate={onUpdate}
                container={drawerNode}
                onDone={() => setMode({ kind: "view" })}
              />
            ) : (
              <DrawerBody>
                <TabsContent value="detalles" className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Datos</span>
                    <Button variant="ghost" size="sm" onClick={() => setMode({ kind: "edit" })}>
                      <Pencil className="size-4" />
                      Editar
                    </Button>
                  </div>
                  <div className="rounded-lg border px-3 py-1">
                    {/* Only fields with a value are shown. */}
                    <Field label="Rol">{row.role}</Field>
                    <Field label="Fecha">
                      <span className="tabular-nums">{formatDateLong(row.date)}</span>
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
                  {/* A pending row has no baked links yet — nothing was sent. */}
                  {!row.cvPending && (
                    <TrackedLinks code={row.code} focus={row.focus} links={row.links} />
                  )}
                  <CoverLetterSection
                    row={row}
                    onStartGenerate={() => setMode({ kind: "cover-letter-generate" })}
                  />
                  <DeliveryInfo row={row} onGenerateCv={() => onGenerateCv?.(row)} />
                  <ScreeningSection
                    code={row.code}
                    screening={screening}
                    onStartNew={() => setMode({ kind: "screening-new" })}
                    onSuggest={(entry) => setMode({ kind: "screening-suggest", entry })}
                    container={drawerNode}
                  />
                </TabsContent>
                <TabsContent value="notas">
                  <NotesTab notes={row.notes} onSave={(notes) => onUpdate(row.code, { notes })} />
                </TabsContent>
                <TabsContent value="updates">
                  <UpdatesTab
                    updates={updates}
                    onSave={(next) => onUpdate(row.code, { updates: next })}
                  />
                </TabsContent>
              </DrawerBody>
            )}
          </Tabs>
        )}
      </DrawerContent>
    </Drawer>

      {row && (
        <ConfirmDelete
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Borrar registro"
          description={
            <>
              Se va a borrar la aplicación a <strong>{row.company}</strong>
              {row.role ? <> · {row.role}</> : null} (código{" "}
              <span className="font-mono">{row.code}</span>, {formatDateLong(row.date)}). Esta
              acción no se puede deshacer.
            </>
          }
          onConfirm={async () => {
            await onDelete(row.code);
            onOpenChange(false); // close the detail drawer too
          }}
        >
          {(row.driveFolder || (row.driveDocs && Object.keys(row.driveDocs).length > 0)) && (
            <div className="space-y-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-amber-500">
                <TriangleAlert className="size-3.5 shrink-0" />
                El CV en Drive no se borra: queda en tu Drive
              </div>
              <p className="text-muted-foreground">
                Borrar la fila no toca Google Drive. Si querés eliminarlo, hacelo a mano:
              </p>
              {row.driveFolder ? (
                <a
                  href={row.driveFolder}
                  target="_blank"
                  rel="noreferrer"
                  className="block break-all font-mono underline underline-offset-2 hover:text-foreground"
                  title={row.driveFolder}
                >
                  Carpeta · {row.driveFolder}
                </a>
              ) : (
                (Object.entries(row.driveDocs ?? {}) as Array<[string, string]>).map(
                  ([language, url]) => (
                    <a
                      key={language}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block break-all font-mono underline underline-offset-2 hover:text-foreground"
                      title={url}
                    >
                      {language} · {url}
                    </a>
                  ),
                )
              )}
            </div>
          )}
        </ConfirmDelete>
      )}
    </>
  );
}
