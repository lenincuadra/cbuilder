"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ParsedJd } from "@/core/jdParse/types";
import { CHANNELS, type Channel } from "@/core/registry/types";
import { ChannelIcon } from "@/ui/ChannelIcon";
import { IconSelect, type IconSelectOption } from "@/ui/IconSelect";
import type { StepProps } from "./StepCompany";
import { CHANNEL_OMIT } from "./types";

/** "Omitir" + one option per channel, each with its table icon. */
export const CHANNEL_OPTIONS: IconSelectOption<string>[] = [
  { value: CHANNEL_OMIT, label: "Omitir" },
  ...CHANNELS.map((channel) => ({
    value: channel,
    label: channel,
    icon: <ChannelIcon channel={channel} className="size-4 text-muted-foreground" />,
  })),
];

/** Step 3 — Optional fields: rol, canal, quién, link del puesto, descripción. */
export function StepOptional({ data, set, container }: StepProps) {
  const [detecting, setDetecting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  async function detect() {
    if (data.jobUrl.trim() === "") return;
    setDetecting(true);
    try {
      const res = await fetch("/api/job-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: data.jobUrl.trim() }),
      });
      const payload = (await res.json()) as { context?: string | null; parsed?: ParsedJd | null };
      if (payload.context) {
        const p = payload.parsed;
        const hasContent =
          p &&
          (p.jobTitle ||
            p.requiredKeywords.length > 0 ||
            p.tools.length > 0 ||
            p.preferredKeywords.length > 0);
        set({ jobContext: payload.context, parsedJd: hasContent ? p : null });
      } else {
        toast.info("No encontramos el detalle del puesto en esa página — completalo a mano.");
      }
    } catch {
      toast.info("No encontramos el detalle del puesto en esa página — completalo a mano.");
    } finally {
      setDetecting(false);
    }
  }

  async function analyze() {
    if (data.jobContext.trim() === "") return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/ai/jd-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: data.jobContext.trim() }),
      });
      const payload = (await res.json()) as { parsed?: ParsedJd | null };
      const parsed = payload.parsed;
      const hasContent =
        parsed &&
        (parsed.jobTitle ||
          parsed.requiredKeywords.length > 0 ||
          parsed.tools.length > 0 ||
          parsed.preferredKeywords.length > 0);
      if (!hasContent) {
        set({ parsedJd: null });
        toast.info(
          parsed
            ? "La IA no detectó keywords en esta descripción — revisá que el texto sea la JD completa."
            : "IA no configurada — la descripción queda guardada para revisión manual.",
        );
      } else {
        set({ parsedJd: parsed });
      }
    } catch {
      toast.info("No se pudo analizar el puesto — la descripción queda guardada.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="role">Rol</Label>
        <Input
          id="role"
          value={data.role}
          onChange={(event) => set({ role: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="channel">Canal</Label>
        <IconSelect
          id="channel"
          aria-label="Canal"
          value={data.channel === "" ? CHANNEL_OMIT : data.channel}
          onChange={(value) =>
            set({ channel: value === CHANNEL_OMIT ? "" : (value as Channel) })
          }
          options={CHANNEL_OPTIONS}
          container={container}
        />
      </div>

      {data.channel === "Email" && (
        <div className="space-y-2">
          <Label htmlFor="email">Email al que aplicaste</Label>
          <Input
            id="email"
            type="email"
            placeholder="recruiter@empresa.com"
            value={data.email}
            onChange={(event) => set({ email: event.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Si no lo tenés a mano, registrá igual y completalo después desde Editar.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="who">Quién</Label>
        <Input
          id="who"
          placeholder="Recruiter o contacto"
          value={data.who}
          onChange={(event) => set({ who: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="jobUrl">Link del puesto</Label>
        <div className="flex gap-2">
          <Input
            id="jobUrl"
            type="url"
            placeholder="https://…"
            value={data.jobUrl}
            onChange={(event) => set({ jobUrl: event.target.value })}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={detect}
            disabled={data.jobUrl.trim() === "" || detecting}
          >
            {detecting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
            Detectar
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="jobContext">Descripción del puesto</Label>
        <Textarea
          id="jobContext"
          placeholder="Pegá la descripción del puesto (opcional). Sirve para tailorear el CV y la carta."
          value={data.jobContext}
          rows={4}
          className="text-xs"
          onChange={(event) => set({ jobContext: event.target.value, parsedJd: null })}
        />
        {data.jobContext.trim() !== "" && !data.parsedJd && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={analyze}
            disabled={analyzing}
          >
            {analyzing ? <Loader2 className="size-4 animate-spin" /> : null}
            Analizar con IA
          </Button>
        )}
        {data.parsedJd && (
          <p className="text-xs text-muted-foreground">
            Analizado:{" "}
            <span className="text-foreground font-medium">
              {[
                data.parsedJd.requiredKeywords.length > 0 &&
                  `${data.parsedJd.requiredKeywords.length} keywords`,
                data.parsedJd.tools.length > 0 && `${data.parsedJd.tools.length} tools`,
                data.parsedJd.jobTitle && `título "${data.parsedJd.jobTitle}"`,
              ]
                .filter(Boolean)
                .join(", ")}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
