"use client";

import { useState } from "react";
import { Calendar, Check, CircleCheck, CircleX, Plus, RotateCcw, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Item, ItemContent } from "@/components/ui/item";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toISODate } from "@/core/dates";
import { FUNNEL_STAGES } from "@/core/funnel";
import {
  type ApplicationStatus,
  MAX_UPDATES,
  MILESTONE_KEYS,
  type MilestoneKey,
  type Milestones,
  type StatusUpdate,
} from "@/core/registry/types";
import { cn } from "@/lib/utils";
import { IconSelect } from "@/ui/IconSelect";
import { statusBadgeClass } from "@/ui/StatusToggle";
import { DatePicker } from "@/ui/wizard/DatePicker";

/** ES label per milestone, from the funnel stage list (single source of truth). */
const MILESTONE_LABELS = Object.fromEntries(
  FUNNEL_STAGES.flatMap((stage) => (stage.milestone ? [[stage.milestone, stage.label]] : [])),
) as Record<MilestoneKey, string>;

/**
 * Stepper dot color for a reached stage, by outcome (= status). A closed
 * process paints every reached stage with its outcome (verde/rojo); an active
 * one stays neutral except the furthest stage ("la punta"), which is ámbar.
 */
function dotClass(reached: boolean, isTip: boolean, status: ApplicationStatus): string {
  if (!reached) return "border border-border bg-muted";
  if (status === "Aceptado") return "bg-success text-background";
  if (status === "Rechazado") return "bg-destructive text-background";
  if (isTip && status === "Activo") return "bg-warning text-background";
  return "bg-primary text-primary-foreground";
}

/** Connector line color between a stage and the next (tinted only when both reached). */
function lineClass(reached: boolean, nextReached: boolean, status: ApplicationStatus): string {
  if (!reached || !nextReached) return "bg-border";
  if (status === "Aceptado") return "bg-success/40";
  if (status === "Rechazado") return "bg-destructive/40";
  return "bg-primary/30";
}

/** Fields this section owns, patched together so one save covers both. */
export interface MilestoneTimelinePatch {
  milestones?: Milestones;
  updates?: StatusUpdate[];
}

export interface MilestoneTimelineProps {
  milestones: Milestones | undefined;
  updates: StatusUpdate[];
  /** Application outcome — drives the stepper colors and the "Fin del proceso" control. */
  status: ApplicationStatus;
  /** Persist milestones + updates. Empty milestones drop the field from the row. */
  onSave: (patch: MilestoneTimelinePatch) => void | Promise<void>;
  /** Close/reopen the process (sets the row's status: Aceptado / Rechazado / Activo). */
  onSetStatus: (status: ApplicationStatus) => void | Promise<void>;
  /** Drawer node the assign-milestone dropdown portals into (focus/pe scope). */
  container?: HTMLElement | null;
}

/** Draft backing the add/edit item form. `index` null = adding a new item. */
interface ItemDraft {
  index: number | null;
  milestone: MilestoneKey;
  message: string;
  /** ISO timestamp. */
  at: string;
  flag: boolean;
}

