"use client";

import { useState } from "react";
import { Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { sanitizeBodies, type CoverLetterTemplate } from "@/core/coverLetter/types";
import { ConfirmDelete, toastDeleted } from "@/ui/ConfirmDelete";
import { PanelCard, PanelCardFace } from "@/ui/PanelCard";
import type { UseCoverLetterTemplates } from "@/ui/useCoverLetterTemplates";

function TemplateRow({
  template,
  onEdit,
  onRemove,
}: {
  template: CoverLetterTemplate;
  onEdit: (template: CoverLetterTemplate) => void;
  onRemove: (template: CoverLetterTemplate) => void;
}) {
  const languages = (["EN", "ES"] as const).filter((language) => template.bodies[language]);
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-medium">{template.name}</span>
        {languages.map((language) => (
          <Badge key={language} variant="secondary" className="shrink-0 font-mono text-[10px]">
            {language}
          </Badge>
        ))}
      </div>
      <div className="flex shrink-0 items-center">
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          title="Editar template"
          aria-label={`Editar ${template.name}`}
          onClick={() => onEdit(template)}
        >
          <Pencil className="size-3.5" />
        </Button>
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
  );
}

/** Drawer body: template list + create/edit form. */
function CoverLettersManager({ store }: { store: UseCoverLetterTemplates }) {
  const { templates, add, update, remove } = store;
  // null = creating; a template = editing it.
  const [editing, setEditing] = useState<CoverLetterTemplate | null>(null);
  const [name, setName] = useState("");
  const [bodyEN, setBodyEN] = useState("");
  const [bodyES, setBodyES] = useState("");
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<CoverLetterTemplate | null>(null);

  const bodies = sanitizeBodies({ EN: bodyEN, ES: bodyES });
  const canSave = name.trim() !== "" && Object.keys(bodies).length > 0;

  function startEdit(template: CoverLetterTemplate) {
    setEditing(template);
    setName(template.name);
    setBodyEN(template.bodies.EN ?? "");
    setBodyES(template.bodies.ES ?? "");
  }

  function resetForm() {
    setEditing(null);
    setName("");
    setBodyEN("");
    setBodyES("");
  }

  async function submit() {
    if (!canSave) return;
    setSaving(true);
    try {
      if (editing) {
        await update(editing.id, { name: name.trim(), bodies });
        toast.success(`Template ${name.trim()} actualizado.`);
      } else {
        await add({ name: name.trim(), bodies });
        toast.success(`Template ${name.trim()} creado.`);
      }
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el template.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {templates.length === 0 ? (
        <Empty className="py-4">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Mail />
            </EmptyMedia>
            <EmptyTitle>Sin templates</EmptyTitle>
            <EmptyDescription>
              Creá un template por tipo de aplicación (fintech, AI, conversion…) y usalo desde el
              wizard al generar un CV.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <TemplateRow
              key={template.id}
              template={template}
              onEdit={startEdit}
              onRemove={setToDelete}
            />
          ))}
        </div>
      )}

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
          if (editing?.id === toDelete.id) resetForm();
          setToDelete(null);
        }}
      />

      <div className="space-y-3 rounded-lg border p-3">
        <span className="text-xs font-medium text-muted-foreground">
          {editing ? `Editar template · ${editing.name}` : "Nuevo template"}
        </span>

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

        <p className="text-xs text-muted-foreground">
          Variables: <span className="font-mono">{"{company}"}</span>,{" "}
          <span className="font-mono">{"{role}"}</span> y{" "}
          <span className="font-mono">{"{who}"}</span> se completan solas en el wizard. Soporta{" "}
          <strong>**negrita**</strong>, <em>*cursiva*</em> y listas con “- ”. Con un solo cuerpo
          alcanza (el idioma que uses al aplicar).
        </p>

        <div className="flex justify-end gap-2">
          {editing && (
            <Button variant="ghost" size="sm" onClick={resetForm} disabled={saving}>
              Cancelar
            </Button>
          )}
          <Button size="sm" onClick={submit} disabled={!canSave || saving}>
            <Plus className="size-4" />
            {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear template"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Cover letter templates per application type. Compact card that opens the
 * manager (list + create/edit) in a drawer — the shared PanelCard pattern. The
 * store hook comes from the page so the wizard sees the same instance.
 */
export function CoverLettersCard({ store }: { store: UseCoverLetterTemplates }) {
  return (
    <PanelCard
      title="Cover letters"
      description="Templates por tipo de aplicación, con variables por empresa."
      card={(open) => (
        <PanelCardFace
          icon={Mail}
          title="Cover letters"
          description="Templates reutilizables por tipo de aplicación."
          onOpen={open}
        />
      )}
    >
      {() => <CoverLettersManager store={store} />}
    </PanelCard>
  );
}
