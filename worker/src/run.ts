import { createPublicClient, http } from "viem"

import { parseConfig, type Env } from "./env"
import { indexSettled } from "./indexer"
import {
  applyEvents,
  emptyStats,
  parseStats,
  serializeStats,
  trimStats,
  utcDate,
  type Hex,
} from "./stats"
import { statsStore } from "./store"

// One cron tick: read stats.json, index up to MAX_CHUNKS_PER_RUN chunks past
// lastBlock, write it back. Nothing is written if any step throws, so the
// next tick retries the same range.
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
    Number(config.startBlock)
  )
  const existing = await store.get()
  let stats = existing ? parseStats(existing) : fresh
  if (existing && stats.chainId !== config.chainId) {
    throw new Error(
      `stats.json is for chain ${stats.chainId}, worker is configured for ${config.chainId}`
    )
  }
  if (
    existing &&
    (stats.feeRouter !== fresh.feeRouter ||
      stats.startBlock !== fresh.startBlock)
  ) {
    // Config names a different deployment (address or start block): the old
    // file can't be extended, so re-index. Keep a copy first — this path can
    // also be reached by a config typo, and the history has no other copy.
    await store.backup()
    console.log(
      `deployment changed (${stats.feeRouter ?? "?"}@${stats.startBlock ?? "?"} → ${fresh.feeRouter}@${fresh.startBlock}); old file backed up; re-indexing from scratch`
    )
    stats = fresh
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

  const caughtUp = BigInt(stats.lastBlock) >= target
  trimStats(stats, caughtUp ? utcDate(Date.now() / 1000) : undefined)
  stats.updatedAt = new Date().toISOString()

  await store.put(serializeStats(stats))
  console.log(
    `stats.json written to ${store.label}: lastBlock=${stats.lastBlock} head=${head} settlements=${stats.totals.settlementCount}${caughtUp ? "" : " (catching up)"}`
  )
}
