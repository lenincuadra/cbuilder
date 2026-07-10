"use client";

import { useState, type CSSProperties } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { generateCv, type GenerateCvInput } from "@/core/generateCv";
import type { EditableFields, RegistryRow } from "@/core/registry/types";
import { archiveCvZip, revealCvZip } from "@/lib/archive";
import { downloadBytes } from "@/lib/download";
import { createGoogleDoc } from "@/lib/gdocs";
import { loadMaster } from "@/lib/masters";
import { GenerateCard } from "@/ui/GenerateCard";
import { GeneralNotesCard } from "@/ui/GeneralNotesCard";
import { StableLinksCard } from "@/ui/StableLinksCard";
import { RegistryTable } from "@/ui/RegistryTable";
import { SegmentedControl, type SegmentedOption } from "@/ui/SegmentedControl";
import { StatusFilterDropdown, type StatusFilter } from "@/ui/StatusFilterDropdown";
import { useRegistry } from "@/ui/useRegistry";

type ArchiveView = "vigentes" | "archivado";

export default function Home() {
  const { rows, loading, add, update, remove } = useRegistry();
  const [generating, setGenerating] = useState(false);
  // Two orthogonal filters: archived-or-not (view) and status.
  const [view, setView] = useState<ArchiveView>("vigentes");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  // External "open this row's detail panel" request (generation toast CTA).
  const [openRequest, setOpenRequest] = useState<{ code: string; nonce: number } | null>(null);

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
      // Destructive action → destructive-styled toast (red icon/text/border), not a success check.
      toast(`Registro ${code} borrado.`, {
        icon: <Trash2 className="size-4 text-destructive" />,
        style: {
          "--normal-text": "var(--destructive)",
          "--normal-border": "var(--destructive)",
        } as CSSProperties,
      });
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

  async function handleGenerate(input: GenerateCvInput) {
    setGenerating(true);
    try {
      const result = await generateCv(input, { existingCodes, loadMaster });
      await add(result.row);
      downloadBytes(result.zip, result.zipName);

      // Keep a server-side copy (data/cvs/): masters evolve, so the archive is
      // the only faithful record of what was sent. Never blocks the delivery.
      let archiveOk = true;
      try {
        await archiveCvZip(result.zipName, result.zip);
      } catch {
        archiveOk = false;
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
      // sink ran, otherwise reveals the archived zip in Finder; Finder always
      // stays reachable from "Detalles" (the drawer's Entrega card).
      toast.success(`CV generado · código ${result.code}`, {
        duration: 10000,
        action: { label: "Detalles", onClick: () => openGeneratedRow(result.code) },
        cancel: driveFolder
          ? { label: "Drive", onClick: () => window.open(driveFolder, "_blank") }
          : {
              label: "Finder",
              onClick: () => {
                revealCvZip(result.zipName).catch((error: unknown) =>
                  toast.error(
                    error instanceof Error ? error.message : "No se pudo abrir el Finder.",
                  ),
                );
              },
            },
      });
      if (!archiveOk) {
        toast.warning(`No se pudo archivar la copia de ${result.code} en data/cvs.`);
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
        <h1 className="text-xl font-semibold tracking-tight">cv-builder</h1>
        <p className="text-sm text-muted-foreground">
          Generá el CV con tracking y mantené el registro de aplicaciones.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        {/* Registro: protagonista, ancho, con scroll horizontal propio. */}
        <section className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Estado a la izquierda (dropdown con badge); Vigentes/Archivado a la derecha. */}
            <StatusFilterDropdown value={statusFilter} onChange={setStatusFilter} />
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
            openRequest={openRequest}
            emptyMessage={
              statusFilter !== "todos"
                ? `No hay ${statusFilter === "Activo" ? "activas" : "rechazadas"} en ${view === "archivado" ? "Archivado" : "Vigentes"}.`
                : view === "archivado"
                  ? "No hay búsquedas archivadas."
                  : "Generá tu primer CV desde el panel de la derecha."
            }
          />
        </section>

        {/* Cards de acción. Grid auto-fit: responde al ANCHO del contenedor, no de la
            pantalla — 1 col en la columna angosta (lg), 3 en fila (o wrap con igual
            tamaño) cuando la tabla las empuja abajo, 1 apilada en mobile. `items-stretch`
            (default) + `h-full` en la cara de la card las mantiene del mismo alto. */}
        <aside className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5 lg:sticky lg:top-6 lg:self-start">
          <GenerateCard
            existingCodes={existingCodes}
            generating={generating}
            onGenerate={handleGenerate}
          />
          <GeneralNotesCard />
          <StableLinksCard />
        </aside>
      </div>
    </main>
  );
}
