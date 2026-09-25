import { parseAbi } from "viem"

// FeeRouter.sol — emitted once per PaymentPool.redeemMany call.
export const feeRouterEvents = parseAbi([
  "event Settled(address indexed operator, uint256 bytesDelivered, uint256 amount, uint64 indexed epoch)",
])

// CapacityBond.sol — every change to the registered set and to a node's
// declared region. Each removal path (deregisterNode, reclaimNodeId, slash
// auto-eject, blacklist eject) emits NodeDeregistered or NodeAutoEjected
// exactly once, and only for a node that was registered.
export const capacityBondEvents = parseAbi([
  "event NodeRegistered(bytes32 indexed nodeId, address indexed ethAddress, bytes multiaddrs, string regionHint, uint64 bindingNonce, uint64 registrationNonce)",
  "event NodeDeregistered(bytes32 indexed nodeId)",
  "event NodeAutoEjected(bytes32 indexed nodeId, uint256 remainingBond)",
  "event RegionUpdated(bytes32 indexed nodeId, string oldRegion, string newRegion)",
])

// PaymentPool.sol — pool ownership, and the bytes each redemption paid for.
// A node pays for its own pulls from a pool it owns (ADR 003 § node → node).
export const paymentPoolEvents = parseAbi([
  "event PoolOpened(bytes32 indexed poolId, address indexed owner, uint256 deposit)",
  "struct LaneSettled { address signer; uint64 newPaidCumulative; uint64 bytesPaid; }",
  "event PoolRedeemed(bytes32 indexed poolId, address indexed provider, LaneSettled[] lanes)",
])
