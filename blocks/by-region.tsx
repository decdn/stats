import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
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
import { cn, formatBytes } from "@/lib/utils"

const headClassName =
  "font-mono text-[10px] tracking-wide text-muted-foreground uppercase sm:text-[11px] sm:tracking-widest"

// anything slower than this reads as a cold region, not a fast one.
const fastP95Ms = 50

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
    <Card>
      <CardHeader>
        <CardTitle>regional breakdown</CardTitle>
        <CardDescription>
          42 active nodes self-attesting 9 countries — with per-region delivery
          quality
        </CardDescription>
        <CardAction>
          <Badge
            variant="outline"
            className="gap-1.5 border-accent-green/30 font-mono text-accent-green"
          >
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-accent-green"
            />
            on-chain + measured
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="gap-5">
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
              <TableHead className={`${headClassName} text-right`}>
                p95 pull-through
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
                    <span className="text-xs text-muted-foreground">
                      {countryNames[region.code]}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-3 text-right font-mono tabular-nums">
                  {region.nodes}
                </TableCell>
                <TableCell className="py-3 text-right font-mono tabular-nums">
                  {formatBytes(region.bytes)}
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Progress
                      aria-hidden="true"
                      value={region.cacheHitPct}
                      className="w-14 shrink-0 [&_[data-slot=progress-indicator]]:bg-accent-green [&_[data-slot=progress-track]]:h-1"
                    />
                    <span className="font-mono tabular-nums">
                      {region.cacheHitPct.toFixed(1)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center justify-end gap-2">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-1.5 rounded-full",
                        region.p95Ms <= fastP95Ms
                          ? "bg-accent-green"
                          : "bg-muted-foreground/50"
                      )}
                    />
                    <span className="font-mono tabular-nums">
                      {region.p95Ms} ms
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter className="bg-transparent text-muted-foreground">
            <TableRow className="hover:bg-transparent">
              <TableCell className={`${headClassName} py-3`}>network</TableCell>
              <TableCell className="py-3 text-right font-mono tabular-nums">
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
        <p className="max-w-[95ch] text-sm leading-relaxed text-muted-foreground">
          <strong className="font-semibold text-foreground">
            region is self-attested
          </strong>{" "}
          — each operator declares its country on{" "}
          <span className="font-mono">CapacityBond</span> (
          <span className="font-mono">updateRegion</span>, ADR 030), indexed
          on-chain, no gossip; there&apos;s no IP→geo check, so it&apos;s
          recorded, not verified.{" "}
          <strong className="font-semibold text-foreground">
            cache hit and p95 are aggregated from node cache-miss pull-through
          </strong>{" "}
          — every miss settles as a node-to-node pull through{" "}
          <span className="font-mono">FeeRouter</span>, so pull volume and fill
          latency bucket cleanly by the pulling node&apos;s region. p95 is the
          pull-fill tail, not client-side render time.
        </p>
      </CardContent>
    </Card>
  )
}