function formatWhen(at: string): string {
  return new Date(at).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** ISO -> "YYYY-MM-DDTHH:mm" in local time, for <input type="datetime-local">. */
function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Same entry without its milestone tag (used when unmarking a stage). */
function untagged(update: StatusUpdate): StatusUpdate {
  const rest = { ...update };
  delete rest.milestone;
  return rest;
}

/**
 * Unified process timeline (Seguimiento › Actualizaciones): the AARRR funnel
 * milestones as a vertical stepper, each with its own date and its own list of
 * annotations. Marking a milestone marks every earlier one too (the funnel is
 * cumulative) — a shortcut for processes caught up after the fact; each reached
 * stage still wants at least one annotation. Every item hangs off a milestone;
 * legacy/system items with none land under "Sin hito", reassignable inline.
 */
export function MilestoneTimeline({
  milestones,
  updates,
  status,
  onSave,
  onSetStatus,
  container,
}: MilestoneTimelineProps) {
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<ItemDraft | null>(null);
  const current = milestones ?? {};
  /** Furthest reached milestone index ("la punta"), -1 when none is marked. */
  const tipIndex = MILESTONE_KEYS.reduce((tip, key, i) => (current[key] ? i : tip), -1);
  const closed = status === "Aceptado" || status === "Rechazado";
  // Earliest set milestone date — the fallback shown for stages reached only by
  // cumulative inference (e.g. legacy rows with "Respuesta" but no "CV enviado").
  const earliestDate = MILESTONE_KEYS.map((key) => current[key])
    .filter((date): date is string => Boolean(date))
    .sort()[0];

  async function persist(nextMilestones: Milestones, nextUpdates: StatusUpdate[]) {
    setSaving(true);
    try {
      await onSave({
        milestones: Object.keys(nextMilestones).length > 0 ? nextMilestones : undefined,
        updates: nextUpdates,
      });
    } finally {
      setSaving(false);
    }
  }

  /** Items tagged to `key`, with their index in the stored array, oldest first. */
  function itemsFor(key: MilestoneKey): Array<{ update: StatusUpdate; index: number }> {
    return updates
      .map((update, index) => ({ update, index }))
      .filter(({ update }) => update.milestone === key)
      .sort((a, b) => a.update.at.localeCompare(b.update.at));
  }

  const orphans = updates
    .map((update, index) => ({ update, index }))
    .filter(({ update }) => !update.milestone || !MILESTONE_KEYS.includes(update.milestone))
    .sort((a, b) => a.update.at.localeCompare(b.update.at));

  const atCap = updates.length >= MAX_UPDATES;

  /** Mark `key` reached (plus every earlier stage) and prompt for its first item. */
  function reach(key: MilestoneKey) {
    const target = MILESTONE_KEYS.indexOf(key);
    const today = toISODate(new Date());
    const next = { ...current };
    for (let i = 0; i <= target; i++) {
      if (!next[MILESTONE_KEYS[i]]) next[MILESTONE_KEYS[i]] = today;
    }
    void persist(next, updates);
    if (!atCap) startAdd(key);
  }

  /** Unmark `key` and every later stage; their items fall back to "Sin hito". */
  function unreach(key: MilestoneKey) {
    const target = MILESTONE_KEYS.indexOf(key);
    const affected = new Set<MilestoneKey>();
    const next = { ...current };
    for (let i = target; i < MILESTONE_KEYS.length; i++) {
      if (next[MILESTONE_KEYS[i]]) {
        affected.add(MILESTONE_KEYS[i]);
        delete next[MILESTONE_KEYS[i]];
      }
    }
    const nextUpdates = updates.map((update) =>
      update.milestone && affected.has(update.milestone) ? untagged(update) : update,
    );
    setDraft(null);
    void persist(next, nextUpdates);
  }

  function setMilestoneDate(key: MilestoneKey, date: Date) {
    void persist({ ...current, [key]: toISODate(date) }, updates);
  }

  /** Move an unclassified item onto a milestone (which it also marks reached). */
  function assign(index: number, key: MilestoneKey) {
    const nextUpdates = updates.map((update, i) =>
      i === index ? { ...update, milestone: key } : update,
    );
    const next = { ...current };
    if (!next[key]) next[key] = toISODate(new Date());
    void persist(next, nextUpdates);
  }

  function startAdd(key: MilestoneKey) {
    setDraft({ index: null, milestone: key, message: "", at: new Date().toISOString(), flag: false });
  }

  function startEdit(index: number) {
    const update = updates[index];
    if (!update.milestone) return; // orphans are edited via reassignment only
    setDraft({
      index,
      milestone: update.milestone,
      message: update.message,
      at: update.at,
      flag: Boolean(update.flag),
    });
  }

  async function saveItem() {
    if (!draft) return;
    const message = draft.message.trim();
    if (!message) return;
    const entry: StatusUpdate = {
      at: draft.at,
      message,
      milestone: draft.milestone,
      ...(draft.flag ? { flag: true } : {}),
    };
    if (draft.index === null && atCap) return;
    const nextUpdates =
      draft.index === null
        ? [...updates, entry]
        : updates.map((update, i) => (i === draft.index ? entry : update));
    const next = { ...current };
    if (!next[draft.milestone]) next[draft.milestone] = toISODate(new Date());
    setDraft(null);
    await persist(next, nextUpdates);
  }

  function deleteItem(index: number) {
    void persist(current, updates.filter((_, i) => i !== index));
  }

  function itemForm() {
    if (!draft) return null;
    return (
      <div className="flex flex-col gap-2 rounded-lg border p-3">
        <Textarea
          autoFocus
          value={draft.message}
          onChange={(event) => setDraft((d) => (d ? { ...d, message: event.target.value } : d))}
          placeholder="Ej: 2da entrevista agendada para el viernes"
          className="min-h-[72px] text-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="datetime-local"
            value={toLocalInput(draft.at)}
            onChange={(event) => {
              const value = event.target.value;
              if (!value) return;
              const date = new Date(value);
              if (!Number.isNaN(date.getTime()))
                setDraft((d) => (d ? { ...d, at: date.toISOString() } : d));
            }}
            className="h-8 w-auto text-sm"
          />
          <label
            className="flex cursor-pointer items-center gap-2 text-sm select-none"
            title="Marcar como importante / por hacer"
          >
            <Switch
              checked={draft.flag}
              onCheckedChange={(checked) => setDraft((d) => (d ? { ...d, flag: checked } : d))}
            />
            <span>🚩 Por hacer</span>
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDraft(null)} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={saveItem} disabled={saving || draft.message.trim() === ""}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>
    );
  }

  function itemCard({ update, index }: { update: StatusUpdate; index: number }) {
    return (
      <Item
        variant="outline"
        size="sm"
        role="button"
        tabIndex={0}
        onClick={() => startEdit(index)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            startEdit(index);
          }
        }}
        className="cursor-pointer"
      >
        <ItemContent className="gap-1.5">
          <div className="flex items-start gap-2">
            <p className="flex-1 text-sm whitespace-pre-wrap">{update.message}</p>
            {update.flag && (
              <span className="text-sm leading-none" aria-label="Marcado">
                🚩
              </span>
            )}
            <button
              type="button"
              aria-label="Borrar anotación"
              title="Borrar"
              onClick={(event) => {
                event.stopPropagation();
                deleteItem(index);
              }}
              className="text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
          <Badge variant="outline" className="w-fit gap-1 font-normal">
            <Calendar className="size-3" />
            {formatWhen(update.at)}
          </Badge>
        </ItemContent>
      </Item>
    );
  }

  const nothingYet =
    Object.keys(current).length === 0 && updates.length === 0;

  return (
    <section className="flex flex-col gap-3">
      <span className="text-xs font-medium text-muted-foreground">Seguimiento del proceso</span>
      {nothingYet && (
        <p className="text-xs text-muted-foreground">
          Marcá el hito al que llegó la postulación y registrá qué pasó. Cada hito marca también los
          anteriores.
        </p>
      )}

      <ol className="flex flex-col">
        {MILESTONE_KEYS.map((key, idx) => {
          // Reached is cumulative: a later milestone implies every earlier one,
          // even if it was never marked explicitly (legacy rows, or the funnel's
          // monotonic rule) — so the stepper never shows a gap.
          const reached = idx <= tipIndex;
          const isTip = idx === tipIndex;
          const nextReached = idx < tipIndex;
          const items = itemsFor(key);
          const last = idx === MILESTONE_KEYS.length - 1;
          const adding = draft?.index === null && draft.milestone === key;
          return (
            <li key={key} className="flex gap-3">
              {/* Stepper gutter: stage dot + connector to the next stage. */}
              <div className="flex flex-col items-center pt-1">
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full ring-2 ring-background",
                    dotClass(reached, isTip, status),
                  )}
                >
                  {reached &&
                    (isTip && status === "Rechazado" ? (
                      <X className="size-2.5" />
                    ) : (
                      <Check className="size-2.5" />
                    ))}
                </span>
                {!last && (
                  <span className={cn("w-px flex-1", lineClass(reached, nextReached, status))} />
                )}
              </div>

              <div className={`min-w-0 flex-1 ${last ? "pb-1" : "pb-4"}`}>
                {/* Stage header: label + date/unmark when reached, else "Marcar". */}
                <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
                  <span className={`text-sm ${reached ? "font-medium" : "text-muted-foreground"}`}>
                    {MILESTONE_LABELS[key]}
                  </span>
                  {reached ? (
                    <div className="flex items-center gap-1">
                      <div className="w-32">
                        <DatePicker
                          value={new Date(`${current[key] ?? earliestDate}T00:00:00`)}
                          onChange={(date) => setMilestoneDate(key, date)}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        title="Desmarcar hito"
                        aria-label="Desmarcar hito"
                        disabled={saving}
                        onClick={() => unreach(key)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={saving}
                      onClick={() => reach(key)}
                    >
                      <Check className="size-4" />
                      Marcar
                    </Button>
                  )}
                </div>

                {reached && (
                  <div className="mt-2 flex flex-col gap-2">
                    {items.map(({ update, index }) =>
                      draft?.index === index ? (
                        <div key={index}>{itemForm()}</div>
                      ) : (
                        <div key={index}>{itemCard({ update, index })}</div>
                      ),
                    )}
                    {adding && itemForm()}
                    {!adding && items.length === 0 && (
                      <p className="text-xs text-amber-500">Agregá al menos una anotación.</p>
                    )}
                    {!adding &&
                      (atCap ? (
                        <p className="text-xs text-muted-foreground">
                          Tope de {MAX_UPDATES} anotaciones alcanzado.
                        </p>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="self-start text-muted-foreground"
                          onClick={() => startAdd(key)}
                        >
                          <Plus className="size-4" />
                          Agregar anotación
                        </Button>
                      ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Fin del proceso: closing the process sets the outcome (verde/rojo),
          which colors the stepper + the AARRR funnel. The stage where it ended
          is the furthest one reached above — a single outcome per application. */}
      {status !== "Borrador" && (
        <div className="flex flex-col gap-2 rounded-lg border p-3">
          <span className="text-xs font-medium text-muted-foreground">Fin del proceso</span>
          {closed ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn("border-transparent", statusBadgeClass(status))}>
                {status === "Aceptado" ? "Terminó bien" : "Terminó mal"}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                disabled={saving}
                onClick={() => onSetStatus("Activo")}
              >
                <RotateCcw className="size-4" />
                Reabrir
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-success hover:text-success"
                disabled={saving}
                onClick={() => onSetStatus("Aceptado")}
              >
                <CircleCheck className="size-4" />
                Terminó bien
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={saving}
                onClick={() => onSetStatus("Rechazado")}
              >
                <CircleX className="size-4" />
                Terminó mal
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Cerrar marca el estado de la aplicación y colorea la etapa donde terminó.
          </p>
        </div>
      )}

      {orphans.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
          <span className="text-xs font-medium text-muted-foreground">Sin hito</span>
          {orphans.map(({ update, index }) => (
            <div key={index} className="flex flex-col gap-1.5">
              <Item variant="outline" size="sm">
                <ItemContent className="gap-1.5">
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-sm whitespace-pre-wrap">{update.message}</p>
                    {update.flag && (
                      <span className="text-sm leading-none" aria-label="Marcado">
                        🚩
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label="Borrar anotación"
                      title="Borrar"
                      onClick={() => deleteItem(index)}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="w-fit gap-1 font-normal">
                      <Calendar className="size-3" />
                      {formatWhen(update.at)}
                    </Badge>
                    <div className="w-40">
                      <IconSelect
                        aria-label="Asignar hito"
                        value=""
                        onChange={(value) => value && assign(index, value as MilestoneKey)}
                        container={container}
                        options={[
                          { value: "", label: "Asignar hito…" },
                          ...MILESTONE_KEYS.map((key) => ({
                            value: key,
                            label: MILESTONE_LABELS[key],
                          })),
                        ]}
                      />
                    </div>
                  </div>
                </ItemContent>
              </Item>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Estos hitos alimentan el embudo AARRR (card Embudo). Un hito marca también los anteriores.
      </p>
    </section>
  );
}
