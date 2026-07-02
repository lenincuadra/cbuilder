"use client";

import { useState } from "react";
import { FilePlus2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { slugifyCompany } from "@/core/folderName";
import { generateCv, type GenerateCvInput } from "@/core/generateCv";
import type { ApplicationStatus, EditableFields, RegistryRow } from "@/core/registry/types";
import { downloadBytes } from "@/lib/download";
import { loadMaster } from "@/lib/masters";
import { RegistryTable } from "@/ui/RegistryTable";
import { SegmentedControl, type SegmentedOption } from "@/ui/SegmentedControl";
import { useRegistry } from "@/ui/useRegistry";
import { Wizard } from "@/ui/wizard/Wizard";

type ArchiveView = "vigentes" | "archivado";
type StatusFilter = "todos" | ApplicationStatus;

export default function Home() {
  const { rows, loading, add, update } = useRegistry();
  const [generating, setGenerating] = useState(false);
  // Two orthogonal filters: archived-or-not (view) and status.
  const [view, setView] = useState<ArchiveView>("vigentes");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");

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
  const statusOptions: SegmentedOption<StatusFilter>[] = [
    { value: "todos", label: "Todos" },
    { value: "Activo", label: "Activo" },
    { value: "Rechazado", label: "Rechazado" },
  ];

  async function handleUpdate(code: string, fields: EditableFields) {
    try {
      await update(code, fields);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la fila.");
    }
  }

  async function handleGenerate(input: GenerateCvInput) {
    setGenerating(true);
    try {
      const result = await generateCv(input, { existingCodes, loadMaster });
      await add(result.row);

      const zipName =
        result.folderNames.length === 1
          ? `${result.folderNames[0]}.zip`
          : `${slugifyCompany(input.company)}_${result.code}.zip`;
      downloadBytes(result.zip, zipName);

      toast.success(`CV generado · código ${result.code}`);
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
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              aria-label="Archivadas o no"
              value={view}
              onChange={setView}
              options={viewOptions}
            />
            <SegmentedControl
              aria-label="Filtrar por estado"
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
            />
          </div>
          <RegistryTable
            rows={visibleRows}
            loading={loading}
            onUpdate={handleUpdate}
            emptyMessage={
              statusFilter !== "todos"
                ? `No hay ${statusFilter === "Activo" ? "activas" : "rechazadas"} en ${view === "archivado" ? "Archivado" : "Vigentes"}.`
                : view === "archivado"
                  ? "No hay búsquedas archivadas."
                  : "Generá tu primer CV desde el panel de la derecha."
            }
          />
        </section>

        {/* Generación: card angosto a la derecha, presentada como Empty state. */}
        <aside>
          <Card className="lg:sticky lg:top-6">
            <CardContent className="space-y-5 pt-6">
              <Empty className="border-0 p-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FilePlus2 />
                  </EmptyMedia>
                  <EmptyTitle>Generar un CV</EmptyTitle>
                  <EmptyDescription>
                    Creá un CV trackeado y sumalo al registro.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
              <Wizard
                existingCodes={existingCodes}
                generating={generating}
                onGenerate={handleGenerate}
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
