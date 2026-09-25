export function SectionDivider({
  left,
  right,
}: {
  left: string
  right: string
}) {
  return (
    <div className="flex flex-col gap-2 font-mono text-[10px] tracking-wide text-muted-foreground sm:flex-row sm:items-center sm:gap-4 sm:text-[11px] sm:tracking-widest">
      <span className="whitespace-nowrap">{left}</span>
      <span className="h-px w-full bg-border sm:w-auto sm:flex-1" />
      <span className="whitespace-nowrap">{right}</span>
    </div>
  )
}
