"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { RegistryRow } from "@/core/registry/types";
import { CoverLetterInfo } from "./CoverLetterInfo";

export interface CoverLetterSectionProps {
  row: RegistryRow;
  /** Opens the "Generar cover letter" takeover (owned by the drawer). */
  onStartGenerate: () => void;
}

/**
 * Detalles-tab cover letter slot: the faithful record if one already shipped
 * (`CoverLetterInfo`, unchanged/read-only), otherwise a CTA to generate one —
 * same inline-in-section shape as `DeliveryInfo`'s pending-CV CTA. Also the
 * confirm step's optional "Generar cover letter" (once its Borrador row is
 * ensured), so a `cvPending` row gets the same CTA as any other.
 */
export function CoverLetterSection({ row, onStartGenerate }: CoverLetterSectionProps) {
  if (row.coverLetter) return <CoverLetterInfo row={row} />;

  return (
    <div className="space-y-2 rounded-lg border px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">Cover letter</span>
      <p className="text-xs text-muted-foreground">Sin cover letter todavía.</p>
      <Button variant="outline" size="sm" onClick={onStartGenerate}>
        <Plus className="size-4" />
        Generar cover letter
      </Button>
    </div>
  );
}
