"use client";

import { useState } from "react";
import { toast } from "sonner";

import { COVER_LETTER_FILENAME } from "@/core/coverLetter/docx";
import {
  buildPendingRow,
  deferredGenerationFields,
  generateCv,
  type GenerateCvInput,
  type PendingRowInput,
} from "@/core/generateCv";
import { funnelRanksFor } from "@/core/funnel";
import type { EditableFields, RegistryRow } from "@/core/registry/types";
import { CV_FILENAME } from "@/core/zip";
import { archiveDeliveryFiles, revealDelivery, type DeliveryFile } from "@/lib/archive";
import { downloadBytes } from "@/lib/download";
import { COVER_LETTER_DOC_NAME, CV_DOC_NAME, createGoogleDoc } from "@/lib/gdocs";
import { loadMaster } from "@/lib/masters";
import { toastDeleted } from "@/ui/ConfirmDelete";
import { AppVersion } from "@/ui/AppVersion";
import { CoverLettersCard } from "@/ui/CoverLettersCard";
import { ExportButton } from "@/ui/ExportButton";
import { FunnelCard } from "@/ui/FunnelCard";
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
  // Row for which we're generating an ADDITIONAL CV (another mode) — separate
  // from pendingTarget (deferred first-CV generation).
  const [variantTarget, setVariantTarget] = useState<RegistryRow | null>(null);

  const existingCodes = rows.map((row) => row.code);

  const matchesStatus = (row: RegistryRow) =>
    statusFilter === "todos" || row.status === statusFilter;
  const vigentes = rows.filter((row) => !row.archived);
  const archivados = rows.filter((row) => row.archived);
  const bucket = view === "archivado" ? archivados : vigentes;
  const visibleRows = bucket.filter(matchesStatus);

  // For the "flecha a la diana" reveal (RegistryTable, right after loading):
  // every CV ever sent, not just the current Vigentes/Archivado tab — scope
  // "all" per docs/animations.md §2 ("toda flecha que voló alguna vez").
  const sentRows = rows.filter((row) => !row.cvPending);
  const sentFunnelRanks = funnelRanksFor(sentRows);

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
   * Register a process without generating a CV (wizard's "Registrar sin CV",
   * available on every step): the code is reserved now, the CV can be
   * generated later from the row's detail panel. With `activeRow` (a Borrador
   * this session already created silently for an AI draft) the fields are
   * applied to that row instead of adding a duplicate. Returns the registered
   * row; throws on error so the wizard stays open with the message.
   */
  async function handleSavePending(
    input: PendingRowInput,
    activeRow?: RegistryRow,
  ): Promise<RegistryRow> {
    if (!spec) {
      toast.error("No se pudo leer el link-spec del portfolio. Revisá la conexión.");
      throw new Error("link-spec unavailable");
    }
    try {
      let row: RegistryRow;
      if (activeRow) {
        // Reuse buildPendingRow's field cleaning, keep the row's identity.
        const built = buildPendingRow(input, { spec, existingCodes });
        const fields: EditableFields = {
          company: built.company,
          role: built.role,
          channel: built.channel,
          email: built.email,
          who: built.who,
          jobUrl: built.jobUrl,
          jobContext: built.jobContext,
          coverLetterDraft: input.coverLetterDraft ?? activeRow.coverLetterDraft,
        };
        await update(activeRow.code, fields);
        row = { ...activeRow, ...fields };
      } else {
        row = buildPendingRow(input, { spec, existingCodes });
        await add(row);
      }
      toast.success(`Proceso registrado · código ${row.code}`, {
        duration: 10000,
        description: "Generá el CV cuando haga falta desde el detalle de la fila.",
        action: { label: "Detalles", onClick: () => openGeneratedRow(row.code) },
      });
      return row;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar el proceso.");
      throw error;
    }
  }

  /**
   * Row this wizard session is bound to, creating the silent Borrador row
   * (reserved code, cvPending) on first use — triggered by the confirm
   * step's optional cover letter/preguntas actions. `code` is the code
   * already reserved for the session's preview (the wizard's `previewCode`),
   * so the row lands on the exact code already shown on screen.
   */
  async function ensureDraftRow(
    data: WizardData,
    activeRow: RegistryRow | null,
    code?: string,
  ): Promise<RegistryRow> {
    if (activeRow) return activeRow;
    if (!spec) throw new Error("No se pudo leer el link-spec del portfolio.");
    const row = buildPendingRow(
      {
        company: data.company,
        date: data.date,
        role: data.role,
        who: data.who,
        channel: data.channel === "" ? undefined : data.channel,
        email: data.email,
        jobUrl: data.jobUrl,
        jobContext: data.jobContext,
        code,
      },
      { spec, existingCodes },
    );
    await add(row);
    return row;
  }

  /**
   * Run a generation and deliver it. With `pending`, this is the deferred
   * generation of a row registered without CV: the existing row is updated
   * in place (same code) instead of adding a new one, and the timeline gets an
   * automatic "CV generado" entry.
   */
  async function handleGenerate(
    input: GenerateCvInput,
    pending?: RegistryRow,
    variantRow?: RegistryRow,
  ) {
    if (!spec) {
      toast.error("No se pudo leer el link-spec del portfolio. Revisá la conexión.");
      return;
    }
    setGenerating(true);
    try {
      // An additional CV for an existing application: reuse its code and nest the
      // delivery under the chosen mode's subfolder so variants don't collide.
      const genInput: GenerateCvInput = variantRow
        ? { ...input, code: variantRow.code, variantSubfolder: input.cvMode }
        : input;
      const result = await generateCv(genInput, { spec, existingCodes, loadMaster });
      if (variantRow) {
        // No status/identity change — the row already shipped a CV; delivery
        // files (and Drive docs) are appended further down.
      } else if (pending) {
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
          // A variant appends to the application's existing delivery files.
          deliveryFiles: [
            ...(variantRow?.deliveryFiles ?? []),
            ...deliveryFiles.map((file) => file.path),
          ],
        }).catch(() => {
          // The files are archived; only the registry pointer failed — not fatal.
        });
      }

      // Extra sink: create each CV (and its cover letter, when the entry has
      // one) in the user's Google Drive as native Google Docs (via Apps
      // Script), all under one per-application folder. Feature-off (501) is
      // silent; a real failure only warns. Collected URLs are persisted so the
      // panel can always show them. No per-language toasts — one alert.
      const driveDocs: NonNullable<RegistryRow["driveDocs"]> = {};
      const driveLetterDocs: NonNullable<RegistryRow["driveLetterDocs"]> = {};
      let driveFolder: string | undefined;
      // Track WHY the Drive sink produced no docs: a real failure (throw, with
      // its reason) vs "off" (501 → createGoogleDoc returns null). Surfacing the
      // reason makes a misconfigured prod sink diagnosable instead of silent.
      let gdocsError: string | undefined;
      let gdocsCreated = false;
      let gdocsOff = false;
      for (const entry of result.entries) {
        // App folder = the delivery folder without its language prefix, shared
        // across languages ("EN_acme_0628a2" -> "acme_0628a2"). A variant folder
        // nests the mode ("acme_0628a2/ats"); Drive folder names can't contain
        // "/", so keep the base folder and move the mode into the doc name.
        const rawFolder = entry.folder.slice(entry.language.length + 1);
        const [appFolder] = rawFolder.split("/");
        const cvDocName = variantRow ? `${CV_DOC_NAME}_${input.cvMode}` : CV_DOC_NAME;
        try {
          const doc = await createGoogleDoc(appFolder, entry.language, entry.docx, cvDocName);
          if (doc) {
            driveDocs[entry.language] = doc.docUrl;
            driveFolder = doc.folderUrl ?? driveFolder;
            gdocsCreated = true;
          } else {
            gdocsOff = true; // 501 — integration not configured
          }
          if (entry.coverLetter) {
            const letterDoc = await createGoogleDoc(
              appFolder,
              entry.language,
              entry.coverLetter,
              COVER_LETTER_DOC_NAME,
            );
            if (letterDoc) driveLetterDocs[entry.language] = letterDoc.docUrl;
          }
        } catch (error) {
          gdocsError = error instanceof Error ? error.message : "Apps Script inalcanzable.";
        }
      }
      if (Object.keys(driveDocs).length > 0 || Object.keys(driveLetterDocs).length > 0) {
        await update(result.code, {
          // Merge with the application's existing Drive links (variant keeps prior).
          driveDocs: { ...(variantRow?.driveDocs ?? {}), ...driveDocs },
          driveLetterDocs: { ...(variantRow?.driveLetterDocs ?? {}), ...driveLetterDocs },
          driveFolder,
        }).catch(() => {
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
      if (gdocsError) {
        // Show the actual reason (HTTP status / Apps Script message) so a
        // broken prod sink is diagnosable, not silently "no Drive link".
        toast.warning(`Drive: ${gdocsError}`, { duration: 12000 });
      } else if (gdocsOff && !gdocsCreated) {
        // Every attempt returned 501: the integration isn't configured in this
        // environment (missing GDOCS_SCRIPT_URL / GDOCS_TOKEN).
        toast.info("Drive no configurado (faltan GDOCS_SCRIPT_URL / GDOCS_TOKEN).", {
          duration: 8000,
        });
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
            totalSentCount={sentRows.length}
            sentFunnelRanks={sentFunnelRanks}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onGenerateCv={setPendingTarget}
            onGenerateVariant={setVariantTarget}
            screening={screening}
            templates={coverLetters.templates}
            openRequest={openRequest}
            emptyMessage={
              statusFilter !== "todos"
                ? `No hay ${
                    statusFilter === "Activo"
                      ? "activas"
                      : statusFilter === "Aceptado"
                        ? "aceptadas"
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
            onUpdate={handleUpdate}
            screening={screening}
            onEnsureRow={ensureDraftRow}
          />
          <GeneralNotesCard />
          <StableLinksCard />
          <CoverLettersCard store={coverLetters} rows={rows} onOpenRow={openGeneratedRow} />
          <ScreeningCard store={screening} rows={rows} />
          <FunnelCard rows={rows} />
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
        onUpdate={handleUpdate}
        screening={screening}
        onEnsureRow={ensureDraftRow}
      />

      {/* Additional CV (another mode) for an application that already shipped one. */}
      <PendingCvDrawer
        row={variantTarget}
        variantMode
        onClose={() => setVariantTarget(null)}
        spec={spec}
        existingCodes={existingCodes}
        templates={coverLetters.templates}
        generating={generating}
        onGenerate={(input) => handleGenerate(input, undefined, variantTarget ?? undefined)}
        onUpdate={handleUpdate}
        screening={screening}
        onEnsureRow={ensureDraftRow}
      />
    </main>
  );
}
