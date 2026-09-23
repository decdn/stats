import type { Address, PublicClient } from "viem"

import { capacityBondAbi } from "./abi"

const PAGE_SIZE = 100n

// Counts CapacityBond operators whose `isActive` is true. Every page is read
// at the same block so a registration or swap-and-pop removal between calls
// can't shift entries across pages.
export async function countActiveNodes(
  client: PublicClient,
  capacityBond: Address,
  blockNumber: bigint
) {
  let count = 0
  for (let offset = 0n; ; offset += PAGE_SIZE) {
    const [, active] = await client.readContract({
      address: capacityBond,
      abi: capacityBondAbi,
      functionName: "getRegisteredNodes",
      args: [offset, PAGE_SIZE],
      blockNumber,
    })
    count += active.filter(Boolean).length
    if (BigInt(active.length) < PAGE_SIZE) return count
  }
}
