"use client";

import { useState } from "react";
import { Link2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { isValidStableRef, stableLinkUrl, type StableLink } from "@/core/stableLinks/types";
import { ConfirmDelete, toastDeleted } from "@/ui/ConfirmDelete";
import { CopyButton } from "@/ui/CopyButton";
import { DrawerFormFooter } from "@/ui/DrawerFormFooter";
import { PanelCard, PanelCardFace } from "@/ui/PanelCard";
import { useSpec } from "@/ui/useSpec";
import { useStableLinks, type UseStableLinks } from "@/ui/useStableLinks";

/** List ↔ form takeover views of the manager (docs/DESIGN.md → manager drawers). */
type ManagerView = { mode: "list" } | { mode: "form"; item: StableLink | null };

/** Quick-add suggestions for the common permanent touchpoints. */
const SUGGESTIONS = [
  { name: "Firma EN", ref: "sig-en" },
  { name: "Firma ES", ref: "sig-es" },
  { name: "LinkedIn (perfil)", ref: "li-profile" },
  { name: "CV en la web", ref: "web-cv" },
  { name: "Behance", ref: "behance" },
];

function LinkRow({
  link,
  base,
  onEdit,
  onRemove,
}: {
  link: StableLink;
  base: string;
  onEdit: (link: StableLink) => void;
  onRemove: (link: StableLink) => void;
}) {
  const url = stableLinkUrl(base, link.ref);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Editar ${link.name}`}
      onClick={() => onEdit(link)}
      onKeyDown={(event) => {
        // Only when the row itself is focused — inner buttons handle their own keys.
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onEdit(link);
        }
      }}
      className="cursor-pointer space-y-0.5 rounded-lg border px-3 py-2 transition-colors hover:bg-accent/40"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{link.name}</span>
        <div className="flex shrink-0 items-center" onClick={(event) => event.stopPropagation()}>
          <CopyButton text={url} title="Copiar link" />
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-destructive"
            title="Quitar del registro"
            aria-label={`Quitar ${link.name}`}
            onClick={() => onRemove(link)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
      <span className="block font-mono text-xs break-all text-muted-foreground select-all">
        {url}
      </span>
    </div>
  );
}

/** Form takeover: add a link (link = null, with quick-add chips) or edit one, then go back. */
function LinkForm({
  link,
  store,
  base,
  onDone,
}: {
  link: StableLink | null;
  store: UseStableLinks;
  base: string;
  onDone: () => void;
}) {
  const { links, add, update } = store;
  const [name, setName] = useState(link?.name ?? "");
  const [ref, setRef] = useState(link?.ref ?? "");
  const [saving, setSaving] = useState(false);

  const refOk = isValidStableRef(ref.trim());
  // A ref collides against every link except the one being edited.
  const refTaken = links.some((existing) => existing.ref === ref.trim() && existing.ref !== link?.ref);
  const canSave = name.trim() !== "" && refOk && !refTaken;

  async function submit() {
    if (!canSave) return;
    setSaving(true);
    try {
      if (link) {
        await update(link.ref, { name: name.trim(), ref: ref.trim() });
      } else {
        await add({ name: name.trim(), ref: ref.trim() });
      }
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el link.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DrawerBody className="gap-3">
        <span className="text-xs font-medium text-muted-foreground">
          {link ? `Editar link · ${link.name}` : "Agregar link estable"}
        </span>

        {!link && (
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.filter((s) => !links.some((l) => l.ref === s.ref)).map((s) => (
              <Button
                key={s.ref}
                type="button"
                variant="outline"
                size="sm"
                className="h-7"
                onClick={() => {
                  setName(s.name);
                  setRef(s.ref);
                }}
              >
                <Plus className="size-3.5" />
                {s.name}
              </Button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-lg border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="sl-name">Nombre</Label>
            <Input
              id="sl-name"
              placeholder="Behance"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sl-ref">Ref (código de tracking)</Label>
            <Input
              id="sl-ref"
              placeholder="behance"
              value={ref}
              onChange={(event) => setRef(event.target.value)}
              aria-invalid={ref.trim() !== "" && (!refOk || refTaken)}
            />
            <p className="font-mono text-xs break-all text-muted-foreground">
              {stableLinkUrl(base, ref.trim() === "" ? "…" : ref.trim())}
            </p>
          </div>
        </div>

        {link && (
          <p className="text-xs text-muted-foreground">
            Cambiar el ref solo afecta este registro: los links que ya pegaste afuera siguen
            trackeando con el ref viejo.
          </p>
        )}
      </DrawerBody>

      <DrawerFormFooter
        onCancel={onDone}
        onSubmit={submit}
        canSubmit={canSave}
        saving={saving}
        submitLabel={link ? "Guardar cambios" : "Agregar"}
        savingLabel={link ? "Guardando…" : "Agregando…"}
      />
    </>
  );
}

/** Manager: the saved links (click one to edit) with the add action pinned in the footer. */
function StableLinksManager({ store }: { store: UseStableLinks }) {
  const { links, remove } = store;
  const { spec } = useSpec();
  const base = spec?.base ?? "";
  const [view, setView] = useState<ManagerView>({ mode: "list" });
  // Delete goes through the app-wide confirm-then-toast pattern.
  const [toDelete, setToDelete] = useState<StableLink | null>(null);

  if (view.mode === "form") {
    return (
      <LinkForm link={view.item} store={store} base={base} onDone={() => setView({ mode: "list" })} />
    );
  }

  return (
    <>
      <DrawerBody>
        {links.length === 0 ? (
          <Empty className="py-4">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Link2 />
              </EmptyMedia>
              <EmptyTitle>Sin links estables</EmptyTitle>
              <EmptyDescription>
                Agregá los touchpoints permanentes (LinkedIn, Behance, etc.) para copiarlos.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-2">
            {links.map((link) => (
              <LinkRow
                key={link.ref}
                link={link}
                base={base}
                onEdit={(item) => setView({ mode: "form", item })}
                onRemove={setToDelete}
              />
            ))}
          </div>
        )}
      </DrawerBody>

      <DrawerFooter className="flex-row justify-end">
        <Button size="sm" onClick={() => setView({ mode: "form", item: null })}>
          <Plus className="size-4" />
          Agregar link
        </Button>
      </DrawerFooter>

      <ConfirmDelete
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Quitar link estable"
        description={
          toDelete ? (
            <>
              Se va a quitar <strong>{toDelete.name}</strong> (
              <span className="font-mono">{toDelete.ref}</span>) del registro. El link seguirá
              trackeando si ya lo pegaste en algún lado; esto solo lo borra de acá.
            </>
          ) : null
        }
        confirmLabel="Quitar"
        onConfirm={async () => {
          if (!toDelete) return;
          await remove(toDelete.ref);
          toastDeleted(`Link estable ${toDelete.name} quitado.`);
          setToDelete(null);
        }}
      />
    </>
  );
}

/**
 * Stable tracking links for permanent touchpoints (LinkedIn, Behance…), not tied
 * to an application. Compact card that opens the manager (view/copy + add/edit)
 * in a drawer — the shared PanelCard pattern.
 */
export function StableLinksCard() {
  const store = useStableLinks();
  return (
    <PanelCard
      title="Links estables"
      description="Tracking de touchpoints permanentes (no atados a una aplicación)."
      card={(open) => (
        <PanelCardFace
          icon={Link2}
          title="Links estables"
          description="Links de perfiles fijos: LinkedIn, Behance, etc."
          count={store.links.length}
          onOpen={open}
        />
      )}
    >
      {() => <StableLinksManager store={store} />}
    </PanelCard>
  );
}
