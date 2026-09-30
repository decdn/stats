"use client"

import * as React from "react"
import { flushSync } from "react-dom"
import { ThemeProvider as NextThemesProvider } from "next-themes"

function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

// Crossfades the whole page into the new theme with a view transition. The
// provider keeps `disableTransitionOnChange`, so elements don't animate their
// own colors on top of it. Without view transitions, or with reduced motion,
// the theme just switches.
function switchTheme(apply: () => void) {
  if (
    !document.startViewTransition ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    apply()
    return
  }

  // next-themes sets the class in an effect; flushSync commits it before the
  // transition snapshots the new state. A skipped transition (hidden tab, or a
  // second toggle mid-fade) rejects `ready`, but the theme still applies.
  document
    .startViewTransition(() => flushSync(apply))
    .ready.catch(() => {})
}

export { ThemeProvider, switchTheme }
