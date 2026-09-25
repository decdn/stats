import { ByRegion } from "@/blocks/by-region"
import { Hero } from "@/blocks/hero"
import { MetricRegisteredNodes } from "@/blocks/metric-registered-nodes"
import { MetricBytesServed } from "@/blocks/metric-bytes-served"
import { MetricValueSettled } from "@/blocks/metric-value-settled"
import { SettlementsTable } from "@/blocks/settlements-table"
import { SiteFooter } from "@/globals/Footer/site-footer"
import { SiteHeader } from "@/globals/Header/site-header"
import { SectionDivider } from "@/globals/SectionDivider/section-divider"

// Route-level ISR: getStats() reads R2 rather than fetching, so there is no
// fetch-level revalidate signal — this is the only one.
export const revalidate = 60

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-6">
        <Hero />
        <SectionDivider
          left="totals"
          right="source: FeeRouter · CapacityBond"
        />
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricValueSettled />
          <MetricBytesServed />
          <MetricRegisteredNodes />
        </section>
        <SectionDivider
          left="by region"
          right="source: CapacityBond · FeeRouter · PaymentPool"
        />
        <ByRegion />
        <SectionDivider left="settlements" right="source: FeeRouter" />
        <SettlementsTable />
      </main>
      <SiteFooter />
    </div>
  )
}
