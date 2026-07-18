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
import type { ApplicationStatus, RegistryRow } from "@/core/registry/types";
import { PanelCard, PanelCardFace } from "@/ui/PanelCard";
import { statusDotClass } from "@/ui/StatusToggle";

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

/** Status → color legend: the four bar/stepper colors and what they mean. */
const STATUS_LEGEND: Array<{ status: ApplicationStatus; hint: string }> = [
  { status: "Aceptado", hint: "terminó bien" },
  { status: "Activo", hint: "en curso" },
  { status: "Rechazado", hint: "terminó mal" },
  { status: "Borrador", hint: "sin CV" },
];

/** Vertical (stacked) on mobile, horizontal (single row) on desktop. */
function StatusLegend() {
  return (
    <div className="flex flex-col gap-y-2 rounded-lg border p-3 md:flex-row md:flex-wrap md:items-center md:gap-x-5">
      {STATUS_LEGEND.map(({ status, hint }) => (
        <span key={status} className="flex items-center gap-1.5 text-xs">
          <span className={`size-2.5 shrink-0 rounded-full ${statusDotClass(status)}`} />
          <span className="font-medium">{status}</span>
          <span className="text-muted-foreground">· {hint}</span>
        </span>
      ))}
    </div>
  );
}

/** One stage: AARRR name + ES label + numbers, then the educational copy. */
function StageBlock({ stage }: { stage: FunnelStage }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="shrink-0 rounded-[4px] border border-border px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          {stage.name}
        </span>
        <span className="text-sm font-medium">{stage.label}</span>
        <span className="ml-auto text-sm tabular-nums">
          {stage.count}
          <span className="ml-1 text-xs text-muted-foreground">({pct(stage.pctOfTotal)})</span>
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{stage.marketing}</p>
      <p className="text-xs text-muted-foreground">En tu búsqueda: {stage.jobHunt}</p>
    </div>
  );
}

/** Conversion connector between two consecutive stages (the funnel-literacy core). */
function Connector({ value }: { value: number | null }) {
  return (
    <div className="flex items-center gap-1 py-1 pl-6 text-xs text-muted-foreground tabular-nums">
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
 * cumulative and each level is split by outcome/status color — see core/funnel.ts.
 * On desktop the drawer widens to a two-column layout: legend left, chart right.
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
      contentClassName="data-[vaul-drawer-direction=right]:sm:max-w-5xl"
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
                desde la etapa anterior. El color de cada barra es el estado de la aplicación.
              </p>

              {/* Color legend: vertical on mobile, horizontal full-width on desktop. */}
              <StatusLegend />

              <div className="flex flex-col gap-4 md:grid md:grid-cols-[3fr_1fr] md:gap-x-6">
                {/* Chart: wider left column (3fr), sticky. */}
                <div className="md:sticky md:top-0 md:self-start">
                  <FunnelChart stages={stages} />
                </div>

                {/* Stage list ("leyendas"): right column (1fr). */}
                <div className="flex flex-col gap-3">
                  {stages.map((stage, index) => (
                    <div key={stage.id} className="flex flex-col">
                      {index > 0 && <Connector value={stage.pctOfPrev} />}
                      <StageBlock stage={stage} />
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Las etapas profundas salen de los hitos de cada aplicación (detalle →
                Actualizaciones → Seguimiento del proceso). Un hito posterior cuenta también los
                anteriores, así el embudo nunca se ensancha.
              </p>
            </>
          )}
        </DrawerBody>
      )}
    </PanelCard>
  );
}
