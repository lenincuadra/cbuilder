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
import { Item, ItemContent } from "@/components/ui/item";
import { Textarea } from "@/components/ui/textarea";
import { MAX_UPDATES, type StatusUpdate } from "@/core/registry/types";

export interface UpdatesTabProps {
  updates: StatusUpdate[];
  onAdd: (message: string) => void | Promise<void>;
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

/** Updates tab: a follow-up timeline. Newest at the bottom; capped at MAX_UPDATES. */
export function UpdatesTab({ updates, onAdd }: UpdatesTabProps) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const ordered = [...updates].sort((a, b) => a.at.localeCompare(b.at));
  const atCap = updates.length >= MAX_UPDATES;

  async function submit() {
    const message = text.trim();
    if (!message) return;
    setSaving(true);
    try {
      await onAdd(message);
      setText("");
      setAdding(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {ordered.length === 0 && !adding ? (
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
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus className="size-4" />
              Agregar actualización
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-2">
          {ordered.map((update, index) => (
            <Item key={`${update.at}-${index}`} variant="outline" size="sm">
              <ItemContent className="gap-1.5">
                <p className="text-sm whitespace-pre-wrap">{update.message}</p>
                <Badge variant="outline" className="w-fit gap-1 font-normal">
                  <Calendar className="size-3" />
                  {formatWhen(update.at)}
                </Badge>
              </ItemContent>
            </Item>
          ))}
        </div>
      )}

      {adding ? (
        <div className="flex flex-col gap-2">
          <Textarea
            autoFocus
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder="Ej: 2da entrevista agendada para el viernes"
            className="min-h-[72px] text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAdding(false);
                setText("");
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={submit} disabled={saving || text.trim() === ""}>
              {saving ? "Guardando…" : "Agregar"}
            </Button>
          </div>
        </div>
      ) : ordered.length > 0 ? (
        atCap ? (
          <p className="text-xs text-muted-foreground">
            Tope de {MAX_UPDATES} actualizaciones alcanzado.
          </p>
        ) : (
          <Button variant="outline" size="sm" className="self-start" onClick={() => setAdding(true)}>
            <Plus className="size-4" />
            Agregar actualización
          </Button>
        )
      ) : null}
    </div>
  );
}
