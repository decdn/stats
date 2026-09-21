import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getStats } from "@/lib/stats"
import {
  formatBytes,
  formatUsdc,
  formatUtcTime,
  truncateHex,
} from "@/lib/utils"

const explorerTxUrl = "https://sepolia.arbiscan.io/tx/"
// stats.json carries the newest RECENT_SETTLEMENTS rows (worker/src/stats.ts);
// the page shows the newest few.
const visibleRows = 12

type Row = {
  key: string
  time: string
  operator: string
  bytes: string
  value: string
  tx: string
  href: string
}

type TableData = {
  rows: Row[]
  // Distinguishes the honest empty states: live data not wired up vs an
  // indexed chain with no settlements (yet).
  emptyLabel: string
  updatedAt: number | null
}

// Every row here is a real Settled log or the table stays empty — there is
// deliberately no mock fallback, because a plausible-looking fake settlement
// is the one thing this section must never render.
async function loadSettlements(): Promise<TableData> {
  const result = await getStats()
  if (result.status === "unconfigured") {
    return { rows: [], emptyLabel: "live data not configured", updatedAt: null }
  }
  if (result.status === "unindexed") {
    return {
      rows: [],
      emptyLabel: "no settlements indexed yet",
      updatedAt: null,
    }
  }
  const { stats } = result
  return {
    rows: stats.settlements.slice(0, visibleRows).map((row) => ({
      key: `${row.txHash}:${row.logIndex}`,
      time: formatUtcTime(row.timestamp),
      operator: truncateHex(row.operator),
      bytes: formatBytes(Number(row.bytesDelivered)),
      value: formatUsdc(row.amount),
      tx: truncateHex(row.txHash, 8),
      href: `${explorerTxUrl}${row.txHash}`,
    })),
    emptyLabel: "no settlements indexed yet",
    updatedAt: Date.parse(stats.updatedAt),
  }
}

const headClassName =
  "font-mono text-[10px] tracking-wide text-muted-foreground uppercase sm:text-[11px] sm:tracking-widest"

export async function SettlementsTable() {
  const { rows: settlements, emptyLabel, updatedAt } = await loadSettlements()
  return (
    <section className="flex w-full flex-col gap-5">
      <div>
        <h2 className="text-2xl font-medium tracking-tight lowercase sm:text-3xl">
          the point is you don&apos;t have to trust us
        </h2>
        <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-muted-foreground lowercase">
          each settlement is a real{" "}
          <span className="font-mono normal-case">FeeRouter.Settled</span> log
          on arbitrum sepolia. click a tx to check it.
        </p>
      </div>
      <Table className="font-mono">
        <TableHeader>
          <TableRow>
            <TableHead className={headClassName}>time</TableHead>
            <TableHead className={headClassName}>operator</TableHead>
            <TableHead className={`${headClassName} text-right`}>
              bytes
            </TableHead>
            <TableHead className={`${headClassName} text-right`}>
              value (testnet-usdc)
            </TableHead>
            <TableHead className={`${headClassName} text-right`}>tx</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {settlements.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-8 text-center text-muted-foreground lowercase"
              >
                {emptyLabel}
              </TableCell>
            </TableRow>
          )}
          {settlements.map((settlement) => (
            <TableRow key={settlement.key}>
              <TableCell className="text-muted-foreground tabular-nums">
                {settlement.time}
              </TableCell>
              <TableCell>{settlement.operator}</TableCell>
              <TableCell className="text-right tabular-nums">
                {settlement.bytes}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {settlement.value}
              </TableCell>
              <TableCell className="text-right">
                <a
                  href={settlement.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-green underline underline-offset-4"
                >
                  {settlement.tx}
                  <span aria-hidden="true"> ↗</span>
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {updatedAt !== null && (
        <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          last indexed {formatUtcTime(updatedAt / 1000)} utc
        </p>
      )}
    </section>
  )
}
