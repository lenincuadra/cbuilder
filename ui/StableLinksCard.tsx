"use client";

import { useState } from "react";
import { Check, Copy, Link2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { PanelCard, PanelCardFace } from "@/ui/PanelCard";
import { useStableLinks } from "@/ui/useStableLinks";

/** Quick-add suggestions for the common permanent touchpoints. */
const SUGGESTIONS = [
  { name: "LinkedIn (perfil)", ref: "li-profile" },
  { name: "CV en la web", ref: "web-cv" },
  { name: "Behance", ref: "behance" },
];

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-6 shrink-0"
      title="Copiar link"
      aria-label="Copiar link"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        } catch {
          // clipboard unavailable — ignore
        }
      }}
    >
      {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
    </Button>
  );
}

function LinkRow({ link, onRemove }: { link: StableLink; onRemove: (link: StableLink) => void }) {
  const url = stableLinkUrl(link.ref);
  return (
    <div className="space-y-0.5 rounded-lg border px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{link.name}</span>
        <div className="flex shrink-0 items-center">
          <CopyButton url={url} />
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

/** Drawer body: the list of stable links + an add form. */
function StableLinksManager() {
  const { links, add, remove } = useStableLinks();
  const [name, setName] = useState("");
  const [ref, setRef] = useState("");
  const [saving, setSaving] = useState(false);
  // Delete goes through the app-wide confirm-then-toast pattern.
  const [toDelete, setToDelete] = useState<StableLink | null>(null);

  const refOk = isValidStableRef(ref.trim());
  const canAdd = name.trim() !== "" && refOk && !links.some((l) => l.ref === ref.trim());

  async function submit() {
    if (!canAdd) return;
    setSaving(true);
    try {
      await add({ name: name.trim(), ref: ref.trim() });
      setName("");
      setRef("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo agregar el link.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
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
            <LinkRow key={link.ref} link={link} onRemove={setToDelete} />
          ))}
        </div>
      )}

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

      <div className="space-y-3 rounded-lg border p-3">
        <span className="text-xs font-medium text-muted-foreground">Agregar link estable</span>

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
            aria-invalid={ref.trim() !== "" && !refOk}
          />
          <p className="font-mono text-xs break-all text-muted-foreground">
            {stableLinkUrl(ref.trim() === "" ? "…" : ref.trim())}
          </p>
        </div>

        <div className="flex justify-end">
          <Button size="sm" onClick={submit} disabled={!canAdd || saving}>
            <Plus className="size-4" />
            {saving ? "Agregando…" : "Agregar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Stable tracking links for permanent touchpoints (LinkedIn, Behance…), not tied
 * to an application. Compact card that opens the manager (view/copy + add) in a
 * drawer — the shared PanelCard pattern.
 */
export function StableLinksCard() {
  return (
    <PanelCard
      title="Links estables"
      description="Tracking de touchpoints permanentes (no atados a una aplicación)."
      card={(open) => (
        <PanelCardFace
          icon={Link2}
          title="Links estables"
          description="Links de perfiles fijos: LinkedIn, Behance, etc."
          onOpen={open}
        />
      )}
    >
      {() => <StableLinksManager />}
    </PanelCard>
  );
}
