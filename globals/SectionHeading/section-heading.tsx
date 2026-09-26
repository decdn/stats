import type { ReactNode } from "react"

// A section's top rule, h2 and short description. Blocks pass their own copy;
// the description is where a section names the contracts it reads.
export function SectionHeading({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <header className="border-t border-border pt-6">
      <h2 className="text-2xl font-medium tracking-tight text-balance lowercase sm:text-3xl">
        {title}
      </h2>
      <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
        {children}
      </p>
    </header>
  )
}
