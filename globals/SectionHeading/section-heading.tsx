import type { ReactNode } from "react"

// A section's top rule, h2 and short description. Blocks pass their own copy;
// the description is where a section names the contracts it reads. `id` goes
// on the h2, which names the section through its aria-labelledby.
export function SectionHeading({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <header className="border-t border-border pt-6">
      <h2 id={id} className="type-h2 text-balance lowercase">
        {title}
      </h2>
      <p className="mt-2 max-w-[65ch] type-prose">{children}</p>
    </header>
  )
}
