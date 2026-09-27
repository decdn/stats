import { ThemeSwitch } from "./theme-switch"

export function SiteHeader() {
  return (
    <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
      <a
        href="https://decdn.org"
        className="font-medium tracking-tight underline-offset-4 hover:underline"
      >
        decdn<span className="text-accent-green">_</span>
      </a>
      <ThemeSwitch />
    </header>
  )
}
