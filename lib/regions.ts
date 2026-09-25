import { staleSince } from "@/lib/metrics"
import type { Stats, StatsResult } from "@/lib/stats"
import { UNKNOWN_REGION } from "@/worker/src/stats"

export type RegionRow = {
  // Upper-case alpha-2 code, or UNKNOWN_REGION.
  code: string
  nodes: number
  bytesServed: bigint
  // 1 − pulled/served, in [0, 1]; null before the region has served bytes.
  cacheHit: number | null
}

// Every non-"ok" status is an honest empty state; the block owns the copy.
export type RegionsView =
  | {
      status: "ok"
      rows: RegionRow[]
      network: RegionRow
      staleSince: number | null
    }
  | { status: "loading" | "unindexed" | "error" }
  | { status: "catching-up"; lastBlock: number }

export { UNKNOWN_REGION }

function cacheHit(served: bigint, pulled: bigint) {
  if (served === BigInt(0)) return null
  const missed = Number((pulled * BigInt(10_000)) / served) / 10_000
  return Math.max(0, 1 - missed)
}

// Most nodes first, then most bytes; the unknown bucket always last.
function byWeight(a: RegionRow, b: RegionRow) {
  if (a.code === UNKNOWN_REGION) return 1
  if (b.code === UNKNOWN_REGION) return -1
  if (a.nodes !== b.nodes) return b.nodes - a.nodes
  if (a.bytesServed !== b.bytesServed) {
    return a.bytesServed > b.bytesServed ? -1 : 1
  }
  return a.code.localeCompare(b.code)
}

export function regionRows(stats: Stats) {
  const nodes = new Map<string, number>()
  for (const node of Object.values(stats.nodes)) {
    nodes.set(node.region, (nodes.get(node.region) ?? 0) + 1)
  }
  const codes = new Set([...nodes.keys(), ...Object.keys(stats.regions)])
  let pulledTotal = BigInt(0)
  const rows = [...codes].map((code) => {
    const totals = stats.regions[code]
    const served = BigInt(totals?.bytesServed ?? "0")
    const pulled = BigInt(totals?.bytesPulled ?? "0")
    pulledTotal += pulled
    return {
      code,
      nodes: nodes.get(code) ?? 0,
      bytesServed: served,
      cacheHit: cacheHit(served, pulled),
    }
  })
  const served = BigInt(stats.totals.bytesServed)
  return {
    rows: rows.sort(byWeight),
    network: {
      code: "network",
      nodes: Object.keys(stats.nodes).length,
      bytesServed: served,
      cacheHit: cacheHit(served, pulledTotal),
    },
  }
}

export function regionsView(result: StatsResult): RegionsView {
  if (result.status !== "ok") return { status: result.status }
  const { stats } = result
  if (!stats.caughtUp) {
    return { status: "catching-up", lastBlock: stats.lastBlock }
  }
  return {
    status: "ok",
    ...regionRows(stats),
    staleSince: staleSince(stats, result.checkedAt),
  }
}
