"use client"

import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

// Ids are set on each section's <section>: metrics in app/page.tsx, the rest
// in their blocks.
const SECTIONS = [
  { id: "metrics", label: "metrics" },
  { id: "by-region", label: "by region" },
  { id: "settlements", label: "settlements" },
] as const

type SectionId = (typeof SECTIONS)[number]["id"]

// The page's section links. The active one is the last section whose top has
// reached the header's bottom edge, where an anchor jump lands it; none while
// the hero shows, and the last at the page bottom, which it can't scroll up to.
export function HeaderNav() {
  const ref = useRef<HTMLElement>(null)
  const [active, setActive] = useState<SectionId | null>(null)

  useEffect(() => {
    let frame = 0

    const update = () => {
      frame = 0
      // offsetHeight, not the rect: the header slides away on scroll down, but
      // scroll-pt-24 still lands anchors below where it would sit.
      const edge = (ref.current?.closest("header")?.offsetHeight ?? 0) + 1
      const atBottom =
        window.scrollY > 0 &&
        window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 1
      let next: SectionId | null = null
      for (const { id } of SECTIONS) {
        const top = document.getElementById(id)?.getBoundingClientRect().top
        if (top !== undefined && top <= edge) next = id
      }
      setActive(atBottom ? SECTIONS[SECTIONS.length - 1].id : next)
    }

    const onChange = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener("scroll", onChange, { passive: true })
    window.addEventListener("resize", onChange, { passive: true })
    return () => {
      window.removeEventListener("scroll", onChange)
      window.removeEventListener("resize", onChange)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <nav ref={ref} aria-label="Sections" className="hidden md:block">
      <ul className="flex items-center gap-7">
        {SECTIONS.map(({ id, label }) => {
          const current = active === id
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={current ? "true" : undefined}
                className="group relative inline-flex items-center pb-1 text-xs leading-none font-medium tracking-[0.2em] uppercase outline-offset-4 focus-visible:outline-1 focus-visible:outline-current focus-visible:outline-dashed"
              >
                <span
                  className={cn(
                    "transition-opacity duration-220 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none",
                    current
                      ? "opacity-100"
                      : "opacity-65 group-hover:opacity-90"
                  )}
                >
                  {label}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left transition-[scale,background-color] duration-260 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none",
                    current
                      ? "scale-x-100 bg-accent-green"
                      : "scale-x-0 bg-current group-hover:scale-x-40"
                  )}
                />
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
