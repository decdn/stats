import { createPublicClient, http } from "viem"

import { parseConfig, type Env } from "./env"
import { indexEvents } from "./indexer"
import {
  applyEvents,
  emptyStats,
  resumeStats,
  serializeStats,
  trimStats,
  type Deployment,
  type Hex,
} from "./stats"
import { statsStore } from "./store"

// One cron tick: read the stats file, index up to MAX_CHUNKS_PER_RUN chunks
// past lastBlock, write it back. Nothing is written if indexing throws, so the
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
  const deployment: Deployment = {
    chainId: config.chainId,
    feeRouter: config.feeRouter.toLowerCase() as Hex,
    capacityBond: config.capacityBond.toLowerCase() as Hex,
    paymentPool: config.paymentPool.toLowerCase() as Hex,
    startBlock: Number(config.startBlock),
  }
  const existing = await store.get()
  const resumed = existing === null ? null : resumeStats(existing, deployment)
  if (existing !== null && resumed === null) {
    console.log(
      `${store.key} is unreadable or from another deployment; re-indexing from scratch`
    )
  }
  const stats = resumed ?? emptyStats(deployment)

  const head = await client.getBlockNumber()
  // Stay behind the reorg/replica-lag window: logs are only fetched once, so
  // never index blocks the RPC might still be catching up on or reorg away.
  const target = head - config.confirmations
  const from = BigInt(stats.lastBlock) + 1n
  const cap = from + config.logChunkBlocks * BigInt(config.maxChunksPerRun) - 1n
  const to = cap < target ? cap : target

  if (from <= to) {
    const events = await indexEvents(
      client,
      config,
      from,
      to,
      config.logChunkBlocks
    )
    applyEvents(stats, events)
    stats.lastBlock = Number(to)
  }

  stats.caughtUp = BigInt(stats.lastBlock) >= target
  trimStats(stats, stats.caughtUp ? Date.now() / 1000 : undefined)
  stats.updatedAt = new Date().toISOString()

  await store.put(serializeStats(stats))
  console.log(
    `written to ${store.label}: lastBlock=${stats.lastBlock} head=${head} settlements=${stats.totals.settlementCount} nodes=${Object.keys(stats.nodes).length}${stats.caughtUp ? "" : " (catching up)"}`
  )
}
