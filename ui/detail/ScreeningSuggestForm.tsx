"use client";

import { useState } from "react";
import { toast } from "sonner";

import { DrawerBody } from "@/components/ui/drawer";
import type { ScreeningQuestion } from "@/core/screening/types";
import { AiContextPanel } from "@/ui/AiContextPanel";
import { DrawerFormFooter } from "@/ui/DrawerFormFooter";
import type { UseScreening } from "@/ui/useScreening";
import { requestAiAnswer } from "@/core/screening/ai";
import { useScreeningAiContext, type ScreeningAiRow } from "./screeningAi";

export interface ScreeningSuggestFormProps extends ScreeningAiRow {
  /** The linked entry with no answer yet — the suggestion writes onto it. */
  entry: ScreeningQuestion;
  /** Persists jobUrl/jobContext edits made from the context panel onto the row. */
  onUpdateJobFields: (fields: { jobUrl?: string; jobContext?: string }) => void | Promise<void>;
  /** Shared bank instance (same one the Preguntas card manages). */
  screening: UseScreening;
  /** Portal target for popouts (the drawer node). */
  container?: HTMLElement | null;
  /** Back to the Detalles view — after generating or on cancel. */
  onDone: () => void;
}

/**
 * "Sugerir respuesta" takeover of the row detail drawer (same slot as
 * RowEditForm): step 2 of the two-step AI rule (docs/DESIGN.md → "Generación
 * con IA") — the click that opened this view was step 1, here the optional
 * context is reviewed and "Generar y guardar" fires the one paid call. The
 * draft persists the moment it's generated (a call can't be undone).
 */
export function ScreeningSuggestForm({
  entry,
  company,
  role,
  focus,
  jobUrl,
  jobContext,
  onUpdateJobFields,
  screening,
  container,
  onDone,
}: ScreeningSuggestFormProps) {
  const { update } = screening;
  const ctx = useScreeningAiContext({ company, role, focus, jobUrl, jobContext });
  const [generating, setGenerating] = useState(false);

  async function generate() {
    setGenerating(true);
    try {
      const suggestion = await requestAiAnswer(entry.question, ctx.aiContext);
      await Promise.all([
        update(entry.id, { answer: suggestion, draft: true }),
        onUpdateJobFields({ jobUrl: ctx.jobUrl, jobContext: ctx.jobContext }),
      ]);
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo sugerir una respuesta.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <DrawerBody className="gap-3">
        <span className="text-xs font-medium text-muted-foreground">Sugerir respuesta</span>

        <div className="rounded-lg border px-3 py-2">
          <p className="text-sm font-medium break-words">{entry.question}</p>
        </div>

        <AiContextPanel
          jobUrl={ctx.jobUrl}
          onJobUrlChange={ctx.setJobUrl}
          jobContext={ctx.jobContext}
          onJobContextChange={ctx.setJobContext}
          model={ctx.model}
          onModelChange={ctx.setModel}
          idPrefix="sts"
          container={container}
        />

        <p className="text-xs text-muted-foreground">
          Los campos de contexto son opcionales — más contexto, respuesta más dirigida. La
          respuesta se genera con una llamada a la API y se guarda al instante como borrador
          (&quot;IA · sin revisar&quot;).
        </p>
      </DrawerBody>

      <DrawerFormFooter
        onCancel={onDone}
        onSubmit={generate}
        canSubmit
        saving={generating}
        submitLabel="Generar y guardar"
        savingLabel="Generando…"
      />
    </>
  );
}
