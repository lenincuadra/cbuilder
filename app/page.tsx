"use client";

import { useState } from "react";
import { toast } from "sonner";

import { COVER_LETTER_FILENAME } from "@/core/coverLetter/docx";
import type { CoverLetterBodies } from "@/core/coverLetter/types";
import {
  buildPendingRow,
  deferredGenerationFields,
  generateCv,
  type GenerateCvInput,
  type PendingRowInput,
} from "@/core/generateCv";
import type { EditableFields, RegistryRow } from "@/core/registry/types";
import { CV_FILENAME } from "@/core/zip";
import { archiveDeliveryFiles, revealDelivery, type DeliveryFile } from "@/lib/archive";
import { downloadBytes } from "@/lib/download";
import { createGoogleDoc } from "@/lib/gdocs";
import { loadMaster } from "@/lib/masters";
import { toastDeleted } from "@/ui/ConfirmDelete";
import { AppVersion } from "@/ui/AppVersion";
import { CoverLettersCard } from "@/ui/CoverLettersCard";
import { ExportButton } from "@/ui/ExportButton";
import { GenerateCard } from "@/ui/GenerateCard";
import { GeneralNotesCard } from "@/ui/GeneralNotesCard";
import { PendingCvDrawer } from "@/ui/PendingCvDrawer";
import { ScreeningCard } from "@/ui/ScreeningCard";
import { StableLinksCard } from "@/ui/StableLinksCard";
import { RegistryTable } from "@/ui/RegistryTable";
import { SegmentedControl, type SegmentedOption } from "@/ui/SegmentedControl";
import { StatusFilterDropdown, type StatusFilter } from "@/ui/StatusFilterDropdown";
import { useCoverLetterTemplates } from "@/ui/useCoverLetterTemplates";
import { useRegistry } from "@/ui/useRegistry";
import { useScreening } from "@/ui/useScreening";
import { useSpec } from "@/ui/useSpec";
import type { WizardData } from "@/ui/wizard/types";

type ArchiveView = "vigentes" | "archivado";

