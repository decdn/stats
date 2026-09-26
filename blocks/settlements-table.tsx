"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useStats, type StatsResult } from "@/lib/stats"
import {
  formatBytes,
  formatUsdc,
  formatUtcTime,
  truncateHex,
} from "@/lib/utils"

const explorerUrl = "https://sepolia.arbiscan.io"
// stats.json carries the newest RECENT_SETTLEMENTS rows (worker/src/stats.ts);
// the page shows the newest few.
const visibleRows = 12

type Row = {
  key: string
  // UTC date, the group a row sits under.
  date: string
  time: string
  operator: string
  operatorHref: string
  bytes: string
  value: string
  tx: string
  txHref: string
}

type TableData = {
  rows: Row[]
  // Distinguishes the honest empty states: no stats to show (loading,
  // unavailable, not indexed yet) vs an indexed chain with no settlements yet.
  emptyLabel: string
  footer: string | null
}

// Every row here is a real Settled log or the table stays empty — there is
// deliberately no mock fallback, because a plausible-looking fake settlement
// is the one thing this section must never render.
function settlementsData(result: StatsResult): TableData {
  if (result.status === "loading") {
    return { rows: [], emptyLabel: "loading", footer: null }
  }
  if (result.status === "error") {
    return { rows: [], emptyLabel: "stats unavailable", footer: null }
  }
  if (result.status === "unindexed") {
    return {
      rows: [],
      emptyLabel: "no settlements indexed yet",
      footer: null,
    }
  }
  const { stats } = result
  return {
    rows: stats.settlements.slice(0, visibleRows).map((row) => {
      const [date, time] = formatUtcTime(row.timestamp).split(" ")
      return {
        key: `${row.txHash}:${row.logIndex}`,
        date,
        time: time.slice(0, 5),
        operator: truncateHex(row.operator),
        operatorHref: `${explorerUrl}/address/${row.operator}`,
        bytes: formatBytes(Number(row.bytesDelivered)),
        value: formatUsdc(row.amount),
        tx: truncateHex(row.txHash, 8),
        txHref: `${explorerUrl}/tx/${row.txHash}`,
      }
    }),
    emptyLabel: "no settlements indexed yet",
    // Mid-backfill the rows are real but not the newest, so say so rather
    // than implying a fresh index.
    footer: stats.caughtUp
      ? `last indexed ${formatUtcTime(Date.parse(stats.updatedAt) / 1000)} utc`
      : `re-indexing · block ${stats.lastBlock}`,
  }
}

const headClassName =
  "font-mono text-[10px] tracking-wide text-muted-foreground uppercase sm:text-[11px] sm:tracking-widest"

const linkClassName = "underline-offset-4 hover:underline"

// Rows arrive newest first, so each date's rows are contiguous.
function groupByDate(rows: Row[]) {
  const groups: { date: string; rows: Row[] }[] = []
  for (const row of rows) {
    const last = groups.at(-1)
    if (last?.date === row.date) last.rows.push(row)
    else groups.push({ date: row.date, rows: [row] })
  }
  return groups
}

export function SettlementsTable() {
  const { rows: settlements, emptyLabel, footer } = settlementsData(useStats())
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
            <TableHead className={headClassName}>time (utc)</TableHead>
            <TableHead className={`${headClassName} hidden sm:table-cell`}>
              operator
            </TableHead>
            <TableHead
              className={`${headClassName} hidden text-right sm:table-cell`}
            >
              bytes
            </TableHead>
            <TableHead className={`${headClassName} text-right`}>
              value (usdc)
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
          {groupByDate(settlements).map((group) => [
            <TableRow key={group.date} className="hover:bg-transparent">
              <TableCell
                colSpan={5}
                className="pt-5 pb-2 text-xs text-muted-foreground"
              >
                {group.date}
              </TableCell>
            </TableRow>,
            ...group.rows.map((settlement) => (
              <TableRow key={settlement.key}>
                <TableCell className="text-muted-foreground tabular-nums">
                  {settlement.time}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <a
                    href={settlement.operatorHref}
                    target="_blank"
                    rel="noreferrer"
                    className={linkClassName}
                  >
                    {settlement.operator}
                  </a>
                </TableCell>
                <TableCell className="hidden text-right tabular-nums sm:table-cell">
                  {settlement.bytes}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {settlement.value}
                </TableCell>
                <TableCell className="text-right">
                  <a
                    href={settlement.txHref}
                    target="_blank"
                    rel="noreferrer"
                    className={linkClassName}
                  >
                    {settlement.tx}
                    <span aria-hidden="true"> ↗</span>
                  </a>
                </TableCell>
              </TableRow>
            )),
          ])}
        </TableBody>
      </Table>
      {footer !== null && (
        <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          {footer}
        </p>
      )}
    </section>
  )
}
