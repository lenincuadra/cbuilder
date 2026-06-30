"use client";

import { useState } from "react";
import { Calendar, FileChartLine, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Item, ItemContent } from "@/components/ui/item";
import { Textarea } from "@/components/ui/textarea";
import { MAX_UPDATES, type StatusUpdate } from "@/core/registry/types";
import { cn } from "@/lib/utils";

export interface UpdatesTabProps {
  updates: StatusUpdate[];
  /** Persist the full (re-sorted) updates list. */
  onSave: (updates: StatusUpdate[]) => void | Promise<void>;
}

interface Draft {
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

function sortByAt(list: StatusUpdate[]): StatusUpdate[] {
  return [...list].sort((a, b) => a.at.localeCompare(b.at));
}

/** Updates timeline. Newest at the bottom, capped at MAX_UPDATES. Each item is
 *  editable (texto, fecha, flag). The 🚩 flag marks something to do / important. */
export function UpdatesTab({ updates, onSave }: UpdatesTabProps) {
  const ordered = sortByAt(updates);
  // null = idle; -1 = adding new; >=0 = editing that index of `ordered`.
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>({ message: "", at: "", flag: false });
  const [saving, setSaving] = useState(false);

  const atCap = updates.length >= MAX_UPDATES;
  const formOpen = editing !== null;

  function startAdd() {
    setDraft({ message: "", at: new Date().toISOString(), flag: false });
    setEditing(-1);
  }

  function startEdit(index: number) {
    const update = ordered[index];
    setDraft({ message: update.message, at: update.at, flag: Boolean(update.flag) });
    setEditing(index);
  }

  async function save() {
    const message = draft.message.trim();
    if (!message) return;
    const entry: StatusUpdate = { at: draft.at, message, ...(draft.flag ? { flag: true } : {}) };
    const next =
      editing === -1 ? [...ordered, entry] : ordered.map((u, i) => (i === editing ? entry : u));
    setSaving(true);
    try {
      await onSave(sortByAt(next));
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  function form() {
    return (
      <div className="flex flex-col gap-2 rounded-lg border p-3">
        <Textarea
          autoFocus
          value={draft.message}
          onChange={(event) => setDraft((d) => ({ ...d, message: event.target.value }))}
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
              if (!Number.isNaN(date.getTime())) setDraft((d) => ({ ...d, at: date.toISOString() }));
            }}
            className="h-8 w-auto text-sm"
          />
          <Button
            type="button"
            variant={draft.flag ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={draft.flag}
            title="Marcar como importante / por hacer"
            onClick={() => setDraft((d) => ({ ...d, flag: !d.flag }))}
            className={cn("text-base", !draft.flag && "opacity-40 grayscale")}
          >
            🚩
          </Button>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setEditing(null)} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={save} disabled={saving || draft.message.trim() === ""}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {ordered.length === 0 && editing !== -1 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileChartLine />
            </EmptyMedia>
            <EmptyTitle>Sin actualizaciones</EmptyTitle>
            <EmptyDescription>
              Registrá el avance de esta postulación (entrevistas, feedback, etc.).
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={startAdd}>
              <Plus className="size-4" />
              Agregar actualización
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-2">
          {ordered.map((update, index) =>
            editing === index ? (
              <div key={`edit-${index}`}>{form()}</div>
            ) : (
              <Item
                key={`${update.at}-${index}`}
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
                  </div>
                  <Badge variant="outline" className="w-fit gap-1 font-normal">
                    <Calendar className="size-3" />
                    {formatWhen(update.at)}
                  </Badge>
                </ItemContent>
              </Item>
            ),
          )}
        </div>
      )}

      {editing === -1 ? (
        form()
      ) : !formOpen && ordered.length > 0 ? (
        atCap ? (
          <p className="text-xs text-muted-foreground">
            Tope de {MAX_UPDATES} actualizaciones alcanzado.
          </p>
        ) : (
          <Button variant="outline" size="sm" className="self-start" onClick={startAdd}>
            <Plus className="size-4" />
            Agregar actualización
          </Button>
        )
      ) : null}
    </div>
  );
}
