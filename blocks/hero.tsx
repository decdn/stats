export function Hero() {
  return (
    <section>
      <div className="border-t border-border" />
      <div className="flex items-center justify-between gap-4 pt-3 font-mono text-[10px] tracking-wide text-muted-foreground uppercase sm:text-[11px] sm:tracking-widest">
        <span className="whitespace-nowrap">live · on-chain state</span>
        <span className="whitespace-nowrap">live · on-chain state</span>
      </div>
      <h1 className="mt-10 text-5xl leading-[1.05] font-medium tracking-tight lowercase sm:text-6xl md:text-7xl">
        the network is on
        <span
          aria-hidden="true"
          className="ml-2 inline-block size-3 bg-accent-green align-baseline md:size-4"
        />
        <span className="sr-only">.</span>
      </h1>
      <p className="mt-8 max-w-[65ch] text-base leading-relaxed text-muted-foreground lowercase">
        every headline figure below is{" "}
        <strong className="font-semibold text-foreground">
          raw on-chain state
        </strong>{" "}
        read from arbitrum sepolia — nothing annualized, projected, or invented.
        the three numbers that matter most are the three no operator can fake:{" "}
        <strong className="font-semibold text-foreground">value settled</strong>
        ,{" "}
        <strong className="font-semibold text-foreground">bytes served</strong>,
        and{" "}
        <strong className="font-semibold text-foreground">active nodes</strong>.
        verify any settlement yourself on the block explorer.
      </p>
    </section>
  )
}
