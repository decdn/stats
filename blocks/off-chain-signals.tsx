import { Fragment } from "react"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

type Signal = {
  label: string
  tier: string
  note: string
  // null = we don't have it verifiably yet. never fill it with an estimate.
  value: string | null
}

const signals: Signal[] = [
  {
    label: "cache hit rate",
    tier: "tier 2",
    note: "node-local metric — needs an opt-in telemetry scrape",
    value: null,
  },
  {
    label: "p95 latency vs cloudfront",
    tier: "tier 3",
    note: "no end-to-end serving histogram yet — measured client-side later",
    value: null,
  },
  {
    label: "countries",
    tier: "gossip",
    note: "operator-reported, spoofable — a signal, not a settlement",
    value: "9",
  },
]

export function OffChainSignals() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>off-chain signals</CardTitle>
        <CardDescription>
          held back until they can be measured honestly
        </CardDescription>
        <CardAction>
          <span className="font-mono text-[10px] tracking-wide whitespace-nowrap text-muted-foreground uppercase sm:text-[11px] sm:tracking-widest">
            pending
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="flex-1 gap-5">
        {signals.map((signal, index) => (
          <Fragment key={signal.label}>
            {index > 0 && <Separator />}
            <dl className="flex items-start justify-between gap-4">
              <dt className="flex flex-col gap-1">
                <span className="flex items-center gap-2">
                  {signal.label}
                  <span className="rounded px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground ring-1 ring-foreground/10">
                    {signal.tier}
                  </span>
                </span>
                <span className="text-sm text-muted-foreground">
                  {signal.note}
                </span>
              </dt>
              <dd className="font-mono text-2xl text-muted-foreground/60 tabular-nums">
                {signal.value ?? (
                  <>
                    <span aria-hidden="true">—</span>
                    <span className="sr-only">not measured yet</span>
                  </>
                )}
              </dd>
            </dl>
          </Fragment>
        ))}
        <Separator className="mt-auto" />
        <p className="text-sm text-muted-foreground">
          a dash means{" "}
          <strong className="font-semibold text-foreground">
            we don&apos;t have it verifiably yet
          </strong>
          . it will never be an estimate — when it appears here, it will be
          measured.
        </p>
      </CardContent>
    </Card>
  )
}