export default function Home() {
  const { rows, loading, add, update, remove } = useRegistry();
  const { spec } = useSpec();
  // One shared instance: the manager card edits it, the wizard reads it — in sync.
  const coverLetters = useCoverLetterTemplates();
  // Same discipline for the questions bank: the card and the drawer tab share it.
  const screening = useScreening();
  const [generating, setGenerating] = useState(false);
  // Two orthogonal filters: archived-or-not (view) and status.
  const [view, setView] = useState<ArchiveView>("vigentes");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  // External "open this row's detail panel" request (generation toast CTA).
  const [openRequest, setOpenRequest] = useState<{ code: string; nonce: number } | null>(null);
  // Pending row whose deferred-generation wizard is open ("Generar CV" in the detail).
  const [pendingTarget, setPendingTarget] = useState<RegistryRow | null>(null);

  const existingCodes = rows.map((row) => row.code);

  const matchesStatus = (row: RegistryRow) =>
    statusFilter === "todos" || row.status === statusFilter;
  const vigentes = rows.filter((row) => !row.archived);
  const archivados = rows.filter((row) => row.archived);
  const bucket = view === "archivado" ? archivados : vigentes;
  const visibleRows = bucket.filter(matchesStatus);

  // Counts reflect the current status filter, so a toggle shows what you'd see.
  const viewOptions: SegmentedOption<ArchiveView>[] = [
    {
      value: "vigentes",
      label: (
        <>
          Vigentes{" "}
          <span className="text-muted-foreground tabular-nums">
            ({vigentes.filter(matchesStatus).length})
          </span>
        </>
      ),
    },
    {
      value: "archivado",
      label: (
        <>
          Archivado{" "}
          <span className="text-muted-foreground tabular-nums">
            ({archivados.filter(matchesStatus).length})
          </span>
        </>
      ),
    },
  ];
  async function handleUpdate(code: string, fields: EditableFields) {
    try {
      await update(code, fields);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la fila.");
    }
  }

  async function handleDelete(code: string) {
    try {
      await remove(code);
      toastDeleted(`Registro ${code} borrado.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo borrar la fila.");
    }
  }

  /** Open a freshly generated row's panel: reset filters so the row is visible. */
  function openGeneratedRow(code: string) {
    setView("vigentes");
    setStatusFilter("todos");
    setOpenRequest({ code, nonce: Date.now() });
  }

  /**
   * Register a process without generating a CV (wizard's "Guardar sin CV"):
   * the code is reserved now, the CV can be generated later from the row's
   * detail panel. Throws on error so the wizard stays open with the message.
   */
  async function handleSavePending(input: PendingRowInput) {
    if (!spec) {
      toast.error("No se pudo leer el link-spec del portfolio. Revisá la conexión.");
      throw new Error("link-spec unavailable");
    }
    try {
      const row = buildPendingRow(input, { spec, existingCodes });
      await add(row);
      toast.success(`Proceso registrado · código ${row.code}`, {
        duration: 10000,
        description: "Generá el CV cuando haga falta desde el detalle de la fila.",
        action: { label: "Detalles", onClick: () => openGeneratedRow(row.code) },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar el proceso.");
      throw error;
    }
  }

  /**
   * Persist a cover letter AI draft (wizard step 4) immediately — a paid
   * generation call is never lost to a closed wizard. First call this wizard
   * session creates a Borrador row (same shape as "Guardar sin CV", reserved
   * code, cvPending); later calls just patch the existing one. Returns the
   * row so the wizard can track it for the rest of the session.
   */
  async function handleSaveCoverLetterDraft(
    data: WizardData,
    activeRow: RegistryRow | null,
    draft: { templateId: string; templateName?: string; bodies: CoverLetterBodies },
  ): Promise<RegistryRow> {
    if (activeRow) {
      await update(activeRow.code, { coverLetterDraft: draft });
      return { ...activeRow, coverLetterDraft: draft };
    }
    if (!spec) throw new Error("No se pudo leer el link-spec del portfolio.");
    const row: RegistryRow = {
      ...buildPendingRow(
        {
          company: data.company,
          date: data.date,
          role: data.role,
          who: data.who,
          channel: data.channel === "" ? undefined : data.channel,
          email: data.email,
          jobUrl: data.jobUrl,
          jobContext: data.jobContext,
        },
        { spec, existingCodes },
      ),
      coverLetterDraft: draft,
    };
    await add(row);
    return row;
  }

  /**
   * Run a generation and deliver it. With `pending`, this is the deferred
   * generation of a row registered without CV: the existing row is updated
   * in place (same code) instead of adding a new one, and the timeline gets an
   * automatic "CV generado" entry.
   */
  async function handleGenerate(input: GenerateCvInput, pending?: RegistryRow) {
    if (!spec) {
      toast.error("No se pudo leer el link-spec del portfolio. Revisá la conexión.");
      return;
    }
    setGenerating(true);
    try {
      const result = await generateCv(input, { spec, existingCodes, loadMaster });
      if (pending) {
        await update(pending.code, deferredGenerationFields(pending, result));
      } else {
        await add(result.row);
      }
      downloadBytes(result.zip, result.zipName);

      // Keep a durable copy of each delivered file (data/cvs/ locally, Supabase
      // Storage on a deploy): masters evolve, so the archive is the only
      // faithful record of what was sent — and each file stays re-downloadable
      // from the row's detail panel. Never blocks the delivery.
      const deliveryFiles: DeliveryFile[] = result.entries.flatMap((entry) => [
        { path: `${entry.folder}/${CV_FILENAME}`, bytes: entry.docx },
        ...(entry.coverLetter
          ? [{ path: `${entry.folder}/${COVER_LETTER_FILENAME}`, bytes: entry.coverLetter }]
          : []),
      ]);
      let archiveState: "ok" | "off" | "failed";
      try {
        archiveState = (await archiveDeliveryFiles(deliveryFiles)) ? "ok" : "off";
      } catch {
        archiveState = "failed";
      }
      if (archiveState === "ok") {
        await update(result.code, {
          deliveryFiles: deliveryFiles.map((file) => file.path),
        }).catch(() => {
          // The files are archived; only the registry pointer failed — not fatal.
        });
      }

      // Extra sink: create each CV in the user's Google Drive as a native Google
      // Doc (via Apps Script), all under one per-application folder. Feature-off
      // (501) is silent; a real failure only warns. Collected URLs are persisted
      // so the panel can always show them. No per-language toasts — one alert.
      const driveDocs: NonNullable<RegistryRow["driveDocs"]> = {};
      let driveFolder: string | undefined;
      let gdocsFailed = false;
      for (const entry of result.entries) {
        // App folder = the delivery folder without its language prefix, shared
        // across languages ("EN_acme_0628a2" -> "acme_0628a2").
        const appFolder = entry.folder.slice(entry.language.length + 1);
        try {
          const doc = await createGoogleDoc(appFolder, entry.language, entry.docx);
          if (doc) {
            driveDocs[entry.language] = doc.docUrl;
            driveFolder = doc.folderUrl ?? driveFolder;
          }
        } catch {
          gdocsFailed = true;
        }
      }
      if (Object.keys(driveDocs).length > 0) {
        await update(result.code, { driveDocs, driveFolder }).catch(() => {
          // The docs exist in Drive; only the registry link failed — not fatal.
        });
      }

      // Single success alert. Secondary button opens the Drive folder when the
      // sink ran, otherwise reveals the archived CV in Finder — only when the
      // archive actually ran locally; on a deploy there's no Finder.
      const finderButton =
        archiveState === "ok"
          ? {
              label: "Finder",
              onClick: () => {
                revealDelivery(deliveryFiles[0].path)
                  .then((unavailable) => {
                    if (unavailable) toast.info(unavailable);
                  })
                  .catch((error: unknown) =>
                    toast.error(
                      error instanceof Error ? error.message : "No se pudo abrir el Finder.",
                    ),
                  );
              },
            }
          : undefined;
      toast.success(`CV generado · código ${result.code}`, {
        duration: 10000,
        action: { label: "Detalles", onClick: () => openGeneratedRow(result.code) },
        cancel: driveFolder
          ? { label: "Drive", onClick: () => window.open(driveFolder, "_blank") }
          : finderButton,
      });
      if (archiveState === "failed") {
        toast.warning(`No se pudo archivar la copia de ${result.code}.`);
      }
      if (gdocsFailed) {
        toast.warning(`No se pudo crear ${result.code} en Google Docs.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al generar el CV.");
      throw error;
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6">
      <header className="mb-5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h1 className="text-xl font-semibold tracking-tight">cv-builder</h1>
          <AppVersion />
        </div>
        <p className="text-sm text-muted-foreground">
          Generá el CV con tracking y mantené el registro de aplicaciones.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        {/* Registro: protagonista, ancho, con scroll horizontal propio. */}
        <section className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Estado + export a la izquierda; Vigentes/Archivado a la derecha. */}
            <div className="flex items-center gap-2">
              <StatusFilterDropdown value={statusFilter} onChange={setStatusFilter} />
              <ExportButton rows={rows} />
            </div>
            <SegmentedControl
              aria-label="Archivadas o no"
              value={view}
              onChange={setView}
              options={viewOptions}
            />
          </div>
          <RegistryTable
            rows={visibleRows}
            loading={loading}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onGenerateCv={setPendingTarget}
            screening={screening}
            openRequest={openRequest}
            emptyMessage={
              statusFilter !== "todos"
                ? `No hay ${
                    statusFilter === "Activo"
                      ? "activas"
                      : statusFilter === "Rechazado"
                        ? "rechazadas"
                        : "borradores"
                  } en ${view === "archivado" ? "Archivado" : "Vigentes"}.`
                : view === "archivado"
                  ? "No hay búsquedas archivadas."
                  : "Registrá tu primera aplicación desde el panel de la derecha."
            }
          />
        </section>

        {/* Cards de acción. Grid auto-fit: responde al ANCHO del contenedor, no de la
            pantalla — 1 col en la columna angosta (lg), 3 en fila (o wrap con igual
            tamaño) cuando la tabla las empuja abajo, 1 apilada en mobile. `items-stretch`
            (default) + `h-full` en la cara de la card las mantiene del mismo alto. */}
        <aside className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5 lg:sticky lg:top-6 lg:self-start">
          <GenerateCard
            spec={spec}
            existingCodes={existingCodes}
            templates={coverLetters.templates}
            generating={generating}
            onGenerate={handleGenerate}
            onSavePending={handleSavePending}
            onSaveDraft={handleSaveCoverLetterDraft}
          />
          <GeneralNotesCard />
          <StableLinksCard />
          <CoverLettersCard store={coverLetters} rows={rows} onOpenRow={openGeneratedRow} />
          <ScreeningCard store={screening} rows={rows} />
        </aside>
      </div>

      {/* Deferred generation: the wizard for a row registered without CV. */}
      <PendingCvDrawer
        row={pendingTarget}
        onClose={() => setPendingTarget(null)}
        spec={spec}
        existingCodes={existingCodes}
        templates={coverLetters.templates}
        generating={generating}
        onGenerate={(input) => handleGenerate(input, pendingTarget ?? undefined)}
        onSaveDraft={handleSaveCoverLetterDraft}
      />
    </main>
  );
}
