"use client";

import dynamic from "next/dynamic";
import { ArrowDown, ChartBarDecreasing } from "lucide-react";

import { DrawerBody } from "@/components/ui/drawer";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { computeFunnel, type FunnelStage } from "@/core/funnel";
import type { RegistryRow } from "@/core/registry/types";
import { PanelCard, PanelCardFace } from "@/ui/PanelCard";

// Recharts is heavy (~100 kB gz) for a single-page app: load it only when the
// drawer opens, never on the initial page.
const FunnelChart = dynamic(() => import("@/ui/FunnelChart"), {
  ssr: false,
  loading: () => <div className="h-[264px] shrink-0" />,
});

/** "N%" for a computed percentage, "—" when there is nothing to divide by. */
function pct(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

/** One stage: color chip + ES label + numbers, then the educational copy. */
function StageBlock({ stage, index }: { stage: FunnelStage; index: number }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-2">
        <span
          className="size-3 shrink-0 self-center rounded-[3px] border border-border"
          style={{ background: `var(--chart-${index + 1})` }}
        />
        <span className="text-sm font-medium">{stage.label}</span>
        <span className="ml-auto text-sm tabular-nums">
          {stage.count}
          <span className="ml-1 text-xs text-muted-foreground">({pct(stage.pctOfTotal)})</span>
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">{stage.name}</span> · {stage.marketing}
      </p>
      <p className="text-xs text-muted-foreground">En tu búsqueda: {stage.jobHunt}</p>
    </div>
  );
}

/** Conversion connector between two consecutive stages (the funnel-literacy core). */
function Connector({ value }: { value: number | null }) {
  return (
    <div className="flex items-center gap-1 py-1 pl-5 text-xs text-muted-foreground tabular-nums">
      <ArrowDown className="size-3" />
      {pct(value)} pasa a la siguiente etapa
    </div>
  );
}

export interface FunnelCardProps {
  /** All registry rows — the funnel is all-time, archived included. */
  rows: RegistryRow[];
}

/**
 * Right-column card: the job hunt read as an AARRR ("pirate") funnel.
 * Awareness/Acquisition derive from the rows themselves; the deeper stages come
 * from the per-row milestones (detail drawer › Actualizaciones). Counting is
 * cumulative — see core/funnel.ts.
 */
export function FunnelCard({ rows }: FunnelCardProps) {
  const stages = computeFunnel(rows);
  const sent = stages[1].count;
  const responded = stages[2].count;
  const faceDescription =
    sent > 0
      ? `${responded} ${responded === 1 ? "respuesta" : "respuestas"} de ${sent} ${
          sent === 1 ? "CV enviado" : "CVs enviados"
        } (${pct(stages[2].pctOfPrev)})`
      : "Tu búsqueda leída como funnel de growth.";

  return (
    <PanelCard
      title="Embudo AARRR"
      description="Tu búsqueda como funnel de conversión, etapa por etapa."
      card={(open) => (
        <PanelCardFace
          icon={ChartBarDecreasing}
          title="Embudo AARRR"
          description={faceDescription}
          onOpen={open}
        />
      )}
    >
      {() => (
        <DrawerBody className="gap-4">
          {rows.length === 0 ? (
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ChartBarDecreasing />
                </EmptyMedia>
                <EmptyTitle>Sin datos para el embudo</EmptyTitle>
                <EmptyDescription>
                  Registrá tu primera aplicación desde Nueva aplicación y el funnel arranca solo.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                El pirate funnel (AARRR) de growth marketing, aplicado a tu búsqueda: cada etapa
                cuenta cuántas aplicaciones llegaron al menos hasta ahí, y el % es la conversión
                desde la etapa anterior.
              </p>

              <FunnelChart stages={stages} />

              <div className="flex flex-col">
                {stages.map((stage, index) => (
                  <div key={stage.id} className="flex flex-col">
                    {index > 0 && <Connector value={stage.pctOfPrev} />}
                    <StageBlock stage={stage} index={index} />
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                Las etapas profundas salen de los hitos de cada aplicación (detalle →
                Actualizaciones → Hitos del proceso). Un hito posterior cuenta también los
                anteriores, así el embudo nunca se ensancha.
              </p>
            </>
          )}
        </DrawerBody>
      )}
    </PanelCard>
  );
}
