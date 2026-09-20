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
} from "./stats"

export const STATS_KEY = "stats.json"

// One cron tick: read stats.json, index up to MAX_CHUNKS_PER_RUN chunks past
// lastBlock, write it back. Nothing is written if any step throws, so the
// next tick retries the same range.
export async function runIndex(env: Env) {
  const config = parseConfig(env)
  const client = createPublicClient({
    transport: http(config.rpcUrl, { batch: true }),
  })

  const object = await env.STATS.get(STATS_KEY)
  const stats = object
    ? parseStats(await object.text())
    : emptyStats(config.chainId, Number(config.startBlock - 1n))
  if (object && stats.chainId !== config.chainId) {
    throw new Error(
      `stats.json is for chain ${stats.chainId}, worker is configured for ${config.chainId}`
    )
  }

  const head = await client.getBlockNumber()
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

  await env.STATS.put(STATS_KEY, serializeStats(stats), {
    httpMetadata: {
      contentType: "application/json",
      cacheControl: "public, max-age=60",
    },
  })
  console.log(
    `stats.json written: lastBlock=${stats.lastBlock} head=${head} settlements=${stats.totals.settlementCount}${caughtUp ? "" : " (catching up)"}`
  )
}
