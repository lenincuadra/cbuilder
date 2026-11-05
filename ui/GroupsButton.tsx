"use client";

import { useState } from "react";
import { Folders, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DrawerBody, DrawerFooter } from "@/components/ui/drawer";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateShort } from "@/core/dates";
import { groupNames, groupOf } from "@/core/registry/groups";
import { displayName, type EditableFields, type RegistryRow } from "@/core/registry/types";
import { ConfirmDelete, toastDeleted } from "@/ui/ConfirmDelete";
import { DrawerFormFooter } from "@/ui/DrawerFormFooter";
import { PanelCard } from "@/ui/PanelCard";

/** One row-level change of a batch save. */
export type RowChange = { code: string; fields: EditableFields };

/** List ↔ form takeover views of the manager (docs/DESIGN.md → manager drawers). */
type ManagerView = { mode: "list" } | { mode: "form"; group: string | null };

function sameName(a: string, b: string): boolean {
  return a.localeCompare(b, "es", { sensitivity: "base" }) === 0;
}

/**
 * Form takeover: create a group (group = null) or edit one — name + which rows
 * belong to it. Rows are listed by table order; archived ones are left out (they
 * keep their group, and renaming carries them along). A row in another group
 * shows it, and checking it moves it here (one group per row).
 */
function GroupForm({
  group,
  rows,
  onSave,
  onDone,
}: {
  group: string | null;
  rows: RegistryRow[];
  onSave: (changes: RowChange[]) => Promise<void>;
  onDone: () => void;
}) {
  const live = rows.filter((row) => !row.archived);
  const [name, setName] = useState(group ?? "");
  const [members, setMembers] = useState<Set<string>>(
    () =>
      new Set(
        live.filter((row) => group !== null && groupOf(row) === group).map((row) => row.code),
      ),
  );
  const [saving, setSaving] = useState(false);

  const trimmed = name.trim();
  // Collides with any other existing group (merging two groups by renaming is not a thing).
  const taken = groupNames(rows).some(
    (existing) => sameName(existing, trimmed) && existing !== group,
  );
  const canSave = trimmed !== "" && !taken && members.size > 0;

  function toggle(code: string, checked: boolean) {
    setMembers((current) => {
      const next = new Set(current);
      if (checked) next.add(code);
      else next.delete(code);
      return next;
    });
  }

  async function submit() {
    if (!canSave) return;
    const changes: RowChange[] = [];
    for (const row of rows) {
      const current = groupOf(row);
      const wasMember = group !== null && current === group;
      let next = current;
      if (row.archived) {
        // Archived rows aren't listed: they only follow a rename.
        if (wasMember) next = trimmed;
      } else if (members.has(row.code)) {
        next = trimmed;
      } else if (wasMember) {
        next = "";
      }
      if (next !== current) changes.push({ code: row.code, fields: { group: next || undefined } });
    }
    setSaving(true);
    try {
      await onSave(changes);
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el grupo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DrawerBody className="gap-3">
        <span className="text-xs font-medium text-muted-foreground">
          {group ? `Editar grupo · ${group}` : "Nuevo grupo"}
        </span>

        <div className="space-y-1.5">
          <Label htmlFor="group-name">Nombre</Label>
          <Input
            id="group-name"
            placeholder="Espero respuesta"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={taken}
          />
          {taken && <p className="text-xs text-destructive">Ya existe un grupo con ese nombre.</p>}
        </div>

        <div className="space-y-1.5">
          <Label>
            Búsquedas{" "}
            <span className="font-normal text-muted-foreground tabular-nums">({members.size})</span>
          </Label>
          {live.length === 0 ? (
            <p className="text-xs text-muted-foreground">No hay búsquedas vigentes.</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {live.map((row) => {
                const other = groupOf(row);
                const checkboxId = `group-row-${row.code}`;
                return (
                  <label
                    key={row.code}
                    htmlFor={checkboxId}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-accent/40"
                  >
                    <Checkbox
                      id={checkboxId}
                      checked={members.has(row.code)}
                      onCheckedChange={(checked) => toggle(row.code, checked)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{displayName(row)}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {row.role} · {formatDateShort(row.date)}
                      </span>
                    </span>
                    {other !== "" && other !== group && (
                      <span
                        className="max-w-[40%] shrink-0 truncate text-xs text-muted-foreground"
                        title={other}
                      >
                        {other}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Cada búsqueda está en un solo grupo: marcar una que ya tiene otro la mueve acá.
          </p>
        </div>
      </DrawerBody>

      <DrawerFormFooter
        onCancel={onDone}
        onSubmit={submit}
        canSubmit={canSave}
        saving={saving}
        submitLabel={group ? "Guardar cambios" : "Crear grupo"}
        savingLabel="Guardando…"
      />
    </>
  );
}

/** Manager: existing groups (click to edit, trash to ungroup) + "Nuevo grupo" pinned in the footer. */
function GroupsManager({
  rows,
  onSave,
}: {
  rows: RegistryRow[];
  onSave: (changes: RowChange[]) => Promise<void>;
}) {
  const [view, setView] = useState<ManagerView>({ mode: "list" });
  const [toDelete, setToDelete] = useState<string | null>(null);
  const groups = groupNames(rows);

  if (view.mode === "form") {
    return (
      <GroupForm
        group={view.group}
        rows={rows}
        onSave={onSave}
        onDone={() => setView({ mode: "list" })}
      />
    );
  }

  return (
    <>
      <DrawerBody>
        {groups.length === 0 ? (
          <Empty className="py-4">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Folders />
              </EmptyMedia>
              <EmptyTitle>Sin grupos</EmptyTitle>
              <EmptyDescription>
                Agrupá búsquedas (ej. &quot;Espero respuesta&quot;, &quot;Fintech&quot;) para verlas
                juntas en la tabla y colapsarlas.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-2">
            {groups.map((group) => {
              const inGroup = rows.filter((row) => groupOf(row) === group);
              const archived = inGroup.filter((row) => row.archived).length;
              return (
                <div
                  key={group}
                  role="button"
                  tabIndex={0}
                  aria-label={`Editar ${group}`}
                  onClick={() => setView({ mode: "form", group })}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setView({ mode: "form", group });
                    }
                  }}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors hover:bg-accent/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{group}</span>
                    <span className="block text-xs text-muted-foreground tabular-nums">
                      {inGroup.length - archived} vigentes
                      {archived > 0 && ` · ${archived} archivadas`}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
                    title="Quitar grupo"
                    aria-label={`Quitar ${group}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setToDelete(group);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </DrawerBody>

      <DrawerFooter className="flex-row justify-end">
        <Button size="sm" onClick={() => setView({ mode: "form", group: null })}>
          <Plus className="size-4" />
          Nuevo grupo
        </Button>
      </DrawerFooter>

      <ConfirmDelete
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Quitar grupo"
        description={
          toDelete ? (
            <>
              Se quita el grupo <strong>{toDelete}</strong>. Sus búsquedas no se borran: pasan a
              &quot;Sin grupo&quot;.
            </>
          ) : null
        }
        confirmLabel="Quitar"
        onConfirm={async () => {
          if (!toDelete) return;
          await onSave(
            rows
              .filter((row) => groupOf(row) === toDelete)
              .map((row) => ({ code: row.code, fields: { group: undefined } })),
          );
          toastDeleted(`Grupo ${toDelete} quitado.`);
          setToDelete(null);
        }}
      />
    </>
  );
}

/**
 * Toolbar entry to the groups manager (where the old Vigentes/Archivado toggle
 * was): a button that opens the shared PanelCard drawer — right on desktop,
 * bottom on mobile — with the list ↔ form manager inside.
 */
export function GroupsButton({
  rows,
  onSave,
}: {
  /** All registry rows (unfiltered). */
  rows: RegistryRow[];
  onSave: (changes: RowChange[]) => Promise<void>;
}) {
  const count = groupNames(rows).length;
  return (
    <PanelCard
      title="Grupos"
      description="Secciones de la tabla. Cada búsqueda está en un solo grupo."
      card={(open) => (
        <Button variant="outline" size="sm" onClick={open}>
          <Folders className="size-4" />
          Grupos
          {count > 0 && <span className="text-muted-foreground tabular-nums">({count})</span>}
        </Button>
      )}
    >
      {() => <GroupsManager rows={rows} onSave={onSave} />}
    </PanelCard>
  );
}
