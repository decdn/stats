"use client"

import { Area, AreaChart, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { MetricPoint } from "@/lib/metrics"

const chartConfig = {
  value: {
    label: "bytes served",
    // Neutral: the accent marks status and growth, not series.
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig

export function BytesServedChart({ series }: { series: MetricPoint[] }) {
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
      <AreaChart
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
        <defs>
          <linearGradient id="fillBytesServed" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-value)"
              stopOpacity={0.25}
            />
            <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          dataKey="value"
          type="monotone"
          fill="url(#fillBytesServed)"
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
      </AreaChart>
    </ChartContainer>
  )
}
