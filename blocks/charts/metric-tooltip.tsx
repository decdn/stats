"use client"

import type { ComponentProps } from "react"

import { ChartTooltipContent } from "@/components/ui/chart"

// Omits the shadcn props this tooltip sets or draws itself, so passing one is
// a type error rather than silently ignored.
type MetricTooltipProps = Omit<
  ComponentProps<typeof ChartTooltipContent>,
  "formatter" | "indicator" | "hideLabel" | "labelFormatter"
> & {
  seriesLabel: string
  unit?: string
  fractionDigits?: number
}

// A single-series metric chart's hover card: the hour, then the series name
// and its value in the headline's unit and precision, with the headline's
// locale-free number format. Rendered through the shadcn tooltip's
// `formatter`, which replaces its whole row, so the row redraws the line
// indicator and the hour label itself.
export function MetricTooltipContent({
  seriesLabel,
  unit,
  fractionDigits = 0,
  ...props
}: MetricTooltipProps) {
  return (
    <ChartTooltipContent
      {...props}
      indicator="line"
      formatter={(value, _name, item) => (
        <>
          <div
            className="w-1 shrink-0 rounded-[2px]"
            style={{ backgroundColor: item.color }}
          />
          <div className="flex flex-1 items-end justify-between gap-1 leading-none">
            <div className="grid gap-1.5">
              <span className="font-medium">{props.label}</span>
              <span className="text-muted-foreground">{seriesLabel}</span>
            </div>
            <span className="font-mono font-medium text-foreground tabular-nums">
              {Number(value).toFixed(fractionDigits)}
              {unit && (
                <span className="ml-1 text-muted-foreground">{unit}</span>
              )}
            </span>
          </div>
        </>
      )}
    />
  )
}
