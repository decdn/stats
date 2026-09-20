import type { Stats } from "../worker/src/stats"

export type { DailyPoint, SettlementRow, Stats } from "../worker/src/stats"

// Reads the stats.json the worker writes to R2. Returns null when STATS_URL
// is unset so blocks can fall back to lib/mock.ts in a cold checkout.
export async function getStats(): Promise<Stats | null> {
  const url = process.env.STATS_URL
  if (!url) return null
  const res = await fetch(url, { next: { revalidate: 60 } })
  if (!res.ok) {
    throw new Error(
      `stats fetch failed: ${res.status} ${res.statusText} (${url})`
    )
  }
  return (await res.json()) as Stats
}
