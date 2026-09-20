import { isAddress, type Address } from "viem"

export type Env = {
  STATS: R2Bucket
  RPC_URL: string
  START_BLOCK: string
  CHAIN_ID: string
  FEE_ROUTER: string
  LOG_CHUNK_BLOCKS: string
  MAX_CHUNKS_PER_RUN: string
  CONFIRMATIONS: string
}

export type Config = {
  rpcUrl: string
  startBlock: bigint
  chainId: number
  feeRouter: Address
  logChunkBlocks: bigint
  maxChunksPerRun: number
  confirmations: bigint
}

function int(env: Env, key: keyof Env) {
  const raw = env[key]
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) {
    throw new Error(`${key} must be a non-negative integer, got ${String(raw)}`)
  }
  return raw
}

export function parseConfig(env: Env): Config {
  if (!env.RPC_URL) throw new Error("RPC_URL is not set")
  if (!isAddress(env.FEE_ROUTER)) {
    throw new Error(`FEE_ROUTER is not an address: ${env.FEE_ROUTER}`)
  }
  return {
    rpcUrl: env.RPC_URL,
    startBlock: BigInt(int(env, "START_BLOCK")),
    chainId: Number(int(env, "CHAIN_ID")),
    feeRouter: env.FEE_ROUTER,
    logChunkBlocks: BigInt(int(env, "LOG_CHUNK_BLOCKS")),
    maxChunksPerRun: Number(int(env, "MAX_CHUNKS_PER_RUN")),
    confirmations: BigInt(int(env, "CONFIRMATIONS")),
  }
}
