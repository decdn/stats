import type { Stats, StatsResult } from "@/lib/stats"
import { formatBytes, formatUsdcCents, scaleBytes } from "@/lib/utils"

// The metric cards' view of stats.json: a headline, a rolling-24h change and
// an hourly sparkline. Hours are the worker's UTC buckets, anchored to the
// newest one — the last caught-up run's hour — not to wall-clock time; a
// file that stopped updating is flagged stale instead.

export type MetricPoint = {
  t: string
  value: number
}

export type Metric = {
  value: string
  unit?: string
  // null when there's no figure from 24h ago to compare against.
  delta: { text: string; up: boolean } | null
  series: MetricPoint[]
}

// Every non-"ok" status is an honest empty state, never a stand-in figure.
// Blocks own the copy for each.
export type MetricView =
  // `staleSince` (unix seconds) is set when the worker hasn't written for a
  // while: the headline is still true as of then, the 24h change isn't.
  | { status: "ok"; metric: Metric; staleSince: number | null }
  | { status: "loading" | "unindexed" | "error" }
  // Totals are partial and the hourly window is in the past (backfill,
  // re-index, outage recovery), so nothing is shown until it's caught up.
  | { status: "catching-up"; lastBlock: number }

const windowHours = 24
// Three missed 5-minute cron ticks.
const staleAfterMs = 15 * 60_000

export function metricView(
  result: StatsResult,
  build: (stats: Stats) => Metric
): MetricView {
  if (result.status !== "ok") return { status: result.status }
  const { stats } = result
  if (!stats.caughtUp) {
    return { status: "catching-up", lastBlock: stats.lastBlock }
  }
  return {
    status: "ok",
    metric: build(stats),
    staleSince: staleSince(stats, result.checkedAt),
  }
}

// Unix seconds of the worker's last write when, as of `checkedAt` (ms, the
// page's last fetch attempt), it has stopped writing; else null.
export function staleSince(stats: Stats, checkedAt: number) {
  const updatedAt = Date.parse(stats.updatedAt)
  return checkedAt - updatedAt > staleAfterMs ? updatedAt / 1000 : null
}

// A non-negative sum as a delta. "Up" only when the displayed figure is
// non-zero, so a sub-cent change doesn't show a green "+0.00".
function signedDelta(text: string) {
  return { text: `+${text}`, up: /[1-9]/.test(text) }
}

function hourLabel(hour: string) {
  return `${hour.slice(11, 13)}:00 utc`
}

function hoursBefore(hour: string, hours: number) {
  const ms = Date.parse(`${hour}:00:00Z`) - hours * 3_600_000
  return new Date(ms).toISOString().slice(0, 13)
}

// All-time total at the end of each of the last 24 hourly buckets, walked
// back from `totals`, and how much of it landed inside that window.
function cumulative(stats: Stats, field: "valueSettled" | "bytesServed") {
  const total = BigInt(stats.totals[field])
  let running = total
  const series: { t: string; total: bigint }[] = []
  for (const point of stats.hourly.slice(-windowHours).reverse()) {
    series.unshift({ t: hourLabel(point.hour), total: running })
    running -= BigInt(point[field])
  }
  return { total, series, delta: total - running }
}

export function valueSettledMetric(stats: Stats): Metric {
  const { total, series, delta } = cumulative(stats, "valueSettled")
  return {
    value: formatUsdcCents(total.toString()),
    unit: "usdc",
    delta: signedDelta(formatUsdcCents(delta.toString())),
    series: series.map((point) => ({
      t: point.t,
      value: Number(formatUsdcCents(point.total.toString())),
    })),
  }
}

export function bytesServedMetric(stats: Stats): Metric {
  const { total, series, delta } = cumulative(stats, "bytesServed")
  const { value, unit, divisor } = scaleBytes(Number(total))
  return {
    value: value.toFixed(1),
    unit,
    delta: signedDelta(formatBytes(Number(delta))),
    // Plotted in the headline's unit so the tooltip reads like it.
    series: series.map((point) => ({
      t: point.t,
      value: Math.round((Number(point.total) / divisor) * 10) / 10,
    })),
  }
}

// The registered-set size now, with its end-of-hour count over the last 24
// hours. The delta is null until the series reaches back 24 hours.
export function registeredNodesMetric(stats: Stats): Metric {
  const window = stats.hourly.slice(-windowHours)
  const latest = window.at(-1)
  const base =
    latest &&
    stats.hourly.find(
      (point) => point.hour === hoursBefore(latest.hour, windowHours)
    )
  const count = Object.keys(stats.nodes).length
  const change = base ? count - base.registeredNodes : null
  return {
    value: String(count),
    delta:
      change === null
        ? null
        : {
            text: change < 0 ? `−${-change}` : `+${change}`,
            up: change > 0,
          },
    series: window.map((point) => ({
      t: hourLabel(point.hour),
      value: point.registeredNodes,
    })),
  }
}
