// The shape of stats.json on R2, plus the pure functions that build it.
// No I/O here — the Next app imports the types from this file.

export const DAILY_RETENTION_DAYS = 92
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

export type Stats = {
  version: 1
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
  settlements: SettlementRow[]
}

export function emptyStats(
  chainId: number,
  feeRouter: Hex,
  startBlock: number
): Stats {
  return {
    version: 1,
    chainId,
    feeRouter,
    startBlock,
    updatedAt: new Date(0).toISOString(),
    // One before the first block to index, so `from = lastBlock + 1` is
    // uniformly correct with no first-run special case.
    lastBlock: startBlock - 1,
    totals: { valueSettled: "0", bytesServed: "0", settlementCount: 0 },
    daily: [],
    settlements: [],
  }
}

export function parseStats(json: string): Stats {
  const stats = JSON.parse(json) as Stats
  if (stats.version !== 1) {
    throw new Error(`unsupported stats.json version ${String(stats.version)}`)
  }
  if (
    !Array.isArray(stats.daily) ||
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

function addDays(date: string, days: number) {
  const ms = Date.parse(`${date}T00:00:00Z`) + days * 86_400_000
  return new Date(ms).toISOString().slice(0, 10)
}

function dailyPoint(stats: Stats, date: string): DailyPoint {
  const last = stats.daily.at(-1)
  if (last && date < last.date) {
    // Events arrive in block order, so this only happens when trimStats
    // zero-filled the series up to "today" and an event mined just before
    // midnight UTC lands afterwards. Fill into the existing bucket; with
    // 92-day retention it cannot have been trimmed already.
    const found = stats.daily.find((point) => point.date === date)
    if (!found) throw new Error(`no daily bucket for ${date}`)
    return found
  }
  if (last?.date === date) return last
  // Zero-fill the gap so the series stays contiguous.
  let cursor = last ? addDays(last.date, 1) : date
  while (cursor < date) {
    stats.daily.push({
      date: cursor,
      valueSettled: "0",
      bytesServed: "0",
      settlementCount: 0,
    })
    cursor = addDays(cursor, 1)
  }
  const point: DailyPoint = {
    date,
    valueSettled: "0",
    bytesServed: "0",
    settlementCount: 0,
  }
  stats.daily.push(point)
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

    const day = dailyPoint(stats, utcDate(event.timestamp))
    day.valueSettled = add(day.valueSettled, event.amount)
    day.bytesServed = add(day.bytesServed, event.bytesDelivered)
    day.settlementCount += 1

    stats.settlements.unshift(event)
  }
  return stats
}

// Drops history outside the retention window. Pass `today` only once the
// indexer has caught up with the chain: it zero-fills to the present, and
// doing that mid-backfill could trim days that still have events to land.
export function trimStats(stats: Stats, today?: string) {
  if (today && stats.daily.length > 0) dailyPoint(stats, today)
  stats.daily = stats.daily.slice(-DAILY_RETENTION_DAYS)
  stats.settlements = stats.settlements.slice(0, RECENT_SETTLEMENTS)
  return stats
}
