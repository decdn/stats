import { getStats } from "@/lib/stats"
import { cn, formatUtcTime } from "@/lib/utils"

type HeroState = {
  headline: string
  live: boolean
  meta: string
}

// The headline is about the network, not the indexer. stats.json going stale
// or catching up means the worker (or the public RPC it reads) is lagging —
// a rate limit or a blip — which says nothing about whether nodes are
// serving, so index health only ever shows in the meta line. The headline
// changes only when there's no indexed data to stand on at all.
async function loadHeroState(): Promise<HeroState> {
  const result = await getStats()
  if (result.status === "unconfigured") {
    return {
      headline: "network status",
      live: false,
      meta: "live data not configured",
    }
  }
  if (result.status === "unindexed") {
    return {
      headline: "network status",
      live: false,
      meta: "waiting for the first index",
    }
  }
  const { stats } = result
  const updatedAt = formatUtcTime(Date.parse(stats.updatedAt) / 1000)
  return {
    headline: "the network is on",
    live: true,
    meta: stats.caughtUp
      ? `indexed ${updatedAt} utc`
      : `indexing · block ${stats.lastBlock}`,
  }
}

export async function Hero() {
  const { headline, live, meta } = await loadHeroState()
  return (
    <section>
      <div className="border-t border-border" />
      <div className="flex items-center justify-between gap-4 pt-3 font-mono text-[10px] tracking-wide text-muted-foreground uppercase sm:text-[11px] sm:tracking-widest">
        <span className="whitespace-nowrap">arbitrum sepolia</span>
        <span className="truncate">{meta}</span>
      </div>
      <h1 className="mt-10 text-5xl leading-[1.05] font-medium tracking-tight lowercase sm:text-6xl md:text-7xl">
        {headline}
        <span
          aria-hidden="true"
          className={cn(
            "ml-2 inline-block size-3 align-baseline md:size-4",
            live ? "bg-accent-green" : "bg-muted-foreground/40"
          )}
        />
        <span className="sr-only">.</span>
      </h1>
      <p className="mt-8 max-w-[65ch] text-base leading-relaxed text-muted-foreground lowercase">
        every headline figure below is{" "}
        <strong className="font-semibold text-foreground">
          raw on-chain state
        </strong>{" "}
        read from arbitrum sepolia — nothing annualized, projected, or invented.
        value settled, bytes served and registered nodes are the three numbers
        no operator can fake. verify any settlement yourself on the block
        explorer.
      </p>
    </section>
  )
}
