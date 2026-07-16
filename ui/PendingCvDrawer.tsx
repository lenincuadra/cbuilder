"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { CoverLetterTemplate } from "@/core/coverLetter/types";
import type { GenerateCvInput } from "@/core/generateCv";
import type { RegistryRow } from "@/core/registry/types";
import type { LinkSpec } from "@/core/spec/types";
import { useIsMobile } from "@/ui/useIsMobile";
import { Wizard, type WizardProps } from "@/ui/wizard/Wizard";

export interface PendingCvDrawerProps {
  /** The pending row to generate for; null keeps the drawer closed. */
  row: RegistryRow | null;
  onClose: () => void;
  spec: LinkSpec | null;
  existingCodes: string[];
  templates: CoverLetterTemplate[];
  generating: boolean;
  /** Runs the deferred generation; rejects on error (the caller surfaces it). */
  onGenerate: (input: GenerateCvInput) => Promise<void>;
  /** Persists the cover letter step's AI draft as soon as it's regenerated. */
  onSaveDraft?: WizardProps["onSaveDraft"];
  /** Shared screening bank + row-ensuring callback for the Preguntas step. */
  screening?: WizardProps["screening"];
  onEnsureRow?: WizardProps["onEnsureRow"];
}

/**
 * Drawer hosting the wizard in deferred mode: generate the CV for a process
 * registered without one ("Generar CV" in the detail panel). Same responsive
 * drawer pattern as PanelCard; the wizard starts on the Idioma y foco step and
 * uses the row's reserved code.
 */
export function PendingCvDrawer({
  row,
  onClose,
  spec,
  existingCodes,
  templates,
  generating,
  onGenerate,
  onSaveDraft,
  screening,
  onEnsureRow,
}: PendingCvDrawerProps) {
  const isMobile = useIsMobile();
  // The drawer node — the wizard's dropdowns portal here (same as PanelCard).
  const [node, setNode] = useState<HTMLDivElement | null>(null);

  return (
    <Drawer
      direction={isMobile ? "bottom" : "right"}
      open={row !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DrawerContent ref={setNode}>
        <DrawerHeader className="relative pr-12">
          <DrawerTitle>Generar CV · {row?.company}</DrawerTitle>
          <DrawerDescription className="font-mono text-xs">{row?.code}</DrawerDescription>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            title="Cerrar"
            className="absolute top-3 right-3"
          >
            <X className="size-4" />
          </Button>
        </DrawerHeader>
        {/* The wizard renders the drawer body + pinned nav footer itself. */}
        {row && (
          <Wizard
            key={row.code}
            spec={spec}
            existingCodes={existingCodes}
            templates={templates}
            generating={generating}
            pendingRow={row}
            onSaveDraft={onSaveDraft}
            screening={screening}
            onEnsureRow={onEnsureRow}
            onGenerate={async (input) => {
              // Throws on error → the wizard stays on the confirm step.
              await onGenerate(input);
              onClose();
            }}
            onCancel={onClose}
            container={node}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}
