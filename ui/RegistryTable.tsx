"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApplicationStatus, EditableFields, RegistryRow } from "@/core/registry/types";
import { cn } from "@/lib/utils";
import { NotesButton } from "@/ui/notes/NotesButton";
import { NotesDrawer } from "@/ui/notes/NotesDrawer";

/** The 7 registry columns, in order. Flat table — Notas always last. */
const COLUMNS = ["Código", "Empresa", "Rol", "Canal", "Fecha", "Estado", "Notas"] as const;

/** Colored badge that toggles Activo <-> Rechazado on click (binary status). */
function StatusToggle({ status, onToggle }: { status: ApplicationStatus; onToggle: () => void }) {
  const next: ApplicationStatus = status === "Activo" ? "Rechazado" : "Activo";
  return (
    <button type="button" onClick={onToggle} title={`Cambiar a ${next}`} className="cursor-pointer">
      <Badge
        className={cn(
          "border-transparent transition-colors",
          status === "Activo"
            ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300"
            : "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300",
        )}
      >
        {status}
      </Badge>
    </button>
  );
}

export interface RegistryTableProps {
  rows: RegistryRow[];
  loading?: boolean;
  onUpdate: (code: string, fields: EditableFields) => void | Promise<void>;
}

export function RegistryTable({ rows, loading = false, onUpdate }: RegistryTableProps) {
  // The notes drawer is owned at the table level; `notesRow` is kept during the
  // close animation, and `notesOpen` drives open/close.
  const [notesRow, setNotesRow] = useState<RegistryRow | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  function openNotes(row: RegistryRow) {
    setNotesRow(row);
    setNotesOpen(true);
  }

  return (
    <>
      {/* The table owns its horizontal scroll: columns are never hidden or shrunk. */}
      <div className="w-full overflow-x-auto rounded-lg border">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              {COLUMNS.map((column) => (
                <TableHead key={column} className="whitespace-nowrap">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={COLUMNS.length} className="h-24 text-center text-muted-foreground">
                  Cargando registro…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNS.length} className="h-24 text-center text-muted-foreground">
                  Todavía no hay aplicaciones. Generá tu primer CV desde el panel de la derecha.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.code}>
                  <TableCell className="font-mono text-xs">{row.code}</TableCell>
                  <TableCell className="whitespace-nowrap font-medium">{row.company}</TableCell>
                  <TableCell className="whitespace-nowrap">{row.role}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {row.channel ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">{row.date}</TableCell>
                  <TableCell>
                    <StatusToggle
                      status={row.status}
                      onToggle={() =>
                        onUpdate(row.code, {
                          status: row.status === "Activo" ? "Rechazado" : "Activo",
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <NotesButton
                      hasNotes={Boolean(row.notes?.trim())}
                      onClick={() => openNotes(row)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <NotesDrawer
        row={notesRow}
        open={notesOpen}
        onOpenChange={setNotesOpen}
        onSave={(code, notes) => onUpdate(code, { notes })}
      />
    </>
  );
}
