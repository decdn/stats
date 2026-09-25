import { getStats, type Stats } from "@/lib/stats"
import { cn, formatBytes, formatUsdc, formatUtcTime } from "@/lib/utils"

const explorerUrl = "https://sepolia.arbiscan.io"

// A network with no settlement in this long isn't "on" in any sense a
// reader would check.
const quietAfterSeconds = 24 * 60 * 60

type LastSettlement = {
  when: string
  value: string
  bytes: string
  txHref: string
}

type HeroState = {
  headline: string
  live: boolean
  meta: string
  last: LastSettlement | null
}

// The headline is backed by the newest settlement, measured against the
// worker's last write rather than the wall clock: a stale stats.json means
// the worker (or the public RPC it reads) is lagging, which says nothing
// about whether nodes are serving, so index health only ever shows in the
// meta line. Mid-backfill the newest indexed settlement isn't the newest on
// chain, so the headline stays neutral until the index catches up.
async function loadHeroState(): Promise<HeroState> {
  const result = await getStats()
  if (result.status === "unconfigured") {
    return neutral("live data not configured")
  }
  if (result.status === "unindexed") {
    return neutral("waiting for the first index")
  }
  const { stats } = result
  if (!stats.caughtUp) {
    return neutral(`indexing · block ${stats.lastBlock}`)
  }
  const indexedAt = Date.parse(stats.updatedAt) / 1000
  const latest = stats.settlements.at(0)
  const live =
    latest !== undefined &&
    (Number.isNaN(indexedAt) ||
      indexedAt - latest.timestamp <= quietAfterSeconds)
  return {
    headline: live ? "the network is on" : "the network is quiet",
    live,
    meta: Number.isNaN(indexedAt)
      ? "indexed"
      : `indexed ${formatUtcTime(indexedAt)} utc`,
    last: latest ? lastSettlement(latest, indexedAt) : null,
  }
}

function neutral(meta: string): HeroState {
  return { headline: "network status", live: false, meta, last: null }
}

// Time only when it's the same UTC day as the index, else date and time.
function lastSettlement(
  row: Stats["settlements"][number],
  indexedAt: number
): LastSettlement {
  const at = formatUtcTime(row.timestamp)
  const sameDay =
    !Number.isNaN(indexedAt) &&
    formatUtcTime(indexedAt).startsWith(at.slice(0, 10))
  return {
    when: sameDay ? at.slice(11) : at,
    value: formatUsdc(row.amount),
    bytes: formatBytes(Number(row.bytesDelivered)),
    txHref: `${explorerUrl}/tx/${row.txHash}`,
  }
}

export async function Hero() {
  const { headline, live, meta, last } = await loadHeroState()
  return (
    <section className="pt-6">
      <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
        {meta}
      </p>
      <h1 className="mt-6 text-5xl leading-[1.05] font-medium tracking-tight text-balance lowercase sm:text-6xl md:text-7xl">
        {headline}
        <span
          aria-hidden="true"
          className={cn(
            "ml-2 inline-block size-3 align-baseline md:size-4",
            live ? "bg-accent-green" : "bg-muted-foreground/40"
          )}
        />
        <span className="sr-only">.</span>
      </h1>
      {last && (
        <p className="mt-6 text-lg leading-snug tabular-nums sm:text-xl">
          last settlement at {last.when} utc paid {last.value} usdc for{" "}
          {last.bytes} served.{" "}
          <a
            href={last.txHref}
            target="_blank"
            rel="noreferrer"
            className="whitespace-nowrap text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            check the tx<span aria-hidden="true"> ↗</span>
          </a>
        </p>
      )}
      <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
        you don&apos;t have to trust us. every figure below is read from
        contract logs on arbitrum sepolia, nothing annualized or projected, and
        every settlement links to its transaction.
      </p>
    </section>
  )
}
