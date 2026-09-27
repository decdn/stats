import { Wordmark } from "@/globals/Wordmark/wordmark"

export function SiteHeader() {
  return (
    <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
      <a href="https://decdn.org">
        <Wordmark />
      </a>
      <a
        href="https://sepolia.arbiscan.io"
        target="_blank"
        rel="noreferrer"
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        arbitrum sepolia testnet
        <span aria-hidden="true"> ↗</span>
      </a>
    </header>
  )
}
