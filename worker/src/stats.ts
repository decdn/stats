// The shape of stats.json on R2, plus the pure functions that build it.
// No I/O here — the Next app imports the types from this file.

export const DAILY_RETENTION_DAYS = 92
// 24 buckets for the page's rolling-24h window, plus the hour before it so
// the registered-node delta has a count from 24h ago to compare against.
export const HOURLY_RETENTION_HOURS = 25
export const RECENT_SETTLEMENTS = 50
// Where a node without a valid ISO 3166-1 alpha-2 `regionHint` is counted,
// and where bytes settled by a no-longer-registered operator land.
export const UNKNOWN_REGION = "unknown"

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
  // CapacityBond registered-set size at the end of this hour.
  registeredNodes: number
}

export type RegisteredNode = {
  operator: Hex
  // Upper-case alpha-2 code, or UNKNOWN_REGION.
  region: string
}

// All-time bytes attributed to a region by the operator's region at the time
// of the event.
export type RegionTotals = {
  // Settled.bytesDelivered by the region's operators.
  bytesServed: string
  // PoolRedeemed bytes paid from pools the region's operators own: what they
  // pulled from peers to fill cache misses.
  bytesPulled: string
}

export type Stats = {
  // The deployment this file was built from. A run whose config names a
  // different one discards the file and re-indexes.
  chainId: number
  feeRouter: Hex
  capacityBond: Hex
  paymentPool: Hex
  startBlock: number
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
  // The CapacityBond registered set, keyed by nodeId.
  nodes: Record<Hex, RegisteredNode>
  // PaymentPool owner of every pool opened, keyed by poolId.
  poolOwners: Record<Hex, Hex>
  regions: Record<string, RegionTotals>
}

// One decoded log, in the shape the fold needs. Addresses and ids are
// lower-case; bigints are decimal strings.
export type ChainEvent =
  | { kind: "settled"; row: SettlementRow }
  | {
      kind: "nodeRegistered"
      timestamp: number
      nodeId: Hex
      operator: Hex
      regionHint: string
    }
  // NodeDeregistered or NodeAutoEjected.
  | { kind: "nodeRemoved"; timestamp: number; nodeId: Hex }
  | { kind: "regionUpdated"; nodeId: Hex; regionHint: string }
  | { kind: "poolOpened"; poolId: Hex; owner: Hex }
  | { kind: "poolRedeemed"; poolId: Hex; bytesPaid: string }

export type Deployment = Pick<
  Stats,
  "chainId" | "feeRouter" | "capacityBond" | "paymentPool" | "startBlock"
>

export function emptyStats(deployment: Deployment): Stats {
  return {
    ...deployment,
    updatedAt: new Date(0).toISOString(),
    // One before the first block to index, so `from = lastBlock + 1` is
    // uniformly correct with no first-run special case.
    lastBlock: deployment.startBlock - 1,
    caughtUp: false,
    totals: { valueSettled: "0", bytesServed: "0", settlementCount: 0 },
    daily: [],
    hourly: [],
    settlements: [],
    nodes: {},
    poolOwners: {},
    regions: {},
  }
}

// A bigint in base units, as stored: a decimal string BigInt() accepts.
function isUint(value: unknown) {
  return typeof value === "string" && /^\d+$/.test(value)
}

function isRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

// Returns the stored stats when they are valid JSON of the expected shape,
// otherwise null. Shared by the worker and the page, so both reject a file
// written under an older schema.
export function parseStats(json: string): Stats | null {
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
    typeof stats.chainId !== "number" ||
    typeof stats.feeRouter !== "string" ||
    typeof stats.capacityBond !== "string" ||
    typeof stats.paymentPool !== "string" ||
    typeof stats.startBlock !== "number" ||
    typeof stats.lastBlock !== "number" ||
    typeof stats.caughtUp !== "boolean" ||
    typeof stats.updatedAt !== "string" ||
    !isUint(stats.totals?.valueSettled) ||
    !isUint(stats.totals?.bytesServed) ||
    typeof stats.totals?.settlementCount !== "number" ||
    stats.hourly.some((point) => typeof point?.registeredNodes !== "number") ||
    !isRecord(stats.nodes) ||
    !isRecord(stats.poolOwners) ||
    !isRecord(stats.regions)
  ) {
    return null
  }
  return stats
}

