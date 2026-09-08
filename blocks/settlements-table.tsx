import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { settlements } from "@/lib/mock"

const headClassName =
  "font-mono text-[10px] tracking-wide text-muted-foreground uppercase sm:text-[11px] sm:tracking-widest"

export function SettlementsTable() {
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
          {settlements.map((settlement) => (
            <TableRow key={settlement.tx}>
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
    </section>
  )
}
