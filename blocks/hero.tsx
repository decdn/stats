"use client"

import { useStats, type StatsResult } from "@/lib/stats"
import { cn, enterClass, formatUtcTime } from "@/lib/utils"

type HeroState = { status: "on" | "neutral"; meta: string }

const headlines = {
  on: "the network is on",
  neutral: "network status",
} as const

// The headline is about the network, not the indexer, so once stats load it
// reads "on": a stale stats.json means the worker or its RPC is lagging, not
// that nodes stopped, and lag shows only in the meta line's timestamp. The
// one exception is mid-backfill, when the headline goes neutral until the
// index catches up.
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
  return { status: "on", meta: `indexed ${formatUtcTime(indexedAt)} utc` }
}

function neutral(meta: string): HeroState {
  return { status: "neutral", meta }
}

// What the status region announces. It changes only when the load state, the
// backfill (indexing, then caught up) or the headline does, so the 60s
// refresh stays silent. No default: a status
// added to StatsResult fails to compile here.
function announcement(result: StatsResult, state: HeroState): string {
  switch (result.status) {
    case "loading":
      return ""
    case "error":
      return "stats unavailable"
    case "unindexed":
      return "waiting for the first index"
    case "ok":
      return result.stats.caughtUp ? headlines[state.status] : "indexing"
  }
}

export function Hero() {
  const result = useStats()
  const state = heroState(result)
  const live = state.status === "on"
  const enter = enterClass(result.status === "loading")
  return (
    <section className="pt-6">
      <p className={cn("type-micro", enter)}>{state.meta}</p>
      <h1 className={cn("mt-6 type-h1 text-balance lowercase", enter)}>
        {headlines[state.status]}
        <span
          aria-hidden="true"
          className={cn(
            "ml-2 inline-block size-2 align-baseline md:size-3",
            result.status === "loading"
              ? "animate-cursor bg-foreground"
              : live
                ? "bg-accent-green"
                : "bg-muted-foreground/40"
          )}
        />
        <span className="sr-only">.</span>
      </h1>
      {/* Rendered empty in the static HTML, so the first change announces. */}
      <p role="status" className="sr-only">
        {announcement(result, state)}
      </p>
      <p className="mt-6 max-w-[60ch] type-prose">
        you don&apos;t have to trust us. every figure below is read from
        contract logs on arbitrum sepolia, nothing annualized or projected, and
        every settlement links to its transaction.
      </p>
    </section>
  )
}
