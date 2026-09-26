"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

import { asStats, type Stats } from "@/worker/src/stats"

export type {
  DailyPoint,
  HourlyPoint,
  SettlementRow,
  Stats,
} from "@/worker/src/stats"

// The indexer writes stats-<CHAIN_ID>.json: keep this in step with CHAIN_ID
// in wrangler.jsonc.
const chainId = 421614

// The cron's bucket (wrangler.jsonc `STATS`), served publicly. It needs the
// CORS policy in r2-cors.json for the browser to read it.
// NEXT_PUBLIC_STATS_URL (.env) overrides it at build time.
const statsUrl =
  process.env.NEXT_PUBLIC_STATS_URL ||
  `https://data.decdn.org/stats-${chainId}.json`

// The file's cache-control max-age, which the indexer sets.
const refreshMs = 60_000
const fetchTimeoutMs = 15_000

export type StatsResult =
  // Before the first fetch settles; also what the static HTML renders.
  | { status: "loading" }
  // `checkedAt` (ms) is the last fetch attempt, failed or not: staleness is
  // judged against it, so a page whose refreshes fail still flags old data.
  | { status: "ok"; stats: Stats; checkedAt: number }
  // The bucket has no usable stats file yet: nothing written (pre-first-tick
  // bootstrap; R2 sends the CORS headers on the 404 too, so the page can read
  // it), or the file predates the current schema and the cron's next tick
  // re-indexes over it. An expected state, distinct from a broken read.
  | { status: "unindexed" }
  // The first fetch failed (network, CORS, timeout, a non-404 error, a body
  // that isn't JSON, the wrong chain).
  | { status: "error" }

type Fetched = { status: "ok"; stats: Stats } | { status: "unindexed" }

// Throws on a failed read, so the provider can keep the last good result.
async function fetchStats(signal: AbortSignal): Promise<Fetched> {
  const res = await fetch(statsUrl, { signal })
  if (res.status === 404) {
    console.warn(`${statsUrl}: 404, treating as not indexed yet`)
    return { status: "unindexed" }
  }
  if (!res.ok) throw new Error(`${statsUrl}: ${res.status} ${res.statusText}`)
  // res.json() throws on a body that isn't JSON: a broken read, not a schema.
  const stats = asStats(await res.json())
  if (!stats) {
    console.warn(`${statsUrl} does not match the current stats schema`)
    return { status: "unindexed" }
  }
  if (stats.chainId !== chainId) {
    throw new Error(`${statsUrl} is for chain ${stats.chainId}, not ${chainId}`)
  }
  return { status: "ok", stats }
}

// The next result after a fetch (`fetched` is null when it threw). Once the
// page has shown stats, only newer stats replace them: a failure, an
// unindexed file or an older copy (a stale cache) keeps them on screen,
// re-checked for staleness. Before that, a failure shows the error.
function settle(
  current: StatsResult,
  fetched: Fetched | null,
  checkedAt: number
): StatsResult {
  if (current.status === "ok") {
    // asStats guarantees both updatedAt values parse.
    const newer =
      fetched?.status === "ok" &&
      Date.parse(fetched.stats.updatedAt) >= Date.parse(current.stats.updatedAt)
    return newer ? { ...fetched, checkedAt } : { ...current, checkedAt }
  }
  if (fetched?.status === "ok") return { ...fetched, checkedAt }
  if (fetched) return fetched
  return current.status === "loading" ? { status: "error" } : current
}

const StatsContext = createContext<StatsResult | null>(null)

// Fetches the stats file on mount, then every refreshMs while the tab is
// visible and again when it becomes visible. A new fetch aborts one still in
// flight, so an old response never lands over a newer one.
export function StatsProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<StatsResult>({ status: "loading" })

  useEffect(() => {
    let inFlight: AbortController | null = null
    async function refresh() {
      inFlight?.abort()
      const controller = new AbortController()
      inFlight = controller
      const timeout = setTimeout(
        () => controller.abort(new Error(`${statsUrl}: timed out`)),
        fetchTimeoutMs
      )
      let fetched: Fetched | null = null
      try {
        fetched = await fetchStats(controller.signal)
      } catch (error) {
        // Superseded by a newer fetch, or unmounted: not this one's to report.
        if (controller !== inFlight) return
        console.error(error)
      } finally {
        clearTimeout(timeout)
      }
      if (controller !== inFlight) return
      inFlight = null
      const checkedAt = Date.now()
      setResult((current) => settle(current, fetched, checkedAt))
    }
    function refreshIfVisible() {
      if (document.visibilityState === "visible") void refresh()
    }
    void refresh()
    const timer = setInterval(refreshIfVisible, refreshMs)
    document.addEventListener("visibilitychange", refreshIfVisible)
    return () => {
      inFlight?.abort()
      inFlight = null
      clearInterval(timer)
      document.removeEventListener("visibilitychange", refreshIfVisible)
    }
  }, [])

  return <StatsContext value={result}>{children}</StatsContext>
}

// Every block that shows live data reads this: one fetch and one parse per
// refresh, shared through StatsProvider (app/page.tsx).
export function useStats() {
  const result = useContext(StatsContext)
  if (!result) throw new Error("useStats() needs a StatsProvider above it")
  return result
}
