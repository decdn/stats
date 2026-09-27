"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

// Pins the header to the top of the viewport, slides it away while the page
// scrolls down and back the moment it scrolls up. Within the header's own
// height it always shows, so the top of the page never opens a blank band.
// A click on one of its section links keeps it shown through the scroll that
// the link starts.
export function HeaderShell({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  const pin = useRef(() => {})
  const [hidden, setHidden] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    let lastY = window.scrollY
    let frame = 0
    // Set from a section link click until scrolling has been idle for 200ms,
    // which is how the smooth scroll it starts is told apart from the reader's.
    // scrollend would be exact, but Safari lacks it.
    let pinned = false
    let idle = 0

    const settle = () => {
      clearTimeout(idle)
      idle = window.setTimeout(() => {
        pinned = false
      }, 200)
    }

    pin.current = () => {
      pinned = true
      setHidden(false)
      settle()
    }

    const update = () => {
      frame = 0
      // Rubber-band overscroll (Safari) reports scrollY past the page; clamp
      // it so the bounce back from the bottom doesn't read as a scroll up.
      const maxY = document.documentElement.scrollHeight - window.innerHeight
      const y = Math.min(Math.max(window.scrollY, 0), maxY)
      const header = ref.current
      const height = header?.offsetHeight ?? 0
      // Keyboard focus inside the header keeps it on screen. :focus-visible
      // skips mouse focus, which a clicked switch or link would otherwise keep
      // until the next click elsewhere, pinning the header.
      const focused = !!header?.querySelector(":focus-visible")

      setScrolled(y > 0)
      if (y <= height || y < lastY || focused || pinned) setHidden(false)
      else if (y > lastY) setHidden(true)
      lastY = y
    }

    const onScroll = () => {
      if (pinned) settle()
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(frame)
      clearTimeout(idle)
    }
  }, [])

  return (
    <header
      ref={ref}
      // Tabbing into a hidden header brings it back.
      onFocus={() => setHidden(false)}
      onClick={(event) => {
        if ((event.target as Element).closest('a[href^="#"]')) pin.current()
      }}
      className={cn(
        "sticky top-0 z-40 border-b bg-background transition-[translate,border-color] duration-400 ease-in-out motion-reduce:transition-none",
        scrolled ? "border-border" : "border-transparent",
        hidden && "-translate-y-full"
      )}
    >
      {children}
    </header>
  )
}
