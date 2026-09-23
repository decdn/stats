// The shape of stats.json on R2, plus the pure functions that build it.
// No I/O here — the Next app imports the types from this file.

export const STATS_VERSION = 2
export const DAILY_RETENTION_DAYS = 92
// 24 buckets for the page's rolling-24h window, plus the hour before it so
// the active-node delta has a sample from 24h ago to compare against.
export const HOURLY_RETENTION_HOURS = 25
export const RECENT_SETTLEMENTS = 50

export type Hex = `0x${string}`

export type SettlementRow = {
  txHash: Hex
  logIndex: number
  blockNumber: number
  timestamp: number
  operator: Hex
  bytesDelivered: string
  amount: string
  epoch: number
}

export type DailyPoint = {
  date: string
  valueSettled: string
  bytesServed: string
  settlementCount: number
}

export type HourlyPoint = {
  // UTC hour, "2026-09-23T14"
  hour: string
  valueSettled: string
  bytesServed: string
  settlementCount: number
  // CapacityBond active-node count sampled during this hour, or null when no
  // run sampled it (zero-filled gaps, hours only seen while backfilling).
  activeNodes: number | null
}

export type Stats = {
  version: typeof STATS_VERSION
  chainId: number
  // The deployment this file was built from. A run whose config names a
  // different contract or start block discards the file and re-indexes.
  feeRouter: Hex
  startBlock: number
  updatedAt: string
  lastBlock: number
  totals: {
    valueSettled: string
    bytesServed: string
    settlementCount: number
  }
  daily: DailyPoint[]
  hourly: HourlyPoint[]
  settlements: SettlementRow[]
}

export function emptyStats(
  chainId: number,
  feeRouter: Hex,
  startBlock: number
): Stats {
  return {
    version: STATS_VERSION,
    chainId,
    feeRouter,
    startBlock,
    updatedAt: new Date(0).toISOString(),
    // One before the first block to index, so `from = lastBlock + 1` is
    // uniformly correct with no first-run special case.
    lastBlock: startBlock - 1,
    totals: { valueSettled: "0", bytesServed: "0", settlementCount: 0 },
    daily: [],
    hourly: [],
    settlements: [],
  }
}

// Returns null for a file written under an older schema: it can't be
// migrated in place (hourly buckets don't exist for the history it already
// folded), so the caller re-indexes.
export function parseStats(json: string): Stats | null {
  const stats = JSON.parse(json) as Stats
  if (typeof stats.version === "number" && stats.version < STATS_VERSION) {
    return null
  }
  if (stats.version !== STATS_VERSION) {
    throw new Error(`unsupported stats.json version ${String(stats.version)}`)
  }
  if (
    !Array.isArray(stats.daily) ||
    !Array.isArray(stats.hourly) ||
    !Array.isArray(stats.settlements) ||
    typeof stats.lastBlock !== "number"
  ) {
    throw new Error("stats.json is malformed")
  }
  return stats
}

export function serializeStats(stats: Stats) {
  return JSON.stringify(stats, null, 2)
}

export function utcDate(timestamp: number) {
  return new Date(timestamp * 1000).toISOString().slice(0, 10)
}

export function utcHour(timestamp: number) {
  return new Date(timestamp * 1000).toISOString().slice(0, 13)
}

// How a bucketed series is keyed and stepped. Keys are ISO prefixes, so
// string order is time order.
type Buckets<P> = {
  key: (point: P) => string
  next: (key: string) => string
  empty: (key: string) => P
}

const days: Buckets<DailyPoint> = {
  key: (point) => point.date,
  next: (date) => utcDate(Date.parse(`${date}T00:00:00Z`) / 1000 + 86_400),
  empty: (date) => ({
    date,
    valueSettled: "0",
    bytesServed: "0",
    settlementCount: 0,
  }),
}

const hours: Buckets<HourlyPoint> = {
  key: (point) => point.hour,
  next: (hour) => utcHour(Date.parse(`${hour}:00:00Z`) / 1000 + 3_600),
  empty: (hour) => ({
    hour,
    valueSettled: "0",
    bytesServed: "0",
    settlementCount: 0,
    activeNodes: null,
  }),
}

function bucket<P>(points: P[], buckets: Buckets<P>, key: string): P {
  const last = points.at(-1)
  if (last && key < buckets.key(last)) {
    // Events arrive in block order, so this only happens when a caught-up run
    // zero-filled (trimStats) or sampled (recordActiveNodes) up to "now" and
    // an event mined just before the bucket boundary lands afterwards. Fill into the existing bucket; the
    // indexer trails the head by minutes, far inside either retention window.
    const found = points.find((point) => buckets.key(point) === key)
    if (!found) throw new Error(`no bucket for ${key}`)
    return found
  }
  if (last && buckets.key(last) === key) return last
  // Zero-fill the gap so the series stays contiguous.
  let cursor = last ? buckets.next(buckets.key(last)) : key
  while (cursor < key) {
    points.push(buckets.empty(cursor))
    cursor = buckets.next(cursor)
  }
  const point = buckets.empty(key)
  points.push(point)
  return point
}

function add(a: string, b: string) {
  return (BigInt(a) + BigInt(b)).toString()
}

// Folds settled events (ascending block/log order) into totals, day buckets
// and the recent list. Mutates and returns `stats`.
//
// The `seen` set is best-effort belt-and-braces: it only covers the retained
// RECENT_SETTLEMENTS rows. Idempotency actually rests on indexed ranges never
// overlapping (`from = lastBlock + 1`, single write per run) — never move
// `lastBlock` backward without also resetting totals.
export function applyEvents(stats: Stats, events: SettlementRow[]) {
  const seen = new Set(
    stats.settlements.map((row) => `${row.txHash}:${row.logIndex}`)
  )
  for (const event of events) {
    const key = `${event.txHash}:${event.logIndex}`
    if (seen.has(key)) continue
    seen.add(key)

    stats.totals.valueSettled = add(stats.totals.valueSettled, event.amount)
    stats.totals.bytesServed = add(
      stats.totals.bytesServed,
      event.bytesDelivered
    )
    stats.totals.settlementCount += 1

    for (const point of [
      bucket(stats.daily, days, utcDate(event.timestamp)),
      bucket(stats.hourly, hours, utcHour(event.timestamp)),
    ]) {
      point.valueSettled = add(point.valueSettled, event.amount)
      point.bytesServed = add(point.bytesServed, event.bytesDelivered)
      point.settlementCount += 1
    }

    stats.settlements.unshift(event)
  }
  return stats
}

// Stamps the current hour's bucket with a CapacityBond active-node sample.
// A later run in the same hour overwrites it, so each bucket holds the last
// sample of its hour.
export function recordActiveNodes(stats: Stats, now: number, count: number) {
  bucket(stats.hourly, hours, utcHour(now)).activeNodes = count
  return stats
}

// Drops history outside the retention windows. Pass `now` (unix seconds) only
// once the indexer has caught up with the chain: it zero-fills to the present,
// and doing that mid-backfill could trim buckets that still have events to
// land.
export function trimStats(stats: Stats, now?: number) {
  if (now !== undefined) {
    if (stats.daily.length > 0) bucket(stats.daily, days, utcDate(now))
    if (stats.hourly.length > 0) bucket(stats.hourly, hours, utcHour(now))
  }
  stats.daily = stats.daily.slice(-DAILY_RETENTION_DAYS)
  stats.hourly = stats.hourly.slice(-HOURLY_RETENTION_HOURS)
  stats.settlements = stats.settlements.slice(0, RECENT_SETTLEMENTS)
  return stats
}
