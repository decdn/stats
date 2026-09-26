"use client"

import { useStats, type Stats, type StatsResult } from "@/lib/stats"
import { cn, formatBytes, formatUsdc, formatUtcTime } from "@/lib/utils"
import { utcDate } from "@/worker/src/stats"

const explorerUrl = "https://sepolia.arbiscan.io"

// No settlement within this long of the worker's last write reads as quiet:
// a network that hasn't settled in a day isn't "on" in any sense a reader
// would check.
const quietAfterSeconds = 24 * 60 * 60

type LastSettlement = {
  when: string
  value: string
  bytes: string
  txHref: string
}

// "on" can't be built without the settlement that backs it.
type HeroState =
  | { status: "on"; meta: string; last: LastSettlement }
  | { status: "quiet"; meta: string; last: LastSettlement | null }
  | { status: "neutral"; meta: string }

const headlines = {
  on: "the network is on",
  quiet: "the network is quiet",
  neutral: "network status",
} as const

// The headline is backed by the newest settlement, measured against the
// worker's last write (updatedAt), not the wall clock: a stale stats.json
// means the worker or its RPC is lagging, not that nodes stopped, so a
// stalled worker leaves the last verdict standing and lag shows only in the
// meta line's timestamp. The one exception is mid-backfill: the newest
// indexed settlement isn't the newest on chain, so the headline goes neutral
// until the index catches up.
function heroState(result: StatsResult): HeroState {
  if (result.status === "loading") return neutral("loading")
  if (result.status === "error") return neutral("stats unavailable")
  if (result.status === "unindexed") {
    return neutral("waiting for the first index")
  }
  const { stats } = result
  if (!stats.caughtUp) return neutral(`indexing · block ${stats.lastBlock}`)
  // asStats guarantees updatedAt parses (see settle() in lib/stats.tsx).
  const indexedAt = Date.parse(stats.updatedAt) / 1000
  const meta = `indexed ${formatUtcTime(indexedAt)} utc`
  const latest = stats.settlements.at(0)
  if (!latest) return { status: "quiet", meta, last: null }
  const last = lastSettlement(latest, indexedAt)
  return indexedAt - latest.timestamp <= quietAfterSeconds
    ? { status: "on", meta, last }
    : { status: "quiet", meta, last }
}

function neutral(meta: string): HeroState {
  return { status: "neutral", meta }
}

// Time only when it's the same UTC day as the index, else date and time.
function lastSettlement(
  row: Stats["settlements"][number],
  indexedAt: number
): LastSettlement {
  const at = formatUtcTime(row.timestamp)
  const sameDay = utcDate(row.timestamp) === utcDate(indexedAt)
  return {
    when: sameDay ? at.slice(11) : at,
    value: formatUsdc(row.amount),
    bytes: formatBytes(Number(row.bytesDelivered)),
    txHref: `${explorerUrl}/tx/${row.txHash}`,
  }
}

export function Hero() {
  const state = heroState(useStats())
  const live = state.status === "on"
  const last = state.status === "neutral" ? null : state.last
  return (
    <section className="pt-6">
      <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
        {state.meta}
      </p>
      <h1 className="mt-6 text-5xl leading-[1.05] font-medium tracking-tight text-balance lowercase sm:text-6xl md:text-7xl">
        {headlines[state.status]}
        <span
          aria-hidden="true"
          className={cn(
            "ml-2 inline-block size-3 align-baseline md:size-4",
            live ? "bg-accent-green" : "bg-muted-foreground/40"
          )}
        />
        <span className="sr-only">.</span>
      </h1>
      {last && (
        <p className="mt-6 text-lg leading-snug tabular-nums sm:text-xl">
          last settlement at {last.when} utc paid {last.value} usdc for{" "}
          {last.bytes} served.{" "}
          <a
            href={last.txHref}
            target="_blank"
            rel="noreferrer"
            className="whitespace-nowrap text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            check the tx<span aria-hidden="true"> ↗</span>
          </a>
        </p>
      )}
      <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
        you don&apos;t have to trust us. every figure below is read from
        contract logs on arbitrum sepolia, nothing annualized or projected, and
        every settlement links to its transaction.
      </p>
    </section>
  )
}
