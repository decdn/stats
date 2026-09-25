import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  loadRegions,
  UNKNOWN_REGION,
  type RegionRow,
  type RegionsView,
} from "@/lib/regions"
import { formatBytes, formatUtcTime } from "@/lib/utils"

const headClassName =
  "font-mono text-[10px] tracking-wide text-muted-foreground uppercase sm:text-[11px] sm:tracking-widest"

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

function emptyLabel(view: RegionsView) {
  switch (view.status) {
    case "unconfigured":
      return "live data not configured"
    case "catching-up":
      return `catching up · block ${view.lastBlock}`
    case "ok":
      return "no nodes registered yet"
    default:
      return "not indexed yet"
  }
}

function cacheHit(row: RegionRow) {
  return row.cacheHit === null ? "—" : `${(row.cacheHit * 100).toFixed(1)}%`
}

export async function ByRegion() {
  const view = await loadRegions()
  const rows = view.status === "ok" ? view.rows : []
  return (
    <Card className="[--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)]">
      <CardHeader>
        <CardTitle>regional breakdown</CardTitle>
        <CardDescription>
          registered nodes and settled bytes by declared region, read from chain
          {view.status === "ok" && view.staleSince !== null && (
            <> · as of {formatUtcTime(view.staleSince)} utc</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-5">
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
                bytes
              </TableHead>
              <TableHead className={`${headClassName} text-right`}>
                <Tooltip>
                  <TooltipTrigger className="cursor-help uppercase underline decoration-dotted underline-offset-4">
                    cache hit
                  </TooltipTrigger>
                  <TooltipContent className="max-w-64 normal-case">
                    share of settled bytes the region&apos;s nodes served
                    without paying a peer to pull them. pulls from a
                    publisher&apos;s origin are free, so they don&apos;t count
                    as misses.
                  </TooltipContent>
                </Tooltip>
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
                <TableCell className={`${headClassName} py-3`}>
                  network
                </TableCell>
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
        <Separator />
        <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
          <strong className="font-semibold text-foreground">
            regions are declared by operators
          </strong>{" "}
          on <span className="font-mono">CapacityBond</span>. peers measure each
          node&apos;s latency and rank down one that doesn&apos;t match its
          region.
        </p>
      </CardContent>
    </Card>
  )
}
