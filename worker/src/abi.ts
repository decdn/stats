import { parseAbi, parseAbiItem } from "viem"

// FeeRouter.sol — emitted once per PaymentPool.redeemMany batch.
export const settledEvent = parseAbiItem(
  "event Settled(address indexed operator, uint256 bytesDelivered, uint256 amount, uint64 indexed epoch)"
)

// CapacityBond.sol — the registered-operator set with on-chain `isActive`
// computed per entry, paged.
export const capacityBondAbi = parseAbi([
  "struct NodeInfo { bytes32 nodeId; address ethAddress; bool active; uint64 lastMultiaddrUpdate; bytes multiaddrs; string regionHint; }",
  "function getRegisteredNodes(uint256 offset, uint256 limit) view returns (NodeInfo[] page, bool[] active)",
])
