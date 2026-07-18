"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { STATUS_BUCKETS, type FunnelStage } from "@/core/funnel";

/**
 * Each bar segment maps to an application outcome (= status), colored with the
 * shared semantic tokens (globals.css). Order matches STATUS_BUCKETS so the
 * stack reads green → amber → red → gray, left to right.
 */
const chartConfig = {
  accepted: { label: "Aceptado", color: "var(--success)" },
  active: { label: "Activo", color: "var(--warning)" },
  rejected: { label: "Rechazado", color: "var(--destructive)" },
  draft: { label: "Borrador", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

/**
 * The recharts piece of the AARRR funnel: horizontal decreasing bars, one per
 * stage (tagged A/A/A/R/R/R), each stacked by the outcome of the applications
 * that reached it — so you see, per level, how many are en curso (ámbar),
 * terminaron bien (verde) o mal (rojo). Kept in its own module so FunnelCard
 * can load recharts lazily (next/dynamic) when the drawer opens.
 */
export default function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const data = stages.map((stage) => ({
    name: stage.name,
    label: stage.label,
    count: stage.count,
    ...stage.byStatus,
  }));

  return (
    // shrink-0: DrawerBody is a scrolling flex column — without it the fixed
    // chart height gets compressed when the annotations overflow.
    <ChartContainer config={chartConfig} className="aspect-auto h-[264px] w-full shrink-0">
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
      >
        <YAxis
          type="category"
          dataKey="name"
          width={92}
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={{ fontSize: 11 }}
        />
        <XAxis type="number" hide />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent labelFormatter={(_, items) => items?.[0]?.payload?.label ?? ""} />
          }
        />
        {/* Baseline edge stays square; only the outermost segment end is rounded. */}
        {STATUS_BUCKETS.map((bucket, index) => (
          <Bar
            key={bucket}
            dataKey={bucket}
            stackId="funnel"
            fill={`var(--color-${bucket})`}
            barSize={22}
            radius={index === STATUS_BUCKETS.length - 1 ? [0, 4, 4, 0] : 0}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
