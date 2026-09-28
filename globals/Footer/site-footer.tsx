// Modeled on the decdn website footer, components/site/Footer.tsx in
// decdn/website: a rule, then copyright, tagline and links, one column on
// narrow containers and three from @md.
const LINKS = [
  { href: "https://github.com/decdn", label: "github" },
  { href: "https://docs.decdn.org/overview/introduction", label: "docs" },
  { href: "https://decdn.org", label: "website" },
] as const

export function SiteFooter() {
  return (
    <footer className="mt-16 px-frame-gutter pb-10 text-foreground">
      <div className="@container mx-auto flex w-full max-w-frame flex-col gap-3">
        <span aria-hidden className="block h-px w-full bg-current opacity-40" />
        <div className="grid grid-cols-1 gap-6 text-[11px] tracking-[0.2em] uppercase opacity-80 @md:grid-cols-3 @md:items-start @md:gap-2">
          <span>© decdn labs · open source</span>
          <span className="@md:text-center">
            built in rust · probably over-engineered
          </span>
          <nav
            aria-label="Resources"
            className="flex flex-col items-start gap-3 @md:items-end @md:justify-self-end"
          >
            {LINKS.map(({ href, label }) => (
              <a
                key={label}
                href={href}
                className="group relative inline-flex pb-1 leading-none outline-offset-4 focus-visible:outline-1 focus-visible:outline-current focus-visible:outline-dashed"
              >
                {label}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-current transition-[scale] duration-260 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-x-100 motion-reduce:transition-none"
                />
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}
