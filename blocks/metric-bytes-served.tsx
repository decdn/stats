"use client"

import { BytesServedChart } from "@/blocks/charts/metric-bytes-served-chart"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Cursor } from "@/globals/Cursor/cursor"
import { metricView, bytesServedMetric, type MetricView } from "@/lib/metrics"
import { useStats } from "@/lib/stats"
import { cn, enterClass, formatUtcTime } from "@/lib/utils"

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
        <CardTitle role="heading" aria-level={3} className="font-medium">
          bytes served
        </CardTitle>
      </CardHeader>
      <CardContent className={enterClass(view.status === "loading")}>
        <div className="flex items-baseline gap-1.5">
          <span className="type-figure">{metric?.value ?? "—"}</span>
          {metric?.unit && <span className="type-unit">{metric.unit}</span>}
        </div>
        {metric?.delta && staleSince === null && (
          <p className="text-sm">
            <span
              className={cn(
                "tabular-nums",
                metric.delta.up ? "text-accent-green" : "text-muted-foreground"
              )}
            >
              {metric.delta.text}
            </span>{" "}
            <span className="text-muted-foreground">in the last 24h</span>
          </p>
        )}
        {view.status === "loading" && (
          // Holds the delta's line so the card doesn't grow when stats land.
          <p aria-hidden="true" className="invisible text-sm">
            &nbsp;
          </p>
        )}
        {staleSince !== null && (
          <p className="text-sm text-muted-foreground">
            as of {formatUtcTime(staleSince)} utc
          </p>
        )}
        {metric ? (
          <BytesServedChart series={metric.series} unit={metric.unit} />
        ) : (
          <p className="flex h-24 items-center justify-center font-mono text-xs text-muted-foreground lowercase">
            {emptyLabel(view)}
            {view.status === "loading" && <Cursor />}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <p className="type-footnote">
          <span className="text-muted-foreground">event</span>{" "}
          <span className="text-foreground">
            FeeRouter.Settled · field bytesDelivered
          </span>
        </p>
      </CardFooter>
    </Card>
  )
}
