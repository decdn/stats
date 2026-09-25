import { cache } from "react"

import { parseStats, type Stats } from "@/worker/src/stats"

export type {
  DailyPoint,
  HourlyPoint,
  SettlementRow,
  Stats,
} from "@/worker/src/stats"

export type StatsResult =
  | { status: "ok"; stats: Stats }
  // STATS_BASE_URL or CHAIN_ID is unset — a cold checkout. The page renders,
  // but the live sections must say "not configured", never a fake empty chain.
  | { status: "unconfigured" }
  // The bucket has no usable stats file yet: the worker answered 404
  // (pre-first-tick bootstrap), or the file predates the current schema and
  // the worker's next tick re-indexes over it. An expected state, distinct
  // from a broken fetch.
  | { status: "unindexed" }

// Reads `${STATS_BASE_URL}/stats-${CHAIN_ID}.json`, the file the worker
// writes to R2. Throws on 5xx and other failures so ISR keeps serving the
// last successfully rendered page. Every block that shows live data calls
// this; `cache` makes it one fetch and one parse per render.
export const getStats = cache(async (): Promise<StatsResult> => {
  const base = process.env.STATS_BASE_URL
  const chainId = process.env.CHAIN_ID
  if (!base || !chainId) {
    console.warn(
      "STATS_BASE_URL or CHAIN_ID unset — live sections render unconfigured"
    )
    return { status: "unconfigured" }
  }
  const url = `${base.replace(/\/$/, "")}/stats-${chainId}.json`
  const res = await fetch(url, { next: { revalidate: 60 } })
  if (res.status === 404) return { status: "unindexed" }
  if (!res.ok) {
    throw new Error(
      `stats fetch failed: ${res.status} ${res.statusText} (${url})`
    )
  }
  const stats = parseStats(await res.text())
  if (!stats) {
    console.warn(`${url} does not match the current stats schema`)
    return { status: "unindexed" }
  }
  if (String(stats.chainId) !== chainId) {
    throw new Error(`${url} is for chain ${stats.chainId}, expected ${chainId}`)
  }
  return { status: "ok", stats }
})
