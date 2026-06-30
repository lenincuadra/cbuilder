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
import { Textarea } from "@/components/ui/textarea";
import type { ApplicationStatus, EditableFields, RegistryRow } from "@/core/registry/types";
import { cn } from "@/lib/utils";

/** The 7 registry columns, in order. Flat table — no grouping by company. */
const COLUMNS = ["Código", "Empresa", "Rol", "Canal", "Fecha", "Notas", "Estado"] as const;

/** Colored badge that toggles Activo <-> Rechazado on click (binary status). */
function StatusToggle({
  status,
  onToggle,
}: {
  status: ApplicationStatus;
  onToggle: () => void;
}) {
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

/** Notes cell: click to edit inline. Blur or Cmd/Ctrl+Enter saves, Escape cancels. */
function EditableNotes({
  value,
  onSave,
}: {
  value?: string;
  onSave: (next: string | undefined) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  function start() {
    setDraft(value ?? "");
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    const next = trimmed === "" ? undefined : trimmed;
    if (next !== value) onSave(next);
  }

  function cancel() {
    setEditing(false);
    setDraft(value ?? "");
  }

  if (editing) {
    return (
      <Textarea
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            cancel();
          } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            commit();
          }
        }}
        rows={2}
        className="min-h-[56px] text-sm"
        placeholder="Notas del proceso…"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      title="Editar notas"
      className="w-full cursor-text text-left"
    >
      {value ? (
        <span className="line-clamp-2">{value}</span>
      ) : (
        <span className="text-muted-foreground italic">sin notas</span>
      )}
    </button>
  );
}

export interface RegistryTableProps {
  rows: RegistryRow[];
  loading?: boolean;
  onUpdate: (code: string, fields: EditableFields) => void | Promise<void>;
}

export function RegistryTable({ rows, loading = false, onUpdate }: RegistryTableProps) {
  return (
    // The table owns its horizontal scroll: columns are never hidden or shrunk.
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
                <TableCell className="max-w-[220px] align-top">
                  <EditableNotes
                    value={row.notes}
                    onSave={(next) => onUpdate(row.code, { notes: next })}
                  />
                </TableCell>
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
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
