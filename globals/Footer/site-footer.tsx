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
    <footer className="mx-auto mt-16 w-full max-w-6xl px-6 pb-10 text-foreground">
      <div className="@container flex flex-col gap-3">
        <span aria-hidden className="block h-px w-full bg-current opacity-40" />
        <div className="grid grid-cols-1 gap-6 text-[11px] tracking-[0.2em] uppercase opacity-80 @md:grid-cols-3 @md:items-start @md:gap-2">
          <span>© decdn labs · open source</span>
          <span className="@md:text-center">
            built in rust · probably over-engineered
          </span>
          <nav
            aria-label="Resources"
            className="flex flex-col gap-2 @md:items-end @md:justify-self-end"
          >
            {LINKS.map(({ href, label }) => (
              <a
                key={label}
                href={href}
                className="outline-offset-4 focus-visible:outline-1 focus-visible:outline-current focus-visible:outline-dashed"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}
