"use client";

import { useState } from "react";
import { Inbox, Send, type LucideIcon } from "lucide-react";

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
import { cn } from "@/lib/utils";
import { ChannelIcon } from "@/ui/ChannelIcon";
import { CodeCell } from "@/ui/CodeCell";
import { RowDetailDrawer, type DetailTab } from "@/ui/detail/RowDetailDrawer";
import { SeguimientoCell } from "@/ui/detail/SeguimientoCell";
import { StatusToggle } from "@/ui/StatusToggle";

/**
 * Flat table, fixed layout: columns truncate to fit the container, so there is
 * no horizontal scroll at normal widths. Seguimiento is always last. Canal is
 * icon-only so it stays narrow; the freed width goes to Empresa/Rol/Seguimiento.
 * Below 640px a min-width re-enables scroll so columns stay legible.
 */
type Column = { label: string; width: string; icon?: LucideIcon };
const COLUMNS: Column[] = [
  { label: "Código", width: "w-[9%]" },
  { label: "Empresa", width: "w-[18%]" },
  { label: "Rol", width: "w-[24%]" },
  { label: "Canal", width: "w-[8%]", icon: Send },
  { label: "Fecha", width: "w-[12%]" },
  { label: "Estado", width: "w-[11%]" },
  { label: "Seguimiento", width: "w-[18%]" },
];

export interface RegistryTableProps {
  rows: RegistryRow[];
  loading?: boolean;
  onUpdate: (code: string, fields: EditableFields) => void | Promise<void>;
  onDelete: (code: string) => void | Promise<void>;
  emptyMessage?: string;
}

/**
 * Default tab when opening a row generically: the tab with content when only one
 * has it (updates-only → Actualizaciones), otherwise Notas. Generic rule.
 */
function defaultTabFor(row: RegistryRow): DetailTab {
  const hasNotes = Boolean(row.notes?.trim());
  const hasUpdates = Boolean(row.updates?.length);
  return !hasNotes && hasUpdates ? "updates" : "notas";
}

export function RegistryTable({
  rows,
  loading = false,
  onUpdate,
  onDelete,
  emptyMessage,
}: RegistryTableProps) {
  const [detailCode, setDetailCode] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>("notas");
  const detailRow = detailCode ? (rows.find((row) => row.code === detailCode) ?? null) : null;
  const detailIndex = detailCode ? rows.findIndex((row) => row.code === detailCode) : -1;

  function openDetail(code: string, tab: DetailTab = "notas") {
    setDetailCode(code);
    setDetailTab(tab);
    setDetailOpen(true);
  }

  // Navigate to another row (by table order) without closing the panel.
  function goToRow(index: number) {
    const target = rows[index];
    if (target) openDetail(target.code, defaultTabFor(target));
  }

  return (
    <>
      <div className="w-full overflow-x-auto rounded-lg border">
        <Table className="w-full table-fixed max-[639px]:min-w-[720px]">
          <TableHeader>
            <TableRow>
              {COLUMNS.map((column) => {
                const Icon = column.icon;
                return (
                  <TableHead key={column.label} className={cn("whitespace-nowrap", column.width)}>
                    {Icon ? (
                      <span className="inline-flex" title={column.label} aria-label={column.label}>
                        <Icon className="size-4 text-muted-foreground" />
                      </span>
                    ) : (
                      column.label
                    )}
                  </TableHead>
                );
              })}
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
                <TableRow
                  key={row.code}
                  onClick={() => openDetail(row.code, defaultTabFor(row))}
                  className="cursor-pointer"
                >
                  <TableCell className="truncate">
                    <CodeCell code={row.code} />
                  </TableCell>
                  <TableCell className="truncate font-medium">{row.company}</TableCell>
                  <TableCell className="truncate" title={row.role}>
                    {row.role}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.channel ? (
                      <span
                        className="inline-flex"
                        title={row.channel}
                        aria-label={row.channel}
                      >
                        <ChannelIcon channel={row.channel} />
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="truncate tabular-nums">{row.date}</TableCell>
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
                    <SeguimientoCell row={row} onOpen={(tab) => openDetail(row.code, tab)} />
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
        onDelete={onDelete}
        initialTab={detailTab}
        position={detailIndex + 1}
        total={rows.length}
        hasPrev={detailIndex > 0}
        hasNext={detailIndex >= 0 && detailIndex < rows.length - 1}
        onPrev={() => goToRow(detailIndex - 1)}
        onNext={() => goToRow(detailIndex + 1)}
      />
    </>
  );
}
