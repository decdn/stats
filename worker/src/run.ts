import { createPublicClient, http } from "viem"

import { parseConfig, type Env } from "./env"
import { indexSettled } from "./indexer"
import { countActiveNodes } from "./nodes"
import {
  applyEvents,
  emptyStats,
  parseStats,
  recordActiveNodes,
  resetActiveNodes,
  serializeStats,
  trimStats,
  type Hex,
} from "./stats"
import { statsStore } from "./store"

// One cron tick: read stats.json, index up to MAX_CHUNKS_PER_RUN chunks past
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
  const parsed = existing === null ? null : parseStats(existing)
  // Checked before any reset: a wrong CHAIN_ID/RPC_URL pair must fail loudly,
  // not back up and rebuild the history as an empty chain.
  const fileChainId =
    parsed?.status === "ok" ? parsed.stats.chainId : parsed?.chainId
  if (parsed && fileChainId !== config.chainId) {
    throw new Error(
      `stats.json is for chain ${fileChainId}, worker is configured for ${config.chainId}`
    )
  }

  let stats = fresh
  if (parsed?.status === "outdated") {
    // The old file can't be extended, so rebuild. Keep a copy first, as below.
    await store.backup()
    console.log(
      `stats.json is schema v${parsed.version}, worker writes v${fresh.version}; old file backed up; re-indexing from scratch`
    )
  } else if (
    parsed?.status === "ok" &&
    (parsed.stats.feeRouter !== fresh.feeRouter ||
      parsed.stats.startBlock !== fresh.startBlock)
  ) {
    // Config names a different deployment (address or start block): the old
    // file can't be extended, so re-index. Keep a copy first — this path can
    // also be reached by a config typo, and the history has no other copy.
    await store.backup()
    console.log(
      `deployment changed (${parsed.stats.feeRouter}@${parsed.stats.startBlock} → ${fresh.feeRouter}@${fresh.startBlock}); old file backed up; re-indexing from scratch`
    )
  } else if (parsed?.status === "ok") {
    stats = parsed.stats
    if (stats.capacityBond !== fresh.capacityBond) {
      console.log(
        `CapacityBond changed (${stats.capacityBond} → ${fresh.capacityBond}); clearing active-node samples`
      )
      resetActiveNodes(stats, fresh.capacityBond)
    }
  }

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
    `stats.json written to ${store.label}: lastBlock=${stats.lastBlock} head=${head} settlements=${stats.totals.settlementCount}${stats.caughtUp ? "" : " (catching up)"}`
  )
  if (sampleError) throw sampleError
}
