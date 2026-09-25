import { createPublicClient, http } from "viem"

import { parseConfig, type Env } from "./env"
import { indexSettled } from "./indexer"
import { countActiveNodes } from "./nodes"
import {
  applyEvents,
  emptyStats,
  recordActiveNodes,
  resumeStats,
  serializeStats,
  trimStats,
  type Hex,
} from "./stats"
import { statsStore } from "./store"

// One cron tick: read the stats file, index up to MAX_CHUNKS_PER_RUN chunks past
// lastBlock, sample the active-node count once caught up, write it back.
// Nothing is written if indexing throws, so the next tick retries the same
// range. A failed node sample doesn't hold settlements back: progress is
// written first, then the error is rethrown so the cron still fails.
export async function runIndex(env: Env) {
  const config = parseConfig(env)
  const client = createPublicClient({
    transport: http(config.rpcUrl, { batch: true }),
  })

  const rpcChainId = await client.getChainId()
  if (rpcChainId !== config.chainId) {
    throw new Error(
      `RPC_URL is chain ${rpcChainId}, expected ${config.chainId} (arbitrum sepolia: https://sepolia-rollup.arbitrum.io/rpc)`
    )
  }

  const store = statsStore(env)
  const fresh = emptyStats(
    config.chainId,
    config.feeRouter.toLowerCase() as Hex,
    Number(config.startBlock),
    config.capacityBond.toLowerCase() as Hex
  )
  const existing = await store.get()
  const resumed = existing === null ? null : resumeStats(existing, fresh)
  if (existing !== null && resumed === null) {
    console.log(
      `${store.key} is unreadable or from another deployment; re-indexing from scratch`
    )
  }
  const stats = resumed ?? fresh

  const head = await client.getBlockNumber()
  // Stay behind the reorg/replica-lag window: logs are only fetched once, so
  // never index blocks the RPC might still be catching up on or reorg away.
  const target = head - config.confirmations
  const from = BigInt(stats.lastBlock) + 1n
  const cap = from + config.logChunkBlocks * BigInt(config.maxChunksPerRun) - 1n
  const to = cap < target ? cap : target

  if (from <= to) {
    const events = await indexSettled(
      client,
      config.feeRouter,
      from,
      to,
      config.logChunkBlocks
    )
    applyEvents(stats, events)
    stats.lastBlock = Number(to)
  }

  stats.caughtUp = BigInt(stats.lastBlock) >= target
  const now = Date.now() / 1000
  let sampleError: unknown = null
  if (stats.caughtUp) {
    // Node count history can't be rebuilt from logs, so it's sampled live.
    // Only once caught up: mid-backfill the hourly series still ends in the
    // past, and a sample at "now" would zero-fill (then trim) hours whose
    // events haven't been indexed yet. Read at `target` for the same
    // replica-lag reason as the logs.
    try {
      const activeNodes = await countActiveNodes(
        client,
        config.capacityBond,
        target
      )
      recordActiveNodes(stats, now, activeNodes)
    } catch (err) {
      // The hour keeps activeNodes: null, which the page shows as missing.
      console.error(
        `active-node sample failed (CapacityBond ${config.capacityBond} @ ${target})`,
        err
      )
      sampleError = err
    }
  }
  trimStats(stats, stats.caughtUp ? now : undefined)
  stats.updatedAt = new Date().toISOString()

  await store.put(serializeStats(stats))
  console.log(
    `written to ${store.label}: lastBlock=${stats.lastBlock} head=${head} settlements=${stats.totals.settlementCount}${stats.caughtUp ? "" : " (catching up)"}`
  )
  if (sampleError) throw sampleError
}
