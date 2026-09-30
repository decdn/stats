// What a metric card shows in its chart's place when the chart's chunk fails
// to load. It sits in the card's own bundle, so it imports nothing from
// recharts.
export function ChartUnavailable() {
  return (
    <p className="flex h-24 items-center justify-center font-mono text-xs text-muted-foreground lowercase">
      chart unavailable · reload to retry
    </p>
  )
}
