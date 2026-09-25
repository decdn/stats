import { staleSince } from "@/lib/metrics"
import { getStats } from "@/lib/stats"
import { cn, formatUtcTime } from "@/lib/utils"

type HeroState = {
  headline: string
  // the green square only ever sits next to a healthy, current index.
  live: boolean
  meta: string
}

// The headline is the page's one claim about the network, so it comes from
// the same status the metric cards use rather than being fixed copy.
async function loadHeroState(): Promise<HeroState> {
  const result = await getStats()
  if (result.status === "unconfigured") {
    return {
      headline: "not connected",
      live: false,
      meta: "live data not configured",
    }
  }
  if (result.status === "unindexed") {
    return {
      headline: "waiting for the first index",
      live: false,
      meta: "no stats written yet",
    }
  }
  const { stats } = result
  if (!stats.caughtUp) {
    return {
      headline: "catching up",
      live: false,
      meta: `indexing · block ${stats.lastBlock}`,
    }
  }
  const stale = staleSince(stats)
  if (stale !== null) {
    return {
      headline: "the index has stalled",
      live: false,
      meta: `last indexed ${formatUtcTime(stale)} utc`,
    }
  }
  return {
    headline: "the network is on",
    live: true,
    meta: `indexed ${formatUtcTime(Date.parse(stats.updatedAt) / 1000)} utc`,
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
