import { getCloudflareContext } from "@opennextjs/cloudflare"
import { cache } from "react"

import { parseStats, type Stats } from "@/worker/src/stats"
import { statsStore } from "@/worker/src/store"

export type {
  DailyPoint,
  HourlyPoint,
  SettlementRow,
  Stats,
} from "@/worker/src/stats"

export type StatsResult =
  | { status: "ok"; stats: Stats }
  // CHAIN_ID is unset. The page renders, but the live sections must say "not
  // configured", never a fake empty chain.
  | { status: "unconfigured" }
  // The bucket has no usable stats file yet: nothing written (pre-first-tick
  // bootstrap), or the file predates the current schema and the cron's next
  // tick re-indexes over it. An expected state, distinct from a broken read.
  | { status: "unindexed" }

// Reads `stats-${CHAIN_ID}.json`, the file the cron writes, from the same
// store the cron uses (the STATS binding, or R2's S3 API when R2_* creds are
// set). Throws on a failed read so ISR keeps serving the last successfully
// rendered page. Every block that shows live data calls this; `cache` makes
// it one read and one parse per render.
export const getStats = cache(async (): Promise<StatsResult> => {
  const { env } = await getCloudflareContext({ async: true })
  const chainId = env.CHAIN_ID
  if (!chainId) {
    console.warn("CHAIN_ID unset — live sections render unconfigured")
    return { status: "unconfigured" }
  }
  const store = statsStore(env)
  const body = await store.get()
  if (body === null) return { status: "unindexed" }
  const stats = parseStats(body)
  if (!stats) {
    console.warn(`${store.label} does not match the current stats schema`)
    return { status: "unindexed" }
  }
  if (String(stats.chainId) !== chainId) {
    throw new Error(
      `${store.label} is for chain ${stats.chainId}, expected ${chainId}`
    )
  }
  return { status: "ok", stats }
})
