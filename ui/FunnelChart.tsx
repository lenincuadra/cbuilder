"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { STATUS_BUCKETS, type StatusBucket, type FunnelStage } from "@/core/funnel";

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

/** "N%" of the stage total for a bucket count. */
function share(value: number, total: number): string {
  return `${total > 0 ? Math.round((value / total) * 100) : 0}%`;
}

/**
 * Custom tooltip: buckets present at the hovered stage, reversed vs the stack
 * (gray → red → amber → green), number first, with each one's % of the stage
 * total. Empty buckets are hidden.
 */
function FunnelTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, number | string> }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const total = Number(row.count) || 0;
  const items = [...STATUS_BUCKETS]
    .reverse()
    .map((bucket) => ({ bucket, value: Number(row[bucket]) || 0 }))
    .filter(({ value }) => value > 0);
  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-xl">
      <div className="mb-1 font-medium">{row.label}</div>
      <div className="flex flex-col gap-1">
        {items.map(({ bucket, value }) => (
          <div key={bucket} className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-[2px]"
              style={{ background: chartConfig[bucket].color }}
            />
            <span className="font-medium tabular-nums">{value}</span>
            <span className="text-muted-foreground tabular-nums">({share(value, total)})</span>
            <span className="ml-auto pl-3">{chartConfig[bucket].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The recharts piece of the AARRR funnel: horizontal decreasing bars, one per
 * stage, each stacked by the outcome of the applications that reached it — so
 * you see, per level, how many are en curso (ámbar), terminaron bien (verde) o
 * mal (rojo). Kept in its own module so FunnelCard can load recharts lazily
 * (next/dynamic) when the drawer opens.
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
        <ChartTooltip cursor={false} content={<FunnelTooltip />} />
        {/* Baseline edge stays square; only the outermost segment end is rounded. */}
        {STATUS_BUCKETS.map((bucket: StatusBucket, index) => (
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
