"use client";

import { Fragment, useEffect, useState } from "react";
import {
  ChevronDown,
  Crosshair,
  Dot,
  HeartHandshake,
  Inbox,
  Send,
  type LucideIcon,
} from "lucide-react";

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
import { buildSections, type RegistrySection } from "@/core/registry/groups";
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
import { ReachToggle } from "@/ui/ReachToggle";
import { StatusToggle } from "@/ui/StatusToggle";
import type { UseScreening } from "@/ui/useScreening";
import { useSpec } from "@/ui/useSpec";

/** Remembered open/closed state per section key (per-browser convenience). */
const SECTIONS_STORAGE_KEY = "cbuilder.registry.sections";

function useSectionState() {
  const [state, setState] = useState<Record<string, boolean>>({});
  // Read after mount (never during SSR) so the first render matches the server.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SECTIONS_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from storage
      if (stored) setState(JSON.parse(stored) as Record<string, boolean>);
    } catch {
      // Storage unavailable: every section falls back to its default.
    }
  }, []);
  function set(key: string, open: boolean) {
    setState((current) => {
      const next = { ...current, [key]: open };
      try {
        window.localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Not persisted; still applies for this session.
      }
      return next;
    });
  }
  return [state, set] as const;
}

/**
 * Sectioned table, fixed layout: rows are split into collapsible sections —
 * user groups, then Sin grupo, then Archivado (closed by default) — see
 * core/registry/groups.ts. With no groups and nothing archived there are no
 * section headers at all (looks like the plain table).
 *
 * Columns truncate to fit the container, so there is no horizontal scroll at
 * normal widths. Seguimiento is always last. Foco and
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
  // Reach (inbound/outbound) — icon-only header (heart-handshake), set inline.
  { label: "Reach", width: "w-[5%]", icon: HeartHandshake },
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
  { label: "Empresa", width: "w-[15%]" },
  { label: "Rol", width: "w-[17%]" },
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
   * (not `rows` above, which is already scoped to the status filter).
   * Feeds the "flecha a la diana" scene shown while `loading` is true (idle, no arrows yet) and animates in once
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
  /** Open the wizard to generate an additional CV (another mode) for this application. */
  onGenerateVariant?: (row: RegistryRow) => void;
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
  /** Existing group names (all rows), for the detail panel's Grupo combobox. */
  groups?: string[];
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
  onGenerateVariant,
  screening,
  templates,
  emptyMessage,
  openRequest,
  groups,
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
  const [sectionState, setSectionOpen] = useSectionState();
  const sections = buildSections(rows);
  // Headers only once there's something to separate (a group or an archived row).
  const showHeaders = sections.some((section) => section.kind !== "ungrouped");
  const isOpen = (section: RegistrySection) =>
    !showHeaders || (sectionState[section.key] ?? section.kind !== "archived");
  // Rows in display order (collapsed sections excluded) — drives prev/next in the panel.
  const orderedRows = sections.flatMap((section) => (isOpen(section) ? section.rows : []));
  const detailRow = detailCode ? (rows.find((row) => row.code === detailCode) ?? null) : null;
  const detailIndex = detailCode ? orderedRows.findIndex((row) => row.code === detailCode) : -1;

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
    const target = orderedRows[index];
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
                          <Icon
                            className={cn("size-4", column.iconClass ?? "text-muted-foreground")}
                          />
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
                <TableCell
                  colSpan={COLUMNS.length}
                  className="py-8 text-center text-muted-foreground"
                >
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
                        {emptyMessage ??
                          "Registrá tu primera aplicación desde el panel de la derecha."}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              sections.map((section) => {
                const open = isOpen(section);
                return (
                  <Fragment key={section.key}>
                    {showHeaders && (
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableCell colSpan={COLUMNS.length} className="p-0">
                          <button
                            type="button"
                            aria-expanded={open}
                            onClick={() => setSectionOpen(section.key, !open)}
                            className="flex w-full items-center gap-2 px-2 py-2 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <ChevronDown
                              className={cn(
                                "size-4 text-muted-foreground transition-transform",
                                !open && "-rotate-90",
                              )}
                            />
                            <span className="truncate">{section.label}</span>
                            <span className="font-normal text-muted-foreground tabular-nums">
                              ({section.rows.length})
                            </span>
                          </button>
                        </TableCell>
                      </TableRow>
                    )}
                    {open &&
                      section.rows.map((row) => (
                        <TableRow
                          key={row.code}
                          onClick={() => openDetail(row.code)}
                          className={cn("cursor-pointer", row.archived && "text-muted-foreground")}
                        >
                          <TableCell className="text-center">
                            <ReachToggle
                              reach={row.reach}
                              onSetReach={(reach) => onUpdate(row.code, { reach })}
                            />
                          </TableCell>
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
                          <TableCell className="truncate font-medium">
                            {row.company ? (
                              row.company
                            ) : row.who ? (
                              <span
                                className="font-normal italic text-muted-foreground"
                                title={`Contacto: ${row.who} · sin empresa`}
                              >
                                {row.who}
                              </span>
                            ) : (
                              <span className="font-normal text-muted-foreground">Sin empresa</span>
                            )}
                          </TableCell>
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
                          <TableCell className="truncate tabular-nums">
                            {formatDateShort(row.date)}
                          </TableCell>
                          <TableCell>
                            <StatusToggle
                              status={row.status}
                              onSetStatus={(status) => onUpdate(row.code, { status })}
                            />
                          </TableCell>
                          <TableCell>
                            <SeguimientoCell
                              row={row}
                              onOpen={(tab) => openDetail(row.code, tab)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                  </Fragment>
                );
              })
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
        onGenerateVariant={
          onGenerateVariant
            ? (row) => {
                setDetailOpen(false);
                onGenerateVariant(row);
              }
            : undefined
        }
        screening={screening}
        groups={groups}
        templates={templates}
        initialTab={detailTab}
        position={detailIndex + 1}
        total={orderedRows.length}
        hasPrev={detailIndex > 0}
        hasNext={detailIndex >= 0 && detailIndex < orderedRows.length - 1}
        onPrev={() => goToRow(detailIndex - 1)}
        onNext={() => goToRow(detailIndex + 1)}
      />
    </>
  );
}
