"use client"

import { Area, AreaChart, XAxis, YAxis } from "recharts"

import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { activeNodesMetric } from "@/lib/mock"

const chartConfig = {
  value: {
    label: "active nodes",
    color: "var(--accent-green)",
  },
} satisfies ChartConfig

const lastIndex = activeNodesMetric.series.length - 1

const values = activeNodesMetric.series.map((point) => point.value)
const minValue = Math.min(...values)
const maxValue = Math.max(...values)
const spread = maxValue - minValue || 1
const yDomain: [number, number] = [
  minValue - spread * 0.8,
  maxValue + spread * 0.2,
]

export function MetricActiveNodes() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-[11px] font-normal tracking-widest text-muted-foreground uppercase">
          active nodes
        </CardTitle>
        <CardAction>
          <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] text-muted-foreground ring-1 ring-foreground/10">
            <span className="size-1.5 rounded-full bg-accent-green" />
            on-chain
          </span>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-5xl tracking-tight tabular-nums md:text-6xl">
            {activeNodesMetric.value}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">bonded &amp; serving</p>
        <p className="text-sm">
          <span className="font-mono text-accent-green">
            {activeNodesMetric.delta}
          </span>{" "}
          <span className="text-muted-foreground">in the last 24h</span>
        </p>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-24 w-full"
        >
          <AreaChart
            accessibilityLayer
            data={activeNodesMetric.series}
            margin={{ left: 4, right: 6, top: 6, bottom: 0 }}
          >
            <XAxis dataKey="t" hide />
            <YAxis hide domain={yDomain} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <defs>
              <linearGradient id="fillActiveNodes" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-value)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-value)"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey="value"
              type="natural"
              fill="url(#fillActiveNodes)"
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
      </CardContent>
      <CardFooter>
        <p className="font-mono text-[11px]">
          <span className="text-muted-foreground/60">call</span>{" "}
          <span className="text-muted-foreground">
            CapacityBond.getActiveNodeCount()
          </span>
        </p>
      </CardFooter>
    </Card>
  )
}
