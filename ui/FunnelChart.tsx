"use client";

import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { FunnelStage } from "@/core/funnel";

const chartConfig = {
  count: { label: "Aplicaciones" },
} satisfies ChartConfig;

/**
 * The recharts piece of the AARRR funnel: horizontal decreasing bars, one per
 * stage, tagged by the stage initial (A/A/A/R/R/R). Kept in its own module so
 * FunnelCard can load recharts lazily (next/dynamic) when the drawer opens.
 * Educational copy lives outside the SVG, in FunnelCard's annotations.
 */
export default function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  return (
    // shrink-0: DrawerBody is a scrolling flex column — without it the fixed
    // chart height gets compressed when the annotations overflow.
    <ChartContainer config={chartConfig} className="aspect-auto h-[264px] w-full shrink-0">
      <BarChart
        accessibilityLayer
        data={[...stages]}
        layout="vertical"
        margin={{ top: 0, right: 28, bottom: 0, left: 0 }}
      >
        <YAxis
          type="category"
          dataKey="letter"
          width={28}
          tickLine={false}
          axisLine={false}
          interval={0}
        />
        <XAxis type="number" dataKey="count" hide />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideIndicator
              labelFormatter={(_, items) => items?.[0]?.payload?.label ?? ""}
            />
          }
        />
        {/* Rounded on the data end only; the baseline edge stays square. A
            minPointSize sliver keeps zero-count stages visible in the shape. */}
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={22} minPointSize={2}>
          {stages.map((stage, index) => (
            <Cell key={stage.id} fill={`var(--chart-${index + 1})`} />
          ))}
          <LabelList dataKey="count" position="right" className="fill-foreground" fontSize={12} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
