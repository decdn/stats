import { parseAbiItem } from "viem"

// FeeRouter.sol — emitted once per PaymentPool.redeemMany batch.
export const settledEvent = parseAbiItem(
  "event Settled(address indexed operator, uint256 bytesDelivered, uint256 amount, uint64 indexed epoch)"
)
