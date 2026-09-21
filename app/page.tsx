import { ByRegion } from "@/blocks/by-region"
import { Hero } from "@/blocks/hero"
import { MetricActiveNodes } from "@/blocks/metric-active-nodes"
import { MetricBytesServed } from "@/blocks/metric-bytes-served"
import { MetricValueSettled } from "@/blocks/metric-value-settled"
import { SettlementsTable } from "@/blocks/settlements-table"
import { SiteFooter } from "@/globals/Footer/site-footer"
import { SiteHeader } from "@/globals/Header/site-header"
import { SectionDivider } from "@/globals/SectionDivider/section-divider"

// Route-level ISR: keeps the page regenerating even when STATS_URL is unset
// at build time (no fetch, so no fetch-level revalidate signal exists).
export const revalidate = 60

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-6">
        <Hero />
        <SectionDivider
          left="uncheatable · on-chain"
          right="source: FeeRouter · CapacityBond"
        />
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricValueSettled />
          <MetricBytesServed />
          <MetricActiveNodes />
        </section>
        <SectionDivider
          left="by region"
          right="NODES ON-CHAIN · QUALITY FROM PULL-THROUGH"
        />
        <ByRegion />
        <SectionDivider
          left="uncheatable · on-chain"
          right="source: FeeRouter · CapacityBond"
        />
        <SettlementsTable />
      </main>
      <SiteFooter />
    </div>
  )
}
