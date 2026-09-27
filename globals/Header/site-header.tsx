import { Wordmark } from "@/globals/Wordmark/wordmark"

import { ThemeSwitch } from "./theme-switch"

export function SiteHeader() {
  return (
    <header className="mx-auto flex h-24 w-full max-w-6xl items-center justify-between px-6">
      <a href="https://decdn.org">
        <Wordmark />
      </a>
      <ThemeSwitch />
    </header>
  )
}
