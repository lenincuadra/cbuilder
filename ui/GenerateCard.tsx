"use client";

import { FilePlus2 } from "lucide-react";

import type { CoverLetterTemplate } from "@/core/coverLetter/types";
import type { GenerateCvInput } from "@/core/generateCv";
import type { LinkSpec } from "@/core/spec/types";
import { PanelCard, PanelCardFace } from "@/ui/PanelCard";
import { Wizard } from "@/ui/wizard/Wizard";

export interface GenerateCardProps {
  /** The link contract (from useSpec) — passed to the wizard. Null while loading. */
  spec: LinkSpec | null;
  /** Codes already in the registry, for collision-checked preview. */
  existingCodes: string[];
  /** Cover letter templates for the wizard's optional letter step. */
  templates: CoverLetterTemplate[];
  /** True while a generation is in flight. */
  generating: boolean;
  /** Runs the generation; rejects on error (the caller surfaces the message). */
  onGenerate: (input: GenerateCvInput) => Promise<void>;
}

/**
 * Right-column CV generator. Compact card, clickable anywhere (same as the other
 * right-column cards); opens the full wizard in a drawer (shared PanelCard
 * pattern). The drawer node is threaded to the wizard so its dropdowns portal
 * inside it.
 */
export function GenerateCard({
  spec,
  existingCodes,
  templates,
  generating,
  onGenerate,
}: GenerateCardProps) {
  return (
    <PanelCard
      title="Generar un CV"
      description="Creá un CV trackeado y sumalo al registro."
      card={(open) => (
        <PanelCardFace
          icon={FilePlus2}
          title="Generar un CV"
          description="Creá un CV trackeado y sumalo al registro."
          onOpen={open}
        />
      )}
    >
      {(close, container) => (
        <Wizard
          spec={spec}
          existingCodes={existingCodes}
          templates={templates}
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
