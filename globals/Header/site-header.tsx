export function SiteHeader() {
  return (
    <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
      <a
        href="https://decdn.org"
        className="font-medium tracking-tight underline-offset-4 hover:underline"
      >
        decdn
      </a>
      <span className="text-sm text-muted-foreground">network status</span>
    </header>
  )
}
