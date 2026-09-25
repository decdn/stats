"use client"

import { BytesServedChart } from "@/blocks/charts/metric-bytes-served-chart"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { metricView, bytesServedMetric, type MetricView } from "@/lib/metrics"
import { useStats } from "@/lib/stats"
import { cn, formatUtcTime } from "@/lib/utils"

// No default: a status added to MetricView fails to compile here instead of
// borrowing another status's label.
function emptyLabel(view: MetricView): string {
  switch (view.status) {
    case "loading":
      return "loading"
    case "error":
      return "stats unavailable"
    case "catching-up":
      return `catching up · block ${view.lastBlock}`
    case "unindexed":
      return "no settlements indexed yet"
    case "ok":
      // not rendered: the chart shows instead
      return ""
  }
}

export function MetricBytesServed() {
  const view = metricView(useStats(), bytesServedMetric)
  const metric = view.status === "ok" ? view.metric : null
  const staleSince = view.status === "ok" ? view.staleSince : null
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-medium">bytes served</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-5xl tracking-tight tabular-nums md:text-6xl">
            {metric?.value ?? "—"}
          </span>
          {metric?.unit && (
            <span className="font-mono text-xl text-muted-foreground">
              {metric.unit}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          summed from settlement logs
        </p>
        {metric?.delta && staleSince === null && (
          <p className="text-sm">
            <span
              className={cn(
                "font-mono",
                metric.delta.up ? "text-accent-green" : "text-muted-foreground"
              )}
            >
              {metric.delta.text}
            </span>{" "}
            <span className="text-muted-foreground">in the last 24h</span>
          </p>
        )}
        {staleSince !== null && (
          <p className="text-sm text-muted-foreground">
            as of {formatUtcTime(staleSince)} utc
          </p>
        )}
        {metric ? (
          <BytesServedChart series={metric.series} />
        ) : (
          <p className="flex h-24 items-center justify-center font-mono text-xs text-muted-foreground lowercase">
            {emptyLabel(view)}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <p className="font-mono text-[11px]">
          <span className="text-muted-foreground/60">event</span>{" "}
          <span className="text-muted-foreground">
            FeeRouter.Settled · field bytesDelivered
          </span>
        </p>
      </CardFooter>
    </Card>
  )
}
