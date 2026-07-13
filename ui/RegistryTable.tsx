"use client";

import { useState } from "react";
import { Crosshair, Dot, Inbox, Send, type LucideIcon } from "lucide-react";

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
import { formatDateShort } from "@/core/dates";
import type { EditableFields, RegistryRow } from "@/core/registry/types";
import { profileLabel } from "@/core/spec/profiles";
import type { LinkSpec } from "@/core/spec/types";
import { cn } from "@/lib/utils";
import { ChannelIcon } from "@/ui/ChannelIcon";
import { CodeCell } from "@/ui/CodeCell";
import { RowDetailDrawer, type DetailTab } from "@/ui/detail/RowDetailDrawer";
import { FocusIcon } from "@/ui/FocusIcon";
import { SeguimientoCell } from "@/ui/detail/SeguimientoCell";
import { StatusToggle } from "@/ui/StatusToggle";
import { useSpec } from "@/ui/useSpec";

/**
 * Flat table, fixed layout: columns truncate to fit the container, so there is
 * no horizontal scroll at normal widths. Seguimiento is always last. Foco and
 * Canal are icon-only so they stay narrow; the freed width goes to
 * Empresa/Rol/Seguimiento. Below 640px a min-width re-enables scroll so
 * columns stay legible.
 */
type Column = {
  label: string;
  width: string;
  icon?: LucideIcon;
  iconClass?: string;
  /** Header alignment override; icon columns default to text-center. */
  headClass?: string;
};
const COLUMNS: Column[] = [
  { label: "Código", width: "w-[11%]" },
  // Foco's icons are white (foreground): they mark row state, not secondary
  // text. Right-aligned with no right padding so the icon sits one cell
  // padding (8px) from the company name, as when it lived inline next to it.
  {
    label: "Foco",
    width: "w-[5%]",
    icon: Crosshair,
    iconClass: "text-foreground",
    headClass: "pr-0 text-right",
  },
  { label: "Empresa", width: "w-[17%]" },
  { label: "Rol", width: "w-[20%]" },
  { label: "Canal", width: "w-[8%]", icon: Send },
  { label: "Fecha", width: "w-[11%]" },
  { label: "Estado", width: "w-[11%]" },
  { label: "Seguimiento", width: "w-[17%]" },
];

export interface RegistryTableProps {
  rows: RegistryRow[];
  loading?: boolean;
  onUpdate: (code: string, fields: EditableFields) => void | Promise<void>;
  onDelete: (code: string) => void | Promise<void>;
  /** Open the deferred-generation wizard for a pending row ("Generar CV"). */
  onGenerateCv?: (row: RegistryRow) => void;
  emptyMessage?: string;
  /**
   * External request to open a row's detail panel (e.g. from the generation
   * toast). The nonce distinguishes repeated requests for the same code.
   */
  openRequest?: { code: string; nonce: number } | null;
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

/** Tooltip for the focus indicator: the profile's label once the spec is loaded, its raw id until then. */
function focusTooltip(focus: string, spec: LinkSpec | null): string {
  return `Foco: ${spec ? profileLabel(spec, focus) : focus}`;
}

export function RegistryTable({
  rows,
  loading = false,
  onUpdate,
  onDelete,
  onGenerateCv,
  emptyMessage,
  openRequest,
}: RegistryTableProps) {
  const { spec } = useSpec();
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

  // Honor external open requests (generation toast → detail panel): adjust
  // state during render, guarded by the nonce so each request opens once.
  const [handledNonce, setHandledNonce] = useState<number | null>(null);
  if (openRequest && openRequest.nonce !== handledNonce) {
    setHandledNonce(openRequest.nonce);
    const row = rows.find((candidate) => candidate.code === openRequest.code);
    openDetail(openRequest.code, row ? defaultTabFor(row) : "notas");
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
                  <TableHead
                    key={column.label}
                    className={cn(
                      "whitespace-nowrap",
                      column.width,
                      column.headClass ?? (Icon && "text-center"),
                    )}
                  >
                    {Icon ? (
                      <span
                        className="inline-flex justify-center"
                        title={column.label}
                        aria-label={column.label}
                      >
                        <Icon className={cn("size-4", column.iconClass ?? "text-muted-foreground")} />
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
                  <TableCell className="pr-0 text-right text-foreground">
                    <span
                      className="inline-flex"
                      title={row.focus ? focusTooltip(row.focus, spec) : "Sin foco"}
                      aria-label={row.focus ? focusTooltip(row.focus, spec) : "Sin foco"}
                    >
                      {row.focus ? (
                        <FocusIcon focus={row.focus} className="size-4" />
                      ) : (
                        <Dot className="size-4" />
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="truncate font-medium">{row.company}</TableCell>
                  <TableCell className="truncate" title={row.role}>
                    {row.role}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {row.channel ? (
                      <span
                        className="inline-flex justify-center"
                        title={row.channel}
                        aria-label={row.channel}
                      >
                        <ChannelIcon channel={row.channel} />
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="truncate tabular-nums">{formatDateShort(row.date)}</TableCell>
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
        onGenerateCv={(row) => {
          // The wizard opens in its own drawer; close the detail panel first.
          setDetailOpen(false);
          onGenerateCv?.(row);
        }}
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
