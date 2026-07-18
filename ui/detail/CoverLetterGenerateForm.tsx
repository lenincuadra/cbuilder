"use client";

import { useState } from "react";
import { toast } from "sonner";

import { DrawerBody } from "@/components/ui/drawer";
import { requestAiDraft } from "@/core/coverLetter/ai";
import { buildCoverLetterEntries, packageCoverLetters } from "@/core/coverLetter/deliver";
import { COVER_LETTER_FILENAME } from "@/core/coverLetter/docx";
import {
  AI_TEMPLATE_NAME,
  COVER_LETTER_AI,
  type CoverLetterBodies,
  type CoverLetterTemplate,
} from "@/core/coverLetter/types";
import { slugifyCompany } from "@/core/folderName";
import type { EditableFields, RegistryRow } from "@/core/registry/types";
import { languagesFor } from "@/core/types";
import { archiveDeliveryFiles, DOCX_MIME, type DeliveryFile } from "@/lib/archive";
import { downloadBytes } from "@/lib/download";
import { COVER_LETTER_DOC_NAME, createGoogleDoc } from "@/lib/gdocs";
import { CoverLetterFields } from "@/ui/CoverLetterFields";
import { DrawerFormFooter } from "@/ui/DrawerFormFooter";
import { useAiModel } from "@/ui/useAiModel";

export interface CoverLetterGenerateFormProps {
  row: RegistryRow;
  templates: CoverLetterTemplate[];
  onUpdate: (code: string, fields: EditableFields) => void | Promise<void>;
  onDone: () => void;
  container?: HTMLElement | null;
}

/**
 * "Generar cover letter" takeover of the row detail drawer (same slot as
 * RowEditForm/ScreeningNewForm): for an application whose CV already
 * shipped, replicates the wizard's cover-letter step (template or "Compartir
 * contexto" with IA) via the shared `CoverLetterFields`, then actually builds
 * and delivers the .docx to the same three destinations as a wizard
 * generation — download, durable archive, and the Drive sink (native Google
 * Doc in the application's folder, feature-off silent).
 */
export function CoverLetterGenerateForm({
  row,
  templates,
  onUpdate,
  onDone,
  container,
}: CoverLetterGenerateFormProps) {
  const [templateId, setTemplateId] = useState("");
  const [bodies, setBodies] = useState<CoverLetterBodies>({});
  const [jobUrl, setJobUrl] = useState(row.jobUrl ?? "");
  const [jobContext, setJobContext] = useState(row.jobContext ?? "");
  const [model, setModel] = useAiModel("cover-letter");
  const [generating, setGenerating] = useState(false);
  const [delivering, setDelivering] = useState(false);

  const isAiMode = templateId === COVER_LETTER_AI;
  const canSubmit = Object.values(bodies).some((body) => body?.trim());

  async function generateWithAi() {
    if (!isAiMode) return;
    setGenerating(true);
    try {
      const drafted = await requestAiDraft(
        { company: row.company, role: row.role, who: row.who, focus: row.focus, jobContext },
        languagesFor(row.language ?? "EN"),
        model,
      );
      setBodies((current) => ({ ...current, ...drafted }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar el borrador.");
    } finally {
      setGenerating(false);
    }
  }

  async function submit() {
    if (!canSubmit) return;
    setDelivering(true);
    try {
      const entries = await buildCoverLetterEntries(
        { code: row.code, company: row.company, language: row.language ?? "EN" },
        bodies,
        new Date(),
      );
      if (entries.length === 0) {
        toast.error("No hay contenido para entregar.");
        return;
      }

      if (entries.length === 1) {
        downloadBytes(entries[0].bytes, COVER_LETTER_FILENAME, DOCX_MIME);
      } else {
        const zip = await packageCoverLetters(entries);
        downloadBytes(zip, `${slugifyCompany(row.company)}_${row.code}_carta.zip`, "application/zip");
      }

      const deliveryFiles: DeliveryFile[] = entries.map((entry) => ({
        path: `${entry.folder}/${COVER_LETTER_FILENAME}`,
        bytes: entry.bytes,
      }));
      const archived = await archiveDeliveryFiles(deliveryFiles);

      // Drive sink: the letter joins the CV's application folder as a native
      // Google Doc. Feature-off (501 → null) is silent; a real failure warns
      // without undoing the download/archive above.
      const driveLetterDocs: NonNullable<RegistryRow["driveLetterDocs"]> = {};
      let driveFolder: string | undefined;
      const appFolder = `${slugifyCompany(row.company)}_${row.code}`;
      for (const entry of entries) {
        try {
          const doc = await createGoogleDoc(
            appFolder,
            entry.language,
            entry.bytes,
            COVER_LETTER_DOC_NAME,
          );
          if (doc) {
            driveLetterDocs[entry.language] = doc.docUrl;
            driveFolder = doc.folderUrl ?? driveFolder;
          }
        } catch {
          toast.warning("La carta se entregó, pero no se pudo subir a Google Drive.");
        }
      }

      const templateName = isAiMode
        ? AI_TEMPLATE_NAME
        : templates.find((template) => template.id === templateId)?.name;

      await onUpdate(row.code, {
        coverLetter: { templateId, templateName, bodies },
        // Read-modify-write: append/merge, never replace — the CV's own
        // archived files and Doc links must survive this update.
        deliveryFiles: archived
          ? [...(row.deliveryFiles ?? []), ...deliveryFiles.map((file) => file.path)]
          : row.deliveryFiles,
        driveLetterDocs:
          Object.keys(driveLetterDocs).length > 0
            ? { ...row.driveLetterDocs, ...driveLetterDocs }
            : row.driveLetterDocs,
        driveFolder: row.driveFolder ?? driveFolder,
        jobUrl,
        jobContext,
      });

      toast.success("Cover letter generada y descargada.");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar la cover letter.");
    } finally {
      setDelivering(false);
    }
  }

  return (
    <>
      <DrawerBody className="gap-3">
        <span className="text-xs font-medium text-muted-foreground">Generar cover letter</span>

        <CoverLetterFields
          templates={templates}
          templateId={templateId}
          onTemplateIdChange={(id, resolvedBodies) => {
            setTemplateId(id);
            setBodies(resolvedBodies);
          }}
          bodies={bodies}
          onBodiesChange={setBodies}
          language={row.language ?? "EN"}
          company={row.company}
          role={row.role}
          who={row.who}
          jobUrl={jobUrl}
          onJobUrlChange={setJobUrl}
          jobContext={jobContext}
          onJobContextChange={setJobContext}
          model={model}
          onModelChange={setModel}
          generating={generating}
          onGenerateWithAi={generateWithAi}
          container={container}
          idPrefix="clg"
        />

        <p className="text-xs text-muted-foreground">
          Al generar se descarga el .docx (letterhead como el CV), queda archivado junto al CV
          de esta aplicación y se sube a tu Drive como Google Doc — todo visible en Entrega.
        </p>
      </DrawerBody>

      <DrawerFormFooter
        onCancel={onDone}
        onSubmit={submit}
        canSubmit={canSubmit}
        saving={delivering}
        submitLabel="Generar y entregar"
        savingLabel="Generando…"
      />
    </>
  );
}
