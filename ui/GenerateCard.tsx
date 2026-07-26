"use client";

import { FilePlus2 } from "lucide-react";

import type { CoverLetterTemplate } from "@/core/coverLetter/types";
import type { GenerateCvInput } from "@/core/generateCv";
import type { RegistryRow } from "@/core/registry/types";
import type { LinkSpec } from "@/core/spec/types";
import { PanelCard, PanelCardFace } from "@/ui/PanelCard";
import { Wizard, type WizardProps } from "@/ui/wizard/Wizard";

export interface GenerateCardProps {
  /** The link contract (from useSpec) — passed to the wizard. Null while loading. */
  spec: LinkSpec | null;
  /** Codes already in the registry, for collision-checked preview. */
  existingCodes: string[];
  /** Cover letter templates for the confirm step's optional letter takeover. */
  templates: CoverLetterTemplate[];
  /** True while a generation is in flight. */
  generating: boolean;
  /**
   * Runs the generation; rejects on error (the caller surfaces the message).
   * `activeRow` is set when an optional cover letter/preguntas action silently
   * created a Borrador row earlier in this session — update it instead of
   * adding new.
   */
  onGenerate: (input: GenerateCvInput, activeRow?: RegistryRow) => Promise<void>;
  /** Registers a process without CV (wizard's "Registrar sin CV" exit, any step). */
  onSavePending: WizardProps["onSavePending"];
  /** Persists row field edits — the confirm step's optional takeovers need it. */
  onUpdate: WizardProps["onUpdate"];
  /** Shared screening bank + row-ensuring callback for the confirm step's optional actions. */
  screening?: WizardProps["screening"];
  onEnsureRow?: WizardProps["onEnsureRow"];
}

/**
 * Right-column entry point of the main flow: start a new application process
 * (the tracked CV is generated here too, but a process can be registered
 * without one — "Registrar sin CV", any step). Compact card, clickable
 * anywhere (same as the other right-column cards); opens the full wizard in a
 * drawer (shared PanelCard pattern). The drawer node is threaded to the
 * wizard so its dropdowns portal inside it.
 */
export function GenerateCard({
  spec,
  existingCodes,
  templates,
  generating,
  onGenerate,
  onSavePending,
  onUpdate,
  screening,
  onEnsureRow,
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
          onUpdate={onUpdate}
          onGenerate={async (input, activeRow) => {
            // Throws on error → the wizard stays on the confirm step with the message.
            await onGenerate(input, activeRow);
            close(); // success → close the drawer, ready for the next one.
          }}
          onSavePending={
            onSavePending
              ? async (input, activeRow) => {
                  const row = await onSavePending(input, activeRow);
                  close();
                  return row;
                }
              : undefined
          }
          screening={screening}
          onEnsureRow={onEnsureRow}
          onCancel={close}
          container={container}
        />
      )}
    </PanelCard>
  );
}
