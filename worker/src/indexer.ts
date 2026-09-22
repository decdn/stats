import type { Address, PublicClient } from "viem"

import { settledEvent } from "./abi"
import type { SettlementRow } from "./stats"

// Pulls Settled logs for [from, to] in `chunk`-sized eth_getLogs calls and
// stamps each with its block timestamp. Returns rows in block/log order.
export async function indexSettled(
  client: PublicClient,
  feeRouter: Address,
  from: bigint,
  to: bigint,
  chunk: bigint
) {
  const rows: SettlementRow[] = []
  for (let start = from; start <= to; start += chunk) {
    const end = start + chunk - 1n < to ? start + chunk - 1n : to
    const logs = await client.getLogs({
      address: feeRouter,
      event: settledEvent,
      fromBlock: start,
      toBlock: end,
      strict: true,
    })
    const blockNumbers = [...new Set(logs.map((log) => log.blockNumber))]
    // With `batch: true` on the transport these coalesce into a single HTTP
    // request (a JSON-RPC batch, up to viem's batchSize per request).
    const blocks = await Promise.all(
      blockNumbers.map((blockNumber) => client.getBlock({ blockNumber }))
    )
    const timestamps = new Map(
      blocks.map((block) => [block.number, Number(block.timestamp)])
    )
    for (const log of logs) {
      const timestamp = timestamps.get(log.blockNumber)
      if (timestamp === undefined) {
        throw new Error(
          `no timestamp for block ${log.blockNumber} (tx ${log.transactionHash})`
        )
      }
      rows.push({
        txHash: log.transactionHash,
        logIndex: log.logIndex,
        blockNumber: Number(log.blockNumber),
        timestamp,
        operator: log.args.operator,
        bytesDelivered: log.args.bytesDelivered.toString(),
        amount: log.args.amount.toString(),
        epoch: Number(log.args.epoch),
      })
    }
    console.log(`indexed ${start}..${end} (${logs.length} settled)`)
  }
  return rows
}
