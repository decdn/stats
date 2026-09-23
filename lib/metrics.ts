import { getStats, type HourlyPoint, type Stats } from "@/lib/stats"
import { formatBytes, formatUsdcCents, scaleBytes } from "@/lib/utils"

// The metric cards' view of stats.json: a headline, a rolling-24h change and
// an hourly sparkline. Hours are the worker's UTC buckets, anchored to the
// newest one (the last run), not to wall-clock time.

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

export type MetricView =
  | { metric: Metric }
  // Same honest empty states as the settlements table: never a stand-in.
  | { metric: null; emptyLabel: string }

const windowHours = 24

export async function loadMetric(
  build: (stats: Stats) => Metric | null
): Promise<MetricView> {
  const result = await getStats()
  if (result.status === "unconfigured") {
    return { metric: null, emptyLabel: "live data not configured" }
  }
  if (result.status === "unindexed") {
    return { metric: null, emptyLabel: "not indexed yet" }
  }
  const metric = build(result.stats)
  if (!metric) return { metric: null, emptyLabel: "not sampled yet" }
  return { metric }
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
    delta: { text: `+${formatUsdcCents(delta.toString())}`, up: delta > 0 },
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
    delta: { text: `+${formatBytes(Number(delta))}`, up: delta > 0 },
    // Plotted in the headline's unit so the tooltip reads like it.
    series: series.map((point) => ({
      t: point.t,
      value: Math.round((Number(point.total) / divisor) * 10) / 10,
    })),
  }
}

// null until the worker has sampled CapacityBond at least once (it only
// samples once caught up with the chain).
export function activeNodesMetric(stats: Stats): Metric | null {
  const sampled = stats.hourly
    .slice(-windowHours)
    .filter(
      (point): point is HourlyPoint & { activeNodes: number } =>
        point.activeNodes !== null
    )
  const latest = sampled.at(-1)
  if (!latest) return null
  const base = stats.hourly.find(
    (point) => point.hour === hoursBefore(latest.hour, windowHours)
  )?.activeNodes
  const change = base == null ? null : latest.activeNodes - base
  return {
    value: String(latest.activeNodes),
    delta:
      change === null
        ? null
        : {
            text: change < 0 ? `−${-change}` : `+${change}`,
            up: change > 0,
          },
    series: sampled.map((point) => ({
      t: hourLabel(point.hour),
      value: point.activeNodes,
    })),
  }
}
