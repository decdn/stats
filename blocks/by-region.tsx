"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SectionHeading } from "@/globals/SectionHeading/section-heading"
import {
  regionsView,
  UNKNOWN_REGION,
  type RegionRow,
  type RegionsView,
} from "@/lib/regions"
import { useStats } from "@/lib/stats"
import { formatBytes, formatUtcTime } from "@/lib/utils"

const headClassName =
  "font-mono text-[11px] tracking-widest text-muted-foreground uppercase"

const cellClassName = "py-3 text-right font-mono tabular-nums"

const countryNames = new Intl.DisplayNames(["en"], { type: "region" })

function countryName(code: string) {
  if (code === UNKNOWN_REGION) return "no valid region declared"
  try {
    return countryNames.of(code)?.toLowerCase() ?? ""
  } catch {
    return ""
  }
}

// No default: a status added to RegionsView fails to compile here instead of
// borrowing another status's label.
function emptyLabel(view: RegionsView): string {
  switch (view.status) {
    case "loading":
      return "loading"
    case "error":
      return "stats unavailable"
    case "catching-up":
      return `catching up · block ${view.lastBlock}`
    case "ok":
      return "no nodes registered yet"
    case "unindexed":
      return "not indexed yet"
  }
}

function cacheHit(row: RegionRow) {
  return row.cacheHit === null ? "—" : `${(row.cacheHit * 100).toFixed(1)}%`
}

export function ByRegion() {
  const view = regionsView(useStats())
  const rows = view.status === "ok" ? view.rows : []
  return (
    <section className="flex w-full flex-col gap-5">
      <SectionHeading title="by region">
        registered nodes and bytes served, grouped by the region each operator
        declares on <span className="font-mono">CapacityBond</span>
        {view.status === "ok" && view.staleSince !== null && (
          <>, as of {formatUtcTime(view.staleSince)} utc</>
        )}
        .
      </SectionHeading>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={headClassName}>region</TableHead>
            <TableHead
              className={`${headClassName} hidden text-right sm:table-cell`}
            >
              nodes
            </TableHead>
            <TableHead className={`${headClassName} text-right`}>
              bytes served
            </TableHead>
            <TableHead className={`${headClassName} text-right`}>
              cache hit
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="py-8 text-center font-mono text-muted-foreground lowercase"
              >
                {emptyLabel(view)}
              </TableCell>
            </TableRow>
          )}
          {rows.map((region) => (
            <TableRow key={region.code}>
              <TableCell className="py-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono font-semibold">
                    {region.code === UNKNOWN_REGION ? "??" : region.code}
                  </span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {countryName(region.code)}
                  </span>
                </div>
              </TableCell>
              <TableCell className={`hidden sm:table-cell ${cellClassName}`}>
                {region.nodes}
              </TableCell>
              <TableCell className={cellClassName}>
                {formatBytes(Number(region.bytesServed))}
              </TableCell>
              <TableCell className={cellClassName}>
                {cacheHit(region)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        {view.status === "ok" && rows.length > 0 && (
          <TableFooter className="bg-transparent text-muted-foreground">
            <TableRow className="hover:bg-transparent">
              <TableCell className={`${headClassName} py-3`}>network</TableCell>
              <TableCell className={`hidden sm:table-cell ${cellClassName}`}>
                {view.network.nodes}
              </TableCell>
              <TableCell className={cellClassName}>
                {formatBytes(Number(view.network.bytesServed))}
              </TableCell>
              <TableCell className={cellClassName}>
                {cacheHit(view.network)}
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
      <div className="flex max-w-[65ch] flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
        <p>
          cache hit is the share of bytes served that a region&apos;s nodes
          didn&apos;t pay a peer to pull, from{" "}
          <span className="font-mono">PaymentPool</span> redemptions. pulls from
          a publisher&apos;s origin are free, so they don&apos;t count as
          misses.
        </p>
        <p>
          regions are self-declared. peers measure each node&apos;s latency and
          rank down one that doesn&apos;t match its region.
        </p>
      </div>
    </section>
  )
}
