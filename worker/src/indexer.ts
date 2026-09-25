import type { Address, PublicClient } from "viem"

import { capacityBondEvents, feeRouterEvents, paymentPoolEvents } from "./abi"
import type { ChainEvent, Hex } from "./stats"

const events = [...feeRouterEvents, ...capacityBondEvents, ...paymentPoolEvents]
// Events that land in a time bucket, so need their block's timestamp.
const timed = new Set<string>([
  "Settled",
  "NodeRegistered",
  "NodeDeregistered",
  "NodeAutoEjected",
])

export type Contracts = {
  feeRouter: Address
  capacityBond: Address
  paymentPool: Address
}

function lower(value: Hex) {
  return value.toLowerCase() as Hex
}

// Pulls the logs of every indexed event for [from, to] in `chunk`-sized
// eth_getLogs calls (one per chunk, all three contracts), stamps the ones
// that land in time buckets with their block timestamp, and returns them
// decoded in block/log order.
export async function indexEvents(
  client: PublicClient,
  contracts: Contracts,
  from: bigint,
  to: bigint,
  chunk: bigint
) {
  const out: ChainEvent[] = []
  for (let start = from; start <= to; start += chunk) {
    const end = start + chunk - 1n < to ? start + chunk - 1n : to
    const logs = await client.getLogs({
      address: [
        contracts.feeRouter,
        contracts.capacityBond,
        contracts.paymentPool,
      ],
      events,
      fromBlock: start,
      toBlock: end,
      strict: true,
    })
    logs.sort((a, b) =>
      a.blockNumber === b.blockNumber
        ? a.logIndex - b.logIndex
        : a.blockNumber < b.blockNumber
          ? -1
          : 1
    )

    const blockNumbers = [
      ...new Set(
        logs
          .filter((log) => timed.has(log.eventName))
          .map((log) => log.blockNumber)
      ),
    ]
    // With `batch: true` on the transport these coalesce into a single HTTP
    // request (a JSON-RPC batch, up to viem's batchSize per request).
    const blocks = await Promise.all(
      blockNumbers.map((blockNumber) => client.getBlock({ blockNumber }))
    )
    const timestamps = new Map(
      blocks.map((block) => [block.number, Number(block.timestamp)])
    )
    const timestampOf = (log: (typeof logs)[number]) => {
      const timestamp = timestamps.get(log.blockNumber)
      if (timestamp === undefined) {
        throw new Error(
          `no timestamp for block ${log.blockNumber} (tx ${log.transactionHash})`
        )
      }
      return timestamp
    }

    for (const log of logs) {
      switch (log.eventName) {
        case "Settled":
          out.push({
            kind: "settled",
            row: {
              txHash: log.transactionHash,
              logIndex: log.logIndex,
              blockNumber: Number(log.blockNumber),
              timestamp: timestampOf(log),
              operator: lower(log.args.operator),
              bytesDelivered: log.args.bytesDelivered.toString(),
              amount: log.args.amount.toString(),
              epoch: Number(log.args.epoch),
            },
          })
          break
        case "NodeRegistered":
          out.push({
            kind: "nodeRegistered",
            timestamp: timestampOf(log),
            nodeId: lower(log.args.nodeId),
            operator: lower(log.args.ethAddress),
            regionHint: log.args.regionHint,
          })
          break
        case "NodeDeregistered":
        case "NodeAutoEjected":
          out.push({
            kind: "nodeRemoved",
            timestamp: timestampOf(log),
            nodeId: lower(log.args.nodeId),
          })
          break
        case "RegionUpdated":
          out.push({
            kind: "regionUpdated",
            nodeId: lower(log.args.nodeId),
            regionHint: log.args.newRegion,
          })
          break
        case "PoolOpened":
          out.push({
            kind: "poolOpened",
            poolId: lower(log.args.poolId),
            owner: lower(log.args.owner),
          })
          break
        case "PoolRedeemed":
          out.push({
            kind: "poolRedeemed",
            poolId: lower(log.args.poolId),
            bytesPaid: log.args.lanes
              .reduce((sum, lane) => sum + lane.bytesPaid, 0n)
              .toString(),
          })
          break
      }
    }
    console.log(`indexed ${start}..${end} (${logs.length} logs)`)
  }
  return out
}
