// A section's rule, heading and one-line description. The description is
// where the section says what it's read from, so provenance is stated once.
export function SectionHeading({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  return (
    <header className="border-t border-border pt-6">
      <h2 className="text-2xl font-medium tracking-tight text-balance lowercase sm:text-3xl">
        {title}
      </h2>
      {children && (
        <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
          {children}
        </p>
      )}
    </header>
  )
}
