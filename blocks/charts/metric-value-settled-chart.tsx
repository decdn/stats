"use client"

import { Area, AreaChart, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"
import { MetricTooltipContent } from "@/blocks/charts/metric-tooltip"
import type { MetricPoint } from "@/lib/metrics"

const chartConfig = {
  value: {
    label: "value settled",
    color: "var(--accent-green)",
  },
} satisfies ChartConfig

export function ValueSettledChart({
  series,
  unit,
}: {
  series: MetricPoint[]
  unit?: string
}) {
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
        // A named image rather than recharts' default unnamed application; it
        // stays focusable, so the arrow keys still step the tooltip for sighted
        // keyboard users. aria-label, not title: an svg <title> shows as a
        // native hover tooltip over recharts' own.
        role="img"
        aria-label="value settled, all-time total at the end of each of the last 24 hours"
        data={series}
        margin={{ left: 4, right: 6, top: 6, bottom: 0 }}
      >
        <XAxis dataKey="t" hide />
        <YAxis hide domain={yDomain} />
        <ChartTooltip
          cursor={false}
          content={
            <MetricTooltipContent
              seriesLabel={chartConfig.value.label}
              unit={unit}
              fractionDigits={2}
            />
          }
        />
        <defs>
          <linearGradient id="fillValueSettled" x1="0" y1="0" x2="0" y2="1">
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
          fill="url(#fillValueSettled)"
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
