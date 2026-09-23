import { ValueSettledChart } from "@/blocks/metric-value-settled-chart"
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { loadMetric, valueSettledMetric } from "@/lib/metrics"
import { cn } from "@/lib/utils"

export async function MetricValueSettled() {
  const view = await loadMetric(valueSettledMetric)
  const { metric } = view
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-[11px] font-normal tracking-widest text-muted-foreground uppercase">
          value settled
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
            {metric?.value ?? "—"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          testnet-usdc · 6-decimal base units
        </p>
        {metric?.delta && (
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
        {metric ? (
          <ValueSettledChart series={metric.series} />
        ) : (
          <p className="flex h-24 items-center justify-center font-mono text-xs text-muted-foreground lowercase">
            {view.emptyLabel}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <p className="font-mono text-[11px]">
          <span className="text-muted-foreground/60">event</span>{" "}
          <span className="text-muted-foreground">
            FeeRouter.Settled · field amount
          </span>
        </p>
      </CardFooter>
    </Card>
  )
}
