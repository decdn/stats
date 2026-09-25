import { isAddress, type Address } from "viem"

export type Env = {
  STATS: R2Bucket
  RPC_URL: string
  START_BLOCK: string
  CHAIN_ID: string
  FEE_ROUTER: string
  CAPACITY_BOND: string
  LOG_CHUNK_BLOCKS: string
  MAX_CHUNKS_PER_RUN: string
  CONFIRMATIONS: string
  // Optional: reach the bucket over R2's S3 API instead of the binding.
  R2_ACCESS_KEY_ID?: string
  R2_SECRET_ACCESS_KEY?: string
  R2_S3_ENDPOINT?: string
  R2_BUCKET?: string
}

export type Config = {
  rpcUrl: string
  startBlock: bigint
  chainId: number
  feeRouter: Address
  capacityBond: Address
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

// Zero would make the indexer compute an empty range forever and silently
// never advance, so the chunk sizing vars must be strictly positive.
function positiveInt(env: Env, key: keyof Env) {
  const raw = int(env, key)
  if (BigInt(raw) === 0n) throw new Error(`${key} must be greater than zero`)
  return raw
}

export function parseChainId(env: Env) {
  return Number(int(env, "CHAIN_ID"))
}

export function parseConfig(env: Env): Config {
  if (!env.RPC_URL) throw new Error("RPC_URL is not set")
  if (!isAddress(env.FEE_ROUTER)) {
    throw new Error(`FEE_ROUTER is not an address: ${env.FEE_ROUTER}`)
  }
  if (!isAddress(env.CAPACITY_BOND)) {
    throw new Error(`CAPACITY_BOND is not an address: ${env.CAPACITY_BOND}`)
  }
  return {
    rpcUrl: env.RPC_URL,
    startBlock: BigInt(int(env, "START_BLOCK")),
    chainId: parseChainId(env),
    feeRouter: env.FEE_ROUTER,
    capacityBond: env.CAPACITY_BOND,
    logChunkBlocks: BigInt(positiveInt(env, "LOG_CHUNK_BLOCKS")),
    maxChunksPerRun: Number(positiveInt(env, "MAX_CHUNKS_PER_RUN")),
    confirmations: BigInt(int(env, "CONFIRMATIONS")),
  }
}
