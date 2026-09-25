"use client"

import { Line, LineChart, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { MetricPoint } from "@/lib/metrics"

const chartConfig = {
  value: {
    label: "registered nodes",
    // Neutral: the accent is reserved for liveness and growth.
    color: "var(--muted-foreground)",
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
        data={series}
        margin={{ left: 4, right: 6, top: 6, bottom: 0 }}
      >
        <XAxis dataKey="t" hide />
        <YAxis hide domain={yDomain} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="line" />}
        />
        {/* A count moves in steps; a filled area would make a flat week the
            heaviest shape in the row. */}
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
