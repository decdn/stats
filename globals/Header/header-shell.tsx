"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

// Pins the header to the top of the viewport, slides it away while the page
// scrolls down and back the moment it scrolls up. Within the header's own
// height it always shows, so the top of the page never opens a blank band.
export function HeaderShell({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  const [hidden, setHidden] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    let lastY = window.scrollY
    let frame = 0

    const update = () => {
      frame = 0
      // Clamp so overscroll bounce past either end doesn't read as a reversal.
      const maxY = document.documentElement.scrollHeight - window.innerHeight
      const y = Math.min(Math.max(window.scrollY, 0), maxY)
      const header = ref.current
      const height = header?.offsetHeight ?? 0
      // Keyboard focus inside the header keeps it on screen.
      const focused = !!header?.contains(document.activeElement)

      setScrolled(y > 0)
      if (y <= height || y < lastY || focused) setHidden(false)
      else if (y > lastY) setHidden(true)
      lastY = y
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <header
      ref={ref}
      onFocus={() => setHidden(false)}
      // A transition takes the timing of the state it moves into: hiding is
      // brisk, showing is slower and eases out so it settles into place.
      className={cn(
        "sticky top-0 z-40 border-b bg-background transition-[translate,border-color] motion-reduce:transition-none",
        scrolled ? "border-border" : "border-transparent",
        hidden
          ? "-translate-y-full duration-200 ease-in"
          : "duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
      )}
    >
      {children}
    </header>
  )
}
