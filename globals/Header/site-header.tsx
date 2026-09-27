import { HeaderShell } from "@/globals/Header/header-shell"
import { Wordmark } from "@/globals/Wordmark/wordmark"

import { HeaderNav } from "./header-nav"
import { ThemeSwitch } from "./theme-switch"

export function SiteHeader() {
  return (
    <HeaderShell>
      <div className="px-frame-gutter">
        <div className="mx-auto grid h-24 w-full max-w-frame grid-cols-[1fr_auto_1fr] items-center gap-4">
          <a href="https://decdn.org" className="justify-self-start">
            <Wordmark />
          </a>
          <HeaderNav />
          <div className="col-start-3 justify-self-end">
            <ThemeSwitch />
          </div>
        </div>
      </div>
    </HeaderShell>
  )
}
