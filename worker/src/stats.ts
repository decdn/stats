// The shape of stats.json on R2, plus the pure functions that build it.
// No I/O here — the Next app imports the types from this file.

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
  // The deployment this file was built from. A run whose config names a
  // different one discards the file and re-indexes.
  chainId: number
  feeRouter: Hex
  startBlock: number
  // Where `hourly[].activeNodes` samples come from.
  capacityBond: Hex
  updatedAt: string
  lastBlock: number
  // Whether `lastBlock` reached the confirmed head on the last run. While
  // false (first backfill, re-index, recovery from an outage) totals are
  // partial and the hourly series ends in the past, so nothing here is "now".
  caughtUp: boolean
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
  startBlock: number,
  capacityBond: Hex
): Stats {
  return {
    chainId,
    feeRouter,
    startBlock,
    capacityBond,
    updatedAt: new Date(0).toISOString(),
    // One before the first block to index, so `from = lastBlock + 1` is
    // uniformly correct with no first-run special case.
    lastBlock: startBlock - 1,
    caughtUp: false,
    totals: { valueSettled: "0", bytesServed: "0", settlementCount: 0 },
    daily: [],
    hourly: [],
    settlements: [],
  }
}

// Returns the stored stats when they can be extended: valid JSON of the
// expected shape, built from the same deployment as `fresh`. Anything else
// returns null and the caller re-indexes from scratch over it.
export function resumeStats(json: string, fresh: Stats): Stats | null {
  let stats: Stats | null
  try {
    stats = JSON.parse(json) as Stats | null
  } catch {
    return null
  }
  if (
    !stats ||
    typeof stats !== "object" ||
    !Array.isArray(stats.daily) ||
    !Array.isArray(stats.hourly) ||
    !Array.isArray(stats.settlements) ||
    typeof stats.lastBlock !== "number" ||
    typeof stats.caughtUp !== "boolean" ||
    !stats.totals ||
    stats.chainId !== fresh.chainId ||
    stats.feeRouter !== fresh.feeRouter ||
    stats.startBlock !== fresh.startBlock ||
    stats.capacityBond !== fresh.capacityBond
  ) {
    return null
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
// string order is time order; `next(k) > k` and `key(empty(k)) === k`.
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

// Returns the bucket for `key`, creating it and zero-filling any gap so the
// series stays contiguous (one bucket per step, no holes).
function bucket<P>(points: P[], buckets: Buckets<P>, key: string): P {
  const first = points.at(0)
  const last = points.at(-1)
  if (!first || !last) {
    const point = buckets.empty(key)
    points.push(point)
    return point
  }
  if (key < buckets.key(first)) {
    // Before the series start. Events arrive in block order, so this only
    // happens when a caught-up run sampled nodes into an empty series
    // (recordActiveNodes) and an event mined up to CONFIRMATIONS blocks
    // (~5 min) plus a cron interval earlier lands on the next run.
    const front: P[] = []
    for (let cursor = key; cursor < buckets.key(first); ) {
      front.push(buckets.empty(cursor))
      cursor = buckets.next(cursor)
    }
    points.unshift(...front)
    return front[0]
  }
  if (key <= buckets.key(last)) {
    // Inside the series: a caught-up run zero-filled (trimStats) or sampled
    // up to "now" and an event from just before that lands afterwards, as
    // above. The series is contiguous, so the bucket exists.
    const found = points.find((point) => buckets.key(point) === key)
    if (!found) throw new Error(`no bucket for ${key} in a contiguous series`)
    return found
  }
  let cursor = buckets.next(buckets.key(last))
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

// Folds settled events (ascending block/log order) into totals, daily and
// hourly buckets, and the recent list. Mutates and returns `stats`.
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
