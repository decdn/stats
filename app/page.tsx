import { ByRegion } from "@/blocks/by-region"
import { Hero } from "@/blocks/hero"
import { MetricRegisteredNodes } from "@/blocks/metric-registered-nodes"
import { MetricBytesServed } from "@/blocks/metric-bytes-served"
import { MetricValueSettled } from "@/blocks/metric-value-settled"
import { SettlementsTable } from "@/blocks/settlements-table"
import { SiteFooter } from "@/globals/Footer/site-footer"
import { SiteHeader } from "@/globals/Header/site-header"
import { StatsProvider } from "@/lib/stats"

// Exported as static HTML in its loading state; StatsProvider fetches the
// stats file in the browser and every live section reads it via useStats().
export default function Page() {
  return (
    <StatsProvider>
      <div className="flex min-h-svh flex-col bg-background">
        <SiteHeader />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6">
          <Hero />
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MetricValueSettled />
            <MetricBytesServed />
            <MetricRegisteredNodes />
          </section>
          <ByRegion />
          <SettlementsTable />
        </main>
        <SiteFooter />
      </div>
    </StatsProvider>
  )
}
