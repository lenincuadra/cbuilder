"use client";

import { useState } from "react";
import { Mail, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { sanitizeBodies, type CoverLetterTemplate } from "@/core/coverLetter/types";
import type { RegistryRow } from "@/core/registry/types";
import { ConfirmDelete, toastDeleted } from "@/ui/ConfirmDelete";
import { DrawerFormFooter } from "@/ui/DrawerFormFooter";
import { PanelCard, PanelCardFace } from "@/ui/PanelCard";
import type { UseCoverLetterTemplates } from "@/ui/useCoverLetterTemplates";

/** List ↔ form takeover views of the manager (docs/DESIGN.md → manager drawers). */
type ManagerView = { mode: "list" } | { mode: "form"; item: CoverLetterTemplate | null };

function LanguageBadges({ bodies }: { bodies: Partial<Record<"EN" | "ES", string>> }) {
  const languages = (["EN", "ES"] as const).filter((language) => bodies[language]);
  return (
    <>
      {languages.map((language) => (
        <Badge key={language} variant="secondary" className="shrink-0 font-mono text-[10px]">
          {language}
        </Badge>
      ))}
    </>
  );
}

function TemplateRow({
  template,
  onEdit,
  onRemove,
}: {
  template: CoverLetterTemplate;
  onEdit: (template: CoverLetterTemplate) => void;
  onRemove: (template: CoverLetterTemplate) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Editar ${template.name}`}
      onClick={() => onEdit(template)}
      onKeyDown={(event) => {
        // Only when the row itself is focused — inner buttons handle their own keys.
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onEdit(template);
        }
      }}
      className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors hover:bg-accent/40"
    >
      <span className="truncate text-sm font-medium">{template.name}</span>
      <div className="flex shrink-0 items-center gap-1">
        <Badge variant="outline" className="text-[10px]">
          Template
        </Badge>
        <LanguageBadges bodies={template.bodies} />
        <div onClick={(event) => event.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-destructive"
            title="Borrar template"
            aria-label={`Borrar ${template.name}`}
            onClick={() => onRemove(template)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * One row per application whose letter actually shipped — template-based or
 * "Generado con IA" alike. A faithful record, not editable here: click opens
 * that application's drawer (closes this one first).
 */
function SentLetterRow({ row, onOpen }: { row: RegistryRow; onOpen: () => void }) {
  const letter = row.coverLetter;
  if (!letter) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-accent/40"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{row.company}</span>
          <span className="shrink-0 font-mono text-xs text-muted-foreground">{row.code}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {letter.templateName ?? "Sin nombre"}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Badge variant="outline" className="text-[10px]">
          Enviada
        </Badge>
        <LanguageBadges bodies={letter.bodies} />
      </div>
    </button>
  );
}

/** Form takeover: create (template = null) or edit one template, then go back. */
function TemplateForm({
  template,
  store,
  onDone,
}: {
  template: CoverLetterTemplate | null;
  store: UseCoverLetterTemplates;
  onDone: () => void;
}) {
  const { add, update } = store;
  const [name, setName] = useState(template?.name ?? "");
  const [bodyEN, setBodyEN] = useState(template?.bodies.EN ?? "");
  const [bodyES, setBodyES] = useState(template?.bodies.ES ?? "");
  const [saving, setSaving] = useState(false);

  const bodies = sanitizeBodies({ EN: bodyEN, ES: bodyES });
  const canSave = name.trim() !== "" && Object.keys(bodies).length > 0;

  async function submit() {
    if (!canSave) return;
    setSaving(true);
    try {
      if (template) {
        await update(template.id, { name: name.trim(), bodies });
        toast.success(`Template ${name.trim()} actualizado.`);
      } else {
        await add({ name: name.trim(), bodies });
        toast.success(`Template ${name.trim()} creado.`);
      }
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el template.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DrawerBody className="gap-3">
        <span className="text-xs font-medium text-muted-foreground">
          {template ? `Editar template · ${template.name}` : "Nuevo template"}
        </span>

        <div className="flex flex-col gap-3 rounded-lg border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="cl-name">Nombre (tipo de aplicación)</Label>
            <Input
              id="cl-name"
              placeholder="Fintech / Payments"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cl-body-en">Cuerpo EN (markdown)</Label>
            <Textarea
              id="cl-body-en"
              placeholder={"Dear {who},\n\nI'm applying for the {role} role at {company}…"}
              value={bodyEN}
              rows={6}
              className="font-mono text-xs"
              onChange={(event) => setBodyEN(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cl-body-es">Cuerpo ES (markdown)</Label>
            <Textarea
              id="cl-body-es"
              placeholder={"Hola {who},\n\nMe postulo al rol de {role} en {company}…"}
              value={bodyES}
              rows={6}
              className="font-mono text-xs"
              onChange={(event) => setBodyES(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            Escribí <span className="font-mono">{"{company}"}</span>,{" "}
            <span className="font-mono">{"{role}"}</span> o{" "}
            <span className="font-mono">{"{who}"}</span> y el wizard los reemplaza con la
            empresa, el rol y el contacto de cada aplicación — ahí ves el texto final y podés
            editarlo antes de generar.
          </p>
          <p>
            El formato se aplica en el .docx generado:{" "}
            <span className="font-mono">**texto**</span> sale en negrita,{" "}
            <span className="font-mono">*texto*</span> en cursiva y las líneas que empiezan con{" "}
            <span className="font-mono">-&nbsp;</span> como lista de viñetas.
          </p>
          <p>Con un solo cuerpo alcanza (el idioma que uses al aplicar).</p>
        </div>
      </DrawerBody>

      <DrawerFormFooter
        onCancel={onDone}
        onSubmit={submit}
        canSubmit={canSave}
        saving={saving}
        submitLabel={template ? "Guardar cambios" : "Crear template"}
        savingLabel="Guardando…"
      />
    </>
  );
}

/**
 * Everything below the drawer header: ONE list of every cover letter — the
 * reusable templates first (click to edit, manager pattern) and then each
 * shipped letter, most recent first (faithful record; click opens its
 * application). "Template"/"Enviada" is metadata on each card, not a filter.
 * The create action stays pinned in the footer.
 */
function CoverLettersPanel({
  store,
  rows,
  onOpenRow,
}: {
  store: UseCoverLetterTemplates;
  rows: RegistryRow[];
  onOpenRow: (code: string) => void;
}) {
  const { templates, remove } = store;
  const [view, setView] = useState<ManagerView>({ mode: "list" });
  const [toDelete, setToDelete] = useState<CoverLetterTemplate | null>(null);

  const sent = rows
    .filter((row) => row.coverLetter)
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  if (view.mode === "form") {
    return (
      <TemplateForm template={view.item} store={store} onDone={() => setView({ mode: "list" })} />
    );
  }

  return (
    <>
      <DrawerBody>
        {templates.length === 0 && sent.length === 0 ? (
          <Empty className="py-4">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Mail />
              </EmptyMedia>
              <EmptyTitle>Sin cover letters</EmptyTitle>
              <EmptyDescription>
                Creá un template por tipo de aplicación (fintech, AI, conversion…) y usalo desde
                el wizard. Las cartas que envíes también van a aparecer acá.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-2">
            {templates.map((template) => (
              <TemplateRow
                key={template.id}
                template={template}
                onEdit={(item) => setView({ mode: "form", item })}
                onRemove={setToDelete}
              />
            ))}
            {sent.map((row) => (
              <SentLetterRow key={row.code} row={row} onOpen={() => onOpenRow(row.code)} />
            ))}
          </div>
        )}
      </DrawerBody>

      <DrawerFooter className="flex-row justify-end">
        <Button size="sm" onClick={() => setView({ mode: "form", item: null })}>
          <Plus className="size-4" />
          Crear template
        </Button>
      </DrawerFooter>

      <ConfirmDelete
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Borrar template"
        description={
          toDelete ? (
            <>
              Se va a borrar el template <strong>{toDelete.name}</strong>. Las cartas ya generadas
              con él no se tocan (quedan guardadas en cada aplicación).
            </>
          ) : null
        }
        onConfirm={async () => {
          if (!toDelete) return;
          await remove(toDelete.id);
          toastDeleted(`Template ${toDelete.name} borrado.`);
          setToDelete(null);
        }}
      />
    </>
  );
}

/**
 * Every cover letter in one place: reusable templates per application type
 * plus each letter that actually shipped (template-based or AI). Compact card
 * that opens the manager in a drawer — the shared PanelCard pattern. The
 * store hook comes from the page so the wizard sees the same instance;
 * `rows` + `onOpenRow` come from the page's registry so the shipped letters
 * always reflect it live.
 */
export interface CoverLettersCardProps {
  store: UseCoverLetterTemplates;
  rows: RegistryRow[];
  /** Opens an application's detail drawer (the page resets filters first). */
  onOpenRow: (code: string) => void;
}

export function CoverLettersCard({ store, rows, onOpenRow }: CoverLettersCardProps) {
  return (
    <PanelCard
      title="Cover letters"
      description="Templates por tipo de aplicación y el registro de cartas enviadas."
      card={(open) => (
        <PanelCardFace
          icon={Mail}
          title="Cover letters"
          description="Templates reutilizables + cartas enviadas."
          onOpen={open}
        />
      )}
    >
      {(close) => (
        <CoverLettersPanel
          store={store}
          rows={rows}
          onOpenRow={(code) => {
            close();
            onOpenRow(code);
          }}
        />
      )}
    </PanelCard>
  );
}
