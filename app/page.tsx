import { Hero } from "@/blocks/hero"
import { MetricActiveNodes } from "@/blocks/metric-active-nodes"
import { MetricBytesServed } from "@/blocks/metric-bytes-served"
import { MetricValueSettled } from "@/blocks/metric-value-settled"
import { OffChainSignals } from "@/blocks/off-chain-signals"
import { Regions } from "@/blocks/regions"
import { SettlementsTable } from "@/blocks/settlements-table"
import { SiteFooter } from "@/globals/Footer/site-footer"
import { SiteHeader } from "@/globals/Header/site-header"
import { SectionDivider } from "@/globals/SectionDivider/section-divider"

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-6">
        <Hero />
        <SectionDivider />
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricValueSettled />
          <MetricBytesServed />
          <MetricActiveNodes />
        </section>
        <SectionDivider />
        <section className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
          <Regions />
          <OffChainSignals />
        </section>
        <SectionDivider />
        <SettlementsTable />
      </main>
      <SiteFooter />
    </div>
  )
}
