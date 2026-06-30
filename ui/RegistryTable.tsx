"use client";

import { useState } from "react";
import { Inbox } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EditableFields, RegistryRow } from "@/core/registry/types";
import { RowDetailDrawer } from "@/ui/detail/RowDetailDrawer";
import { SeguimientoCell } from "@/ui/detail/SeguimientoCell";
import { StatusToggle } from "@/ui/StatusToggle";

/** Flat table — Seguimiento always last. */
const COLUMNS = ["Código", "Empresa", "Rol", "Canal", "Fecha", "Estado", "Seguimiento"] as const;

export interface RegistryTableProps {
  rows: RegistryRow[];
  loading?: boolean;
  onUpdate: (code: string, fields: EditableFields) => void | Promise<void>;
  emptyMessage?: string;
}

export function RegistryTable({ rows, loading = false, onUpdate, emptyMessage }: RegistryTableProps) {
  // The detail panel resolves its row fresh from `rows` by code, so edits made
  // inside it (notes, updates, status, archive) reflect immediately.
  const [detailCode, setDetailCode] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const detailRow = detailCode ? (rows.find((row) => row.code === detailCode) ?? null) : null;

  return (
    <>
      <div className="w-full overflow-x-auto rounded-lg border">
        <Table className="min-w-[820px]">
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
                <TableCell colSpan={COLUMNS.length} className="py-8">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Inbox />
                      </EmptyMedia>
                      <EmptyTitle>No hay aplicaciones</EmptyTitle>
                      <EmptyDescription>
                        {emptyMessage ?? "Generá tu primer CV desde el panel de la derecha."}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
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
                    <SeguimientoCell row={row} onOpen={() => {
                      setDetailCode(row.code);
                      setDetailOpen(true);
                    }} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <RowDetailDrawer
        row={detailRow}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdate={onUpdate}
      />
    </>
  );
}
