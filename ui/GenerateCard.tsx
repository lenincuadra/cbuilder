"use client";

import { FilePlus2 } from "lucide-react";

import type { CoverLetterTemplate } from "@/core/coverLetter/types";
import type { GenerateCvInput, PendingRowInput } from "@/core/generateCv";
import type { RegistryRow } from "@/core/registry/types";
import type { LinkSpec } from "@/core/spec/types";
import { PanelCard, PanelCardFace } from "@/ui/PanelCard";
import { Wizard, type WizardProps } from "@/ui/wizard/Wizard";

export interface GenerateCardProps {
  /** The link contract (from useSpec) — passed to the wizard. Null while loading. */
  spec: LinkSpec | null;
  /** Codes already in the registry, for collision-checked preview. */
  existingCodes: string[];
  /** Cover letter templates for the wizard's optional letter step. */
  templates: CoverLetterTemplate[];
  /** True while a generation is in flight. */
  generating: boolean;
  /**
   * Runs the generation; rejects on error (the caller surfaces the message).
   * `activeRow` is set when an AI cover-letter draft silently created a
   * Borrador row earlier in this session — update it instead of adding new.
   */
  onGenerate: (input: GenerateCvInput, activeRow?: RegistryRow) => Promise<void>;
  /** Registers a process without CV (wizard's "Guardar sin CV" exit). */
  onSavePending: (input: PendingRowInput) => Promise<void>;
  /** Persists the cover letter step's AI draft as soon as it's generated. */
  onSaveDraft?: WizardProps["onSaveDraft"];
}

/**
 * Right-column entry point of the main flow: start a new application process
 * (the tracked CV is generated here too, but a process can be registered
 * without one — "Guardar sin CV"). Compact card, clickable anywhere (same as
 * the other right-column cards); opens the full wizard in a drawer (shared
 * PanelCard pattern). The drawer node is threaded to the wizard so its
 * dropdowns portal inside it.
 */
export function GenerateCard({
  spec,
  existingCodes,
  templates,
  generating,
  onGenerate,
  onSavePending,
  onSaveDraft,
}: GenerateCardProps) {
  return (
    <PanelCard
      title="Nueva aplicación"
      description="Registrá una aplicación y generá su CV trackeado — o guardala sin CV."
      card={(open) => (
        <PanelCardFace
          icon={FilePlus2}
          title="Nueva aplicación"
          description="Registrá una aplicación y generá su CV trackeado — o guardala sin CV."
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
          onSaveDraft={onSaveDraft}
          onGenerate={async (input, activeRow) => {
            // Throws on error → the wizard stays on the confirm step with the message.
            await onGenerate(input, activeRow);
            close(); // success → close the drawer, ready for the next one.
          }}
          onSavePending={async (input) => {
            await onSavePending(input);
            close();
          }}
          onCancel={close}
          container={container}
        />
      )}
    </PanelCard>
  );
}
