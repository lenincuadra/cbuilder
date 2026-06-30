"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { slugifyCompany } from "@/core/folderName";
import { generateCv, type GenerateCvInput } from "@/core/generateCv";
import type { EditableFields } from "@/core/registry/types";
import { downloadBytes } from "@/lib/download";
import { loadMaster } from "@/lib/masters";
import { cn } from "@/lib/utils";
import { RegistryTable } from "@/ui/RegistryTable";
import { useRegistry } from "@/ui/useRegistry";
import { Wizard } from "@/ui/wizard/Wizard";

export default function Home() {
  const { rows, loading, add, update } = useRegistry();
  const [generating, setGenerating] = useState(false);
  const [view, setView] = useState<"activas" | "archivado">("activas");

  const existingCodes = rows.map((row) => row.code);
  const activeRows = rows.filter((row) => !row.archived);
  const archivedRows = rows.filter((row) => row.archived);
  const visibleRows = view === "archivado" ? archivedRows : activeRows;

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
          <div className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-1 text-sm">
            <button
              type="button"
              onClick={() => setView("activas")}
              className={cn(
                "rounded-md px-3 py-1 transition-colors",
                view === "activas"
                  ? "bg-background font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Búsquedas activas{" "}
              <span className="text-muted-foreground tabular-nums">({activeRows.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setView("archivado")}
              className={cn(
                "rounded-md px-3 py-1 transition-colors",
                view === "archivado"
                  ? "bg-background font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Archivado{" "}
              <span className="text-muted-foreground tabular-nums">({archivedRows.length})</span>
            </button>
          </div>
          <RegistryTable
            rows={visibleRows}
            loading={loading}
            onUpdate={handleUpdate}
            emptyMessage={
              view === "archivado"
                ? "No hay búsquedas archivadas."
                : "Generá tu primer CV desde el panel de la derecha."
            }
          />
        </section>

        {/* Generación: card angosto a la derecha. */}
        <aside>
          <Card className="lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle>Generar un CV</CardTitle>
              <CardDescription>Wizard de 4 pasos.</CardDescription>
            </CardHeader>
            <CardContent>
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