// Returns the stored stats when they can be extended: parseable by
// `parseStats` and built from the same deployment as `fresh`. Anything else
// returns null and the caller re-indexes from scratch over it.
export function resumeStats(json: string, fresh: Deployment): Stats | null {
  const stats = parseStats(json)
  if (
    !stats ||
    stats.chainId !== fresh.chainId ||
    stats.feeRouter !== fresh.feeRouter ||
    stats.capacityBond !== fresh.capacityBond ||
    stats.paymentPool !== fresh.paymentPool ||
    stats.startBlock !== fresh.startBlock
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

// New hourly buckets (and the gap fill before them) carry `registeredNodes`
// forward: nothing changed the registered set in an hour no event touched.
function hoursWith(registeredNodes: number): Buckets<HourlyPoint> {
  return {
    key: (point) => point.hour,
    next: (hour) => utcHour(Date.parse(`${hour}:00:00Z`) / 1000 + 3_600),
    empty: (hour) => ({
      hour,
      valueSettled: "0",
      bytesServed: "0",
      settlementCount: 0,
      registeredNodes,
    }),
  }
}

function registeredCount(stats: Stats) {
  return Object.keys(stats.nodes).length
}

function hourBucket(stats: Stats, timestamp: number) {
  return bucket(
    stats.hourly,
    hoursWith(registeredCount(stats)),
    utcHour(timestamp)
  )
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
    // happens when a caught-up run opened the current hour in an empty series
    // (trimStats) and an event mined up to CONFIRMATIONS blocks (~5 min) plus
    // a cron interval earlier lands on the next run.
    const front: P[] = []
    for (let cursor = key; cursor < buckets.key(first);) {
      front.push(buckets.empty(cursor))
      cursor = buckets.next(cursor)
    }
    points.unshift(...front)
    return front[0]
  }
  if (key <= buckets.key(last)) {
    // Inside the series: a caught-up run zero-filled up to "now" (trimStats)
    // and an event from just before that lands afterwards, as above. The
    // series is contiguous, so the bucket exists.
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

// A declared region as an upper-case alpha-2 code, or UNKNOWN_REGION for an
// empty or malformed hint (region is self-attested and unchecked, ADR 030).
export function regionCode(regionHint: string) {
  const code = regionHint.trim().toUpperCase()
  return /^[A-Z]{2}$/.test(code) ? code : UNKNOWN_REGION
}

// Looks up registered nodes by operator address in O(1). Built once per fold
// from `stats.nodes` and kept in step with register/remove; it maps to the
// nodeId, so a RegionUpdated edit to the node is seen without touching it.
function operatorIndex(stats: Stats) {
  const byOperator = new Map<Hex, Hex>()
  for (const [nodeId, node] of Object.entries(stats.nodes)) {
    byOperator.set(node.operator, nodeId as Hex)
  }
  return {
    // The node's current region, or null when no registered node has that
    // address.
    region(operator: Hex) {
      const nodeId = byOperator.get(operator)
      return nodeId ? (stats.nodes[nodeId]?.region ?? null) : null
    },
    add(nodeId: Hex, operator: Hex) {
      byOperator.set(operator, nodeId)
    },
    remove(nodeId: Hex) {
      const operator = stats.nodes[nodeId]?.operator
      if (operator && byOperator.get(operator) === nodeId) {
        byOperator.delete(operator)
      }
    },
  }
}

function regionTotals(stats: Stats, region: string) {
  stats.regions[region] ??= { bytesServed: "0", bytesPulled: "0" }
  return stats.regions[region]
}

// Changes the registered set at `timestamp` and stamps the new count on that
// hour and every later one already in the series (a caught-up run has
// zero-filled up to "now", and this event may land just before that).
function changeRegistered(
  stats: Stats,
  timestamp: number,
  change: (nodes: Stats["nodes"]) => void
) {
  // Opened before the change, so any gap before this hour carries the old
  // count.
  const hour = hourBucket(stats, timestamp).hour
  change(stats.nodes)
  const count = registeredCount(stats)
  for (const point of stats.hourly) {
    if (point.hour >= hour) point.registeredNodes = count
  }
}

function applySettled(stats: Stats, row: SettlementRow, region: string) {
  stats.totals.valueSettled = add(stats.totals.valueSettled, row.amount)
  stats.totals.bytesServed = add(stats.totals.bytesServed, row.bytesDelivered)
  stats.totals.settlementCount += 1

  for (const point of [
    bucket(stats.daily, days, utcDate(row.timestamp)),
    hourBucket(stats, row.timestamp),
  ]) {
    point.valueSettled = add(point.valueSettled, row.amount)
    point.bytesServed = add(point.bytesServed, row.bytesDelivered)
    point.settlementCount += 1
  }

  const totals = regionTotals(stats, region)
  totals.bytesServed = add(totals.bytesServed, row.bytesDelivered)

  stats.settlements.unshift(row)
}

// Folds decoded events (ascending block/log order) into totals, buckets, the
// registered set and per-region totals. Mutates and returns `stats`.
//
// The `seen` set is best-effort belt-and-braces: it only covers the retained
// RECENT_SETTLEMENTS rows. Idempotency actually rests on indexed ranges never
// overlapping (`from = lastBlock + 1`, single write per run) — never move
// `lastBlock` backward without also resetting totals.
export function applyEvents(stats: Stats, events: ChainEvent[]) {
  const seen = new Set(
    stats.settlements.map((row) => `${row.txHash}:${row.logIndex}`)
  )
  const operators = operatorIndex(stats)
  for (const event of events) {
    switch (event.kind) {
      case "settled": {
        const key = `${event.row.txHash}:${event.row.logIndex}`
        if (seen.has(key)) break
        seen.add(key)
        applySettled(
          stats,
          event.row,
          operators.region(event.row.operator) ?? UNKNOWN_REGION
        )
        break
      }
      case "nodeRegistered":
        changeRegistered(stats, event.timestamp, (nodes) => {
          operators.remove(event.nodeId)
          operators.add(event.nodeId, event.operator)
          nodes[event.nodeId] = {
            operator: event.operator,
            region: regionCode(event.regionHint),
          }
        })
        break
      case "nodeRemoved":
        changeRegistered(stats, event.timestamp, (nodes) => {
          operators.remove(event.nodeId)
          delete nodes[event.nodeId]
        })
        break
      case "regionUpdated": {
        const node = stats.nodes[event.nodeId]
        if (node) node.region = regionCode(event.regionHint)
        break
      }
      case "poolOpened":
        stats.poolOwners[event.poolId] = event.owner
        break
      case "poolRedeemed": {
        // Only a pool a registered node owns pays for that node's pulls;
        // every other pool is a client's.
        const owner = stats.poolOwners[event.poolId]
        const region = owner && operators.region(owner)
        if (!region) break
        const totals = regionTotals(stats, region)
        totals.bytesPulled = add(totals.bytesPulled, event.bytesPaid)
        break
      }
    }
  }
  return stats
}

// Drops history outside the retention windows. Pass `now` (unix seconds) only
// once the indexer has caught up with the chain: it zero-fills to the present
// (the hourly series always, so the registered-node count has a current
// hour), and doing that mid-backfill could trim buckets that still have
// events to land.
export function trimStats(stats: Stats, now?: number) {
  if (now !== undefined) {
    if (stats.daily.length > 0) bucket(stats.daily, days, utcDate(now))
    hourBucket(stats, now)
  }
  stats.daily = stats.daily.slice(-DAILY_RETENTION_DAYS)
  stats.hourly = stats.hourly.slice(-HOURLY_RETENTION_HOURS)
  stats.settlements = stats.settlements.slice(0, RECENT_SETTLEMENTS)
  return stats
}
