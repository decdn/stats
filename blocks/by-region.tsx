import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
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
import { networkTotals, regions } from "@/lib/mock"
import { formatBytes } from "@/lib/utils"

const headClassName =
  "font-mono text-[10px] tracking-wide text-muted-foreground uppercase sm:text-[11px] sm:tracking-widest"

const countryNames: Record<string, string> = {
  DE: "germany",
  US: "united states",
  FR: "france",
  SG: "singapore",
  NL: "netherlands",
  GB: "united kingdom",
  BR: "brazil",
  JP: "japan",
  ZA: "south africa",
}

export function ByRegion() {
  return (
    <Card className="[--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)]">
      <CardHeader>
        <CardTitle>regional breakdown</CardTitle>
        <CardDescription>
          per-region delivery quality — illustrative figures, not yet read from
          chain
        </CardDescription>
        <CardAction>
          <Badge variant="outline" className="font-mono text-muted-foreground">
            sample data
          </Badge>
        </CardAction>
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
                cache hit
              </TableHead>
              <TableHead className={`${headClassName} text-right`}>
                p95 fill
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {regions.map((region) => (
              <TableRow key={region.code}>
                <TableCell className="py-3">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono font-semibold">
                      {region.code}
                    </span>
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {countryNames[region.code]}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden py-3 text-right font-mono tabular-nums sm:table-cell">
                  {region.nodes}
                </TableCell>
                <TableCell className="py-3 text-right font-mono tabular-nums">
                  {formatBytes(region.bytes)}
                </TableCell>
                <TableCell className="py-3 text-right font-mono tabular-nums">
                  {region.cacheHitPct.toFixed(1)}%
                </TableCell>
                <TableCell className="py-3 text-right font-mono tabular-nums">
                  {region.p95Ms} ms
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter className="bg-transparent text-muted-foreground">
            <TableRow className="hover:bg-transparent">
              <TableCell className={`${headClassName} py-3`}>network</TableCell>
              <TableCell className="hidden py-3 text-right font-mono tabular-nums sm:table-cell">
                {networkTotals.nodes}
              </TableCell>
              <TableCell className="py-3 text-right font-mono tabular-nums">
                {formatBytes(networkTotals.bytes)}
              </TableCell>
              <TableCell className="py-3 text-right font-mono tabular-nums">
                {networkTotals.cacheHitPct.toFixed(1)}%
              </TableCell>
              <TableCell className="py-3 text-right font-mono tabular-nums">
                {networkTotals.p95Ms} ms
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        <Separator />
        <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
          <strong className="font-semibold text-foreground">
            region is self-attested:
          </strong>{" "}
          each operator declares its country on{" "}
          <span className="font-mono">CapacityBond</span>, and nothing checks
          it. cache hit and p95 will come from node-to-node fills settled
          through <span className="font-mono">FeeRouter</span>, bucketed by the
          pulling node&apos;s region.
        </p>
      </CardContent>
    </Card>
  )
}
