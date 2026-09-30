"use client"

import { Line, LineChart, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"
import { MetricTooltipContent } from "@/blocks/charts/metric-tooltip"
import type { MetricPoint } from "@/lib/metrics"

const chartConfig = {
  value: {
    label: "registered nodes",
    color: "var(--accent-green)",
  },
} satisfies ChartConfig

export function RegisteredNodesChart({ series }: { series: MetricPoint[] }) {
  const lastIndex = series.length - 1
  const values = series.map((point) => point.value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const spread = maxValue - minValue || 1
  const yDomain: [number, number] = [
    minValue - spread * 0.8,
    maxValue + spread * 0.2,
  ]

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-24 w-full">
      <LineChart
        accessibilityLayer
        // A named image rather than recharts' default unnamed application; it
        // stays focusable, so the arrow keys still step the tooltip.
        role="img"
        title="registered nodes at the end of each of the last 24 hours"
        data={series}
        margin={{ left: 4, right: 6, top: 6, bottom: 0 }}
      >
        <XAxis dataKey="t" hide />
        <YAxis hide domain={yDomain} />
        <ChartTooltip
          cursor={false}
          content={
            <MetricTooltipContent seriesLabel={chartConfig.value.label} />
          }
        />
        {/* A count moves in steps, and the Y domain puts a flat count near
            the top, so a filled area would make a quiet day the heaviest
            shape in the row. */}
        <Line
          dataKey="value"
          type="stepAfter"
          stroke="var(--color-value)"
          strokeWidth={1.5}
          isAnimationActive={false}
          dot={(props: { cx?: number; cy?: number; index?: number }) =>
            props.index === lastIndex ? (
              <circle
                key="last-point"
                cx={props.cx}
                cy={props.cy}
                r={3}
                fill="var(--color-value)"
              />
            ) : (
              <g key={`empty-${props.index}`} />
            )
          }
        />
      </LineChart>
    </ChartContainer>
  )
}
