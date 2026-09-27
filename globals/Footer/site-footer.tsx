"use client"

import { Wordmark } from "@/globals/Wordmark/wordmark"
import { useStats } from "@/lib/stats"
import { truncateHex } from "@/lib/utils"

const explorerAddressUrl = "https://sepolia.arbiscan.io/address/"

// The contracts every figure is read from, taken from stats.json so they
// always name the deployment that was actually indexed.
export function SiteFooter() {
  const result = useStats()
  const contracts =
    result.status === "ok"
      ? [
          { name: "FeeRouter", address: result.stats.feeRouter },
          { name: "CapacityBond", address: result.stats.capacityBond },
          { name: "PaymentPool", address: result.stats.paymentPool },
        ]
      : []
  return (
    <footer className="mt-16 px-frame-gutter pb-16 text-sm text-muted-foreground">
      <div className="mx-auto flex w-full max-w-frame flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <a href="https://decdn.org" className="self-start sm:self-auto">
          <Wordmark />
        </a>
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
      </div>
    </footer>
  )
}
