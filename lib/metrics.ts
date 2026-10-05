import type { Stats, StatsResult } from "@/lib/stats"
import { formatBytes, formatUsdcCents, scaleBytes } from "@/lib/utils"

// The metric cards' view of stats.json: a headline, the change over the
// card's window and a sparkline across it — the last 24 hourly buckets for
// value settled, the last 30 daily ones for bytes served and registered
// nodes. Buckets are the worker's UTC hours and days, anchored to the newest
// one — the last caught-up run's — not to wall-clock time; a file that
// stopped updating is flagged stale instead.

export type MetricPoint = {
  t: string
  value: number
}

export type Metric = {
  value: string
  unit?: string
  // null when there's no figure from the window's start to compare against.
  delta: { text: string; up: boolean } | null
  series: MetricPoint[]
}

// Every non-"ok" status is an honest empty state, never a stand-in figure.
// Blocks own the copy for each.
export type MetricView =
  // `staleSince` (unix seconds) is set when the worker hasn't written for a
  // while: the headline is still true as of then, the change isn't.
  | { status: "ok"; metric: Metric; staleSince: number | null }
  | { status: "loading" | "unindexed" | "error" }
  // Totals are partial and the window is in the past (backfill,
  // re-index, outage recovery), so nothing is shown until it's caught up.
  | { status: "catching-up"; lastBlock: number }

const windowHours = 24
const windowDays = 30
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

// "2026-10-05" → "oct 5"
function dayLabel(date: string) {
  return new Date(`${date}T00:00:00Z`)
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    })
    .toLowerCase()
}

function daysBefore(date: string, days: number) {
  const ms = Date.parse(`${date}T00:00:00Z`) - days * 86_400_000
  return new Date(ms).toISOString().slice(0, 10)
}

type Field = "valueSettled" | "bytesServed"

// All-time total at the end of each bucket in `window` (the newest buckets),
// walked back from `totals`, and how much of it landed inside the window.
function cumulative<P extends Record<Field, string>>(
  stats: Stats,
  field: Field,
  window: P[],
  label: (point: P) => string
) {
  const total = BigInt(stats.totals[field])
  let running = total
  const series: { t: string; total: bigint }[] = []
  for (const point of [...window].reverse()) {
    series.unshift({ t: label(point), total: running })
    running -= BigInt(point[field])
  }
  return { total, series, delta: total - running }
}

export function valueSettledMetric(stats: Stats): Metric {
  const { total, series, delta } = cumulative(
    stats,
    "valueSettled",
    stats.hourly.slice(-windowHours),
    (point) => hourLabel(point.hour)
  )
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
  const { total, series, delta } = cumulative(
    stats,
    "bytesServed",
    stats.daily.slice(-windowDays),
    (point) => dayLabel(point.date)
  )
  const { value, unit, divisor } = scaleBytes(Number(total))
  return {
    // Whole bytes stay whole, as in formatBytes.
    value: value.toFixed(unit === "B" ? 0 : 1),
    unit,
    delta: signedDelta(formatBytes(Number(delta))),
    // Plotted in the headline's unit so the tooltip reads like it.
    series: series.map((point) => ({
      t: point.t,
      value: Math.round((Number(point.total) / divisor) * 10) / 10,
    })),
  }
}

// The registered-set size now, with its end-of-day count over the last 30
// days. The delta is null until the series reaches back 30 days.
export function registeredNodesMetric(stats: Stats): Metric {
  const window = stats.daily.slice(-windowDays)
  const latest = window.at(-1)
  const base =
    latest &&
    stats.daily.find(
      (point) => point.date === daysBefore(latest.date, windowDays)
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
      t: dayLabel(point.date),
      value: point.registeredNodes,
    })),
  }
}
