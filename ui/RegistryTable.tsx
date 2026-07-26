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
import type { CoverLetterTemplate } from "@/core/coverLetter/types";
import { formatDateShort } from "@/core/dates";
import type { EditableFields, RegistryRow } from "@/core/registry/types";
import { profileLabel } from "@/core/spec/profiles";
import type { LinkSpec } from "@/core/spec/types";
import { cn } from "@/lib/utils";
import { ChannelIcon } from "@/ui/ChannelIcon";
import { CodeCell } from "@/ui/CodeCell";
import { ArrowToTarget } from "@/ui/animations/ArrowToTarget";
import { RowDetailDrawer, type DetailTab } from "@/ui/detail/RowDetailDrawer";
import { FocusIcon } from "@/ui/FocusIcon";
import { SeguimientoCell } from "@/ui/detail/SeguimientoCell";
import { StatusToggle } from "@/ui/StatusToggle";
import type { UseScreening } from "@/ui/useScreening";
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
  /**
   * Every CV ever sent — count + funnel rank per row (`docs/animations.md`
   * §2 "Modo funnel"), computed by the caller from the *unfiltered* rows
   * (not `rows` above, which is already scoped to the current
   * Vigentes/Archivado tab). Feeds the "flecha a la diana" scene shown
   * while `loading` is true (idle, no arrows yet) and animates in once
   * real data lands — one continuous scene, not a swap between two
   * different loading animations. Omit either to skip straight to the
   * empty/rows state once loading finishes.
   */
  totalSentCount?: number;
  sentFunnelRanks?: number[];
  onUpdate: (code: string, fields: EditableFields) => void | Promise<void>;
  onDelete: (code: string) => void | Promise<void>;
  /** Open the deferred-generation wizard for a pending row ("Generar CV"). */
  onGenerateCv?: (row: RegistryRow) => void;
  /** Shared screening-questions bank (drawer's Preguntas section). */
  screening: UseScreening;
  /** Cover letter templates, for the drawer's post-hoc "Generar cover letter" takeover. */
  templates: CoverLetterTemplate[];
  emptyMessage?: string;
  /**
   * External request to open a row's detail panel (e.g. from the generation
   * toast). The nonce distinguishes repeated requests for the same code.
   */
  openRequest?: { code: string; nonce: number } | null;
}

/** Tooltip for the focus indicator: the profile's label once the spec is loaded, its raw id until then. */
function focusTooltip(focus: string, spec: LinkSpec | null): string {
  return `Foco: ${spec ? profileLabel(spec, focus) : focus}`;
}

export function RegistryTable({
  rows,
  loading = false,
  totalSentCount,
  sentFunnelRanks,
  onUpdate,
  onDelete,
  onGenerateCv,
  screening,
  templates,
  emptyMessage,
  openRequest,
}: RegistryTableProps) {
  const { spec } = useSpec();
  const [detailCode, setDetailCode] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  // Flips true once the arrow reveal finishes *with real data* — never
  // again for this mount (loading never goes back to true after the
  // initial fetch, see useRegistry.ts). While `loading` is still true, the
  // same <ArrowToTarget> instance below just sits idle (count 0, no
  // arrows) instead of swapping to a different loading animation — one
  // continuous scene instead of a jarring cut from one animation to
  // another. `totalSentCount` falsy (0, once loading is done) skips
  // straight past this to the empty/rows state below.
  const [revealDone, setRevealDone] = useState(false);
  const showingReveal = !revealDone && (loading || (totalSentCount ?? 0) > 0);
  const [detailTab, setDetailTab] = useState<DetailTab>("detalles");
  const detailRow = detailCode ? (rows.find((row) => row.code === detailCode) ?? null) : null;
  const detailIndex = detailCode ? rows.findIndex((row) => row.code === detailCode) : -1;

  function openDetail(code: string, tab: DetailTab = "detalles") {
    setDetailCode(code);
    setDetailTab(tab);
    setDetailOpen(true);
  }

  // Honor external open requests (generation toast → detail panel): adjust
  // state during render, guarded by the nonce so each request opens once.
  const [handledNonce, setHandledNonce] = useState<number | null>(null);
  if (openRequest && openRequest.nonce !== handledNonce) {
    setHandledNonce(openRequest.nonce);
    openDetail(openRequest.code);
  }

  // Navigate to another row (by table order) without closing the panel.
  // Re-passing the last requested tab keeps the drawer's initialTab prop
  // unchanged, so it holds whatever tab the user is currently on.
  function goToRow(index: number) {
    const target = rows[index];
    if (target) openDetail(target.code, detailTab);
  }

  return (
    <>
      <div className="w-full overflow-x-auto rounded-lg border">
        {/* The 720px min-width below exists so real columns don't get
            crushed on narrow screens — it has nothing to do with the reveal
            scene, whose only content is a centered animation. Forcing it
            anyway made the diana sit off-center, requiring a horizontal
            scroll to see something that doesn't need one: nothing else is
            in the table at that point. */}
        <Table className={cn("w-full table-fixed", !showingReveal && "max-[639px]:min-w-[720px]")}>
          {/* No header while showing the reveal: there are no columns to
              label yet (just a centered animation), and with the min-width
              above dropped for that same reason, cramming whitespace-nowrap
              headers into whatever width is left just ran their labels
              together unreadably. */}
          {!showingReveal && (
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
          )}
          <TableBody>
            {showingReveal ? (
              <TableRow>
                <TableCell colSpan={COLUMNS.length} className="py-8 text-center text-muted-foreground">
                  <div className="mx-auto w-32 sm:w-52 lg:w-64">
                    <ArrowToTarget
                      count={loading ? 0 : (totalSentCount ?? 0)}
                      mode="funnel"
                      funnelRanks={loading ? undefined : sentFunnelRanks}
                      onDone={loading ? undefined : () => setRevealDone(true)}
                    />
                  </div>
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
                        {emptyMessage ?? "Registrá tu primera aplicación desde el panel de la derecha."}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.code}
                  onClick={() => openDetail(row.code)}
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
                      onSetStatus={(status) => onUpdate(row.code, { status })}
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
        screening={screening}
        templates={templates}
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
