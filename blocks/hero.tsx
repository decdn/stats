"use client"

import { useStats, type StatsResult } from "@/lib/stats"
import { cn, formatUtcTime } from "@/lib/utils"

// No settlement within this long of the worker's last write reads as quiet:
// a network that hasn't settled in a day isn't "on" in any sense a reader
// would check.
const quietAfterSeconds = 24 * 60 * 60

type HeroState = { status: "on" | "quiet" | "neutral"; meta: string }

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
  const on = latest && indexedAt - latest.timestamp <= quietAfterSeconds
  return { status: on ? "on" : "quiet", meta }
}

function neutral(meta: string): HeroState {
  return { status: "neutral", meta }
}

export function Hero() {
  const state = heroState(useStats())
  const live = state.status === "on"
  return (
    <section className="pt-6">
      <p className="type-micro">{state.meta}</p>
      <h1 className="mt-6 type-h1 text-balance lowercase">
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
      <p className="mt-6 max-w-[60ch] type-prose">
        you don&apos;t have to trust us. every figure below is read from
        contract logs on arbitrum sepolia, nothing annualized or projected, and
        every settlement links to its transaction.
      </p>
    </section>
  )
}
