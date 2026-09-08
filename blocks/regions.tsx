import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { regions } from "@/lib/mock"

export function Regions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>operator-reported regions</CardTitle>
        <CardDescription>nodes across 9 countries</CardDescription>
        <CardAction>
          <span className="font-mono text-[10px] tracking-wide whitespace-nowrap text-muted-foreground uppercase sm:text-[11px] sm:tracking-widest">
            gossip
          </span>
        </CardAction>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-2">
          {regions.map((region) => (
            <div key={region.code} className="flex items-center gap-3">
              <dt className="w-8 font-mono text-sm text-muted-foreground">
                {region.code}
              </dt>
              <span aria-hidden="true" className="h-px flex-1 bg-border" />
              <dd className="w-6 text-right font-mono text-sm tabular-nums">
                {region.count}
              </dd>
            </div>
          ))}
        </dl>
        <Separator />
        <p className="text-sm text-muted-foreground">
          the bars are{" "}
          <strong className="font-semibold text-foreground">decorative</strong>{" "}
          — every one is the same length. self-reported location is not a
          measurement, so nothing here is drawn to scale.
        </p>
      </CardContent>
    </Card>
  )
}
