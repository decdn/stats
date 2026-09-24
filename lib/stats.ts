import { cache } from "react"

import type { Stats } from "@/worker/src/stats"

export type {
  DailyPoint,
  HourlyPoint,
  SettlementRow,
  Stats,
} from "@/worker/src/stats"

export type StatsResult =
  | { status: "ok"; stats: Stats }
  // STATS_URL is unset — a cold checkout. The page renders, but the live
  // sections must say "not configured", never a fake empty chain.
  | { status: "unconfigured" }
  // The worker answered 404: the bucket has no stats.json yet (pre-first-tick
  // bootstrap). An expected state, distinct from a broken fetch.
  | { status: "unindexed" }

// Reads the stats.json the worker writes to R2. Throws on 5xx and other
// failures so ISR keeps serving the last successfully rendered page. Every
// block that shows live data calls this; `cache` makes it one fetch and one
// parse per render.
export const getStats = cache(async (): Promise<StatsResult> => {
  const url = process.env.STATS_URL
  if (!url) {
    console.warn("STATS_URL unset — live sections render unconfigured")
    return { status: "unconfigured" }
  }
  const res = await fetch(url, { next: { revalidate: 60 } })
  if (res.status === 404) return { status: "unindexed" }
  if (!res.ok) {
    throw new Error(
      `stats fetch failed: ${res.status} ${res.statusText} (${url})`
    )
  }
  const stats = (await res.json()) as Stats
  // An unknown version (e.g. an old worker's file, before the new worker's
  // first tick) throws too: a live deployment keeps serving its last good
  // render, but a build against it fails.
  if (stats.version !== 2) {
    throw new Error(`unsupported stats.json version ${String(stats.version)}`)
  }
  return { status: "ok", stats }
})
