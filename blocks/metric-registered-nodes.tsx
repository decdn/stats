import { RegisteredNodesChart } from "@/blocks/charts/metric-registered-nodes-chart"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  loadMetric,
  registeredNodesMetric,
  type MetricView,
} from "@/lib/metrics"
import { cn, formatUtcTime } from "@/lib/utils"

function emptyLabel(view: MetricView) {
  switch (view.status) {
    case "unconfigured":
      return "live data not configured"
    case "catching-up":
      return `catching up · block ${view.lastBlock}`
    default:
      return "not indexed yet"
  }
}

export async function MetricRegisteredNodes() {
  const view = await loadMetric(registeredNodesMetric)
  const metric = view.status === "ok" ? view.metric : null
  const staleSince = view.status === "ok" ? view.staleSince : null
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-medium">registered nodes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1.5">
          <span className="text-5xl font-medium tracking-tight tabular-nums md:text-6xl">
            {metric?.value ?? "—"}
          </span>
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
        {staleSince !== null && (
          <p className="text-sm text-muted-foreground">
            as of {formatUtcTime(staleSince)} utc
          </p>
        )}
        {metric ? (
          <RegisteredNodesChart series={metric.series} />
        ) : (
          <p className="flex h-24 items-center justify-center font-mono text-xs text-muted-foreground lowercase">
            {emptyLabel(view)}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <p className="font-mono text-[11px]">
          <span className="text-muted-foreground">events</span>{" "}
          <span className="text-foreground">
            CapacityBond.NodeRegistered · NodeDeregistered · NodeAutoEjected
          </span>
        </p>
      </CardFooter>
    </Card>
  )
}
