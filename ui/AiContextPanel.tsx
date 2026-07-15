"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AI_MODELS, type AiModel } from "@/core/ai/models";
import { Button } from "@/components/ui/button";
import { IconSelect, type IconSelectOption } from "@/ui/IconSelect";

const MODEL_OPTIONS: IconSelectOption<AiModel>[] = AI_MODELS.map((id) => ({ value: id, label: id }));

export interface AiContextPanelProps {
  jobUrl: string;
  onJobUrlChange: (value: string) => void;
  jobContext: string;
  onJobContextChange: (value: string) => void;
  model: AiModel;
  onModelChange: (model: AiModel) => void;
  /** Prefix for field ids so multiple panels on one page don't collide. */
  idPrefix: string;
  /** Portal target for the model dropdown (the drawer node). */
  container?: HTMLElement | null;
}

/**
 * Shared "ground the AI" block: link del puesto + Detectar (best-effort
 * JSON-LD extraction, no headless — see /api/job-context), contexto libre, y
 * qué modelo usar. Reused as-is wherever a "Generar con IA"/"Sugerir" trigger
 * lives (wizard step 4, the screening suggest takeovers) — the input is
 * identical everywhere, only the output/caller differs. Per the two-step AI
 * rule (docs/DESIGN.md) it only ever appears after an explicit user action,
 * next to the button that fires the call.
 */
export function AiContextPanel({
  jobUrl,
  onJobUrlChange,
  jobContext,
  onJobContextChange,
  model,
  onModelChange,
  idPrefix,
  container,
}: AiContextPanelProps) {
  const [detecting, setDetecting] = useState(false);

  async function detect() {
    if (jobUrl.trim() === "") return;
    setDetecting(true);
    try {
      const response = await fetch("/api/job-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: jobUrl.trim() }),
      });
      const payload = (await response.json()) as { context?: string | null };
      if (payload.context) {
        onJobContextChange(payload.context);
      } else {
        toast.info("No encontramos el detalle del puesto en esa página — completalo a mano.");
      }
    } catch {
      toast.info("No encontramos el detalle del puesto en esa página — completalo a mano.");
    } finally {
      setDetecting(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-jobUrl`}>Link del puesto</Label>
        <div className="flex gap-2">
          <Input
            id={`${idPrefix}-jobUrl`}
            type="url"
            placeholder="https://…"
            value={jobUrl}
            onChange={(event) => onJobUrlChange(event.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={detect}
            disabled={jobUrl.trim() === "" || detecting}
          >
            {detecting ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Detectar
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-jobContext`}>Contexto extra del puesto</Label>
        <Textarea
          id={`${idPrefix}-jobContext`}
          placeholder="Requisitos o highlights relevantes del posting (opcional)."
          value={jobContext}
          rows={4}
          className="text-xs"
          onChange={(event) => onJobContextChange(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-model`}>Modelo</Label>
        <IconSelect
          id={`${idPrefix}-model`}
          aria-label="Modelo"
          value={model}
          onChange={onModelChange}
          options={MODEL_OPTIONS}
          container={container}
        />
      </div>
    </div>
  );
}
