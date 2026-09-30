"use client"

import { RegionMap, type MapPoint } from "@/blocks/charts/region-map"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Cursor } from "@/globals/Cursor/cursor"
import { DragScroll } from "@/globals/DragScroll/drag-scroll"
import { SectionHeading } from "@/globals/SectionHeading/section-heading"
import {
  regionsView,
  UNKNOWN_REGION,
  type RegionRow,
  type RegionsView,
} from "@/lib/regions"
import { useStats } from "@/lib/stats"
import {
  cn,
  countryName,
  enterClass,
  formatBytes,
  formatUtcTime,
} from "@/lib/utils"

// text-muted-foreground repeats type-micro's color so cn drops TableHead's
// text-foreground, which would otherwise win in the stylesheet.
const headClassName = "type-micro text-muted-foreground"

const cellClassName = "py-3 text-right font-mono tabular-nums"

function regionName(code: string) {
  if (code === UNKNOWN_REGION) return "no valid region declared"
  return countryName(code)
}

function nodeCount(nodes: number) {
  return `${nodes} ${nodes === 1 ? "node" : "nodes"}`
}

// "DE · germany · 12 nodes · 3.4 GB served", the map's hover title.
function pointLabel(point: MapPoint) {
  return [
    point.code,
    countryName(point.code),
    nodeCount(point.nodes),
    `${formatBytes(Number(point.bytesServed))} served`,
  ]
    .filter(Boolean)
    .join(" · ")
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
    <section id="by-region" className="flex w-full flex-col gap-5">
      <SectionHeading title="by region">
        registered nodes, and bytes served from{" "}
        <span className="font-mono">FeeRouter</span> settlements, grouped by the
        region each operator declares on{" "}
        <span className="font-mono">CapacityBond</span>
        {view.status === "ok" && view.staleSince !== null && (
          <>, as of {formatUtcTime(view.staleSince)} utc</>
        )}
        . circles on the map scale with registered nodes.
      </SectionHeading>
      <RegionMap
        rows={rows}
        label="map of registered nodes by region"
        pointLabel={pointLabel}
        className="mb-6"
      />
      <DragScroll label="by region table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={headClassName}>region</TableHead>
              <TableHead className={`${headClassName} text-right`}>
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
          <TableBody className={enterClass(view.status === "loading")}>
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center font-mono text-muted-foreground lowercase"
                >
                  {emptyLabel(view)}
                  {view.status === "loading" && <Cursor />}
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
                    <span className="text-xs text-muted-foreground">
                      {regionName(region.code)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className={cellClassName}>{region.nodes}</TableCell>
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
            <TableFooter
              className={cn(
                "bg-transparent text-muted-foreground",
                enterClass(false)
              )}
            >
              <TableRow className="hover:bg-transparent">
                <TableCell className="py-3 type-micro">network</TableCell>
                <TableCell className={cellClassName}>
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
      </DragScroll>
      <div className="flex flex-col gap-2 type-prose">
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
