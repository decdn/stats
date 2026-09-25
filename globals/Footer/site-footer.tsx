import { getStats } from "@/lib/stats"
import { truncateHex } from "@/lib/utils"

const explorerAddressUrl = "https://sepolia.arbiscan.io/address/"

// The contracts every figure is read from, taken from stats.json so they
// always name the deployment that was actually indexed.
export async function SiteFooter() {
  const result = await getStats()
  const contracts =
    result.status === "ok"
      ? [
          { name: "FeeRouter", address: result.stats.feeRouter },
          { name: "CapacityBond", address: result.stats.capacityBond },
          { name: "PaymentPool", address: result.stats.paymentPool },
        ]
      : []
  return (
    <footer className="mx-auto mt-16 flex w-full max-w-6xl flex-col gap-3 border-t border-border px-6 pt-6 pb-16 text-sm text-muted-foreground sm:flex-row sm:justify-between">
      <span>decdn</span>
      {contracts.length > 0 && (
        <ul className="flex flex-col gap-1 sm:flex-row sm:gap-6">
          {contracts.map((contract) => (
            <li key={contract.name}>
              {contract.name}{" "}
              <a
                href={`${explorerAddressUrl}${contract.address}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-foreground underline-offset-4 hover:underline"
              >
                {truncateHex(contract.address)}
              </a>
            </li>
          ))}
        </ul>
      )}
    </footer>
  )
}
