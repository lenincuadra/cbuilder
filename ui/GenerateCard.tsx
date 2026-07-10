"use client";

import { FilePlus2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { GenerateCvInput } from "@/core/generateCv";
import { PanelCard, PanelCardFace } from "@/ui/PanelCard";
import { Wizard } from "@/ui/wizard/Wizard";

export interface GenerateCardProps {
  /** Codes already in the registry, for collision-checked preview. */
  existingCodes: string[];
  /** True while a generation is in flight. */
  generating: boolean;
  /** Runs the generation; rejects on error (the caller surfaces the message). */
  onGenerate: (input: GenerateCvInput) => Promise<void>;
}

/**
 * Right-column CV generator. Compact empty-state card; the "Generar CV" button
 * opens the full wizard in a drawer (shared PanelCard pattern). The drawer node
 * is threaded to the wizard so its dropdowns portal inside it.
 */
export function GenerateCard({ existingCodes, generating, onGenerate }: GenerateCardProps) {
  return (
    <PanelCard
      title="Generar un CV"
      description="Creá un CV trackeado y sumalo al registro."
      card={(open) => (
        <PanelCardFace
          icon={FilePlus2}
          title="Generar un CV"
          description="Creá un CV trackeado y sumalo al registro."
          cta={
            <Button size="sm" onClick={open}>
              <FilePlus2 className="size-4" />
              Generar CV
            </Button>
          }
        />
      )}
    >
      {(close, container) => (
        <Wizard
          existingCodes={existingCodes}
          generating={generating}
          onGenerate={async (input) => {
            // Throws on error → the wizard stays on the confirm step with the message.
            await onGenerate(input);
            close(); // success → close the drawer, ready for the next one.
          }}
          onCancel={close}
          container={container}
        />
      )}
    </PanelCard>
  );
}
