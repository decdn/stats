"use client"

import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

// by-region and settlements are ids on their blocks' <section>. No element
// has the id "top", so per the HTML spec "#top" scrolls to the top of the
// page: metrics are the cards right under the hero, and the top shows both.
const SECTIONS = [
  { id: "top", label: "metrics" },
  { id: "by-region", label: "by region" },
  { id: "settlements", label: "settlements" },
] as const

type SectionId = (typeof SECTIONS)[number]["id"]

// The page's section links. The active one is the last section whose top has
// reached the header's bottom edge, where an anchor jump lands it; metrics
// until by region gets there, and the last at the page bottom, which it can't
// scroll up to.
export function HeaderNav() {
  const ref = useRef<HTMLElement>(null)
  const [active, setActive] = useState<SectionId>(SECTIONS[0].id)

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
      let next: SectionId = SECTIONS[0].id
      for (const { id } of SECTIONS.slice(1)) {
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
                className="group relative inline-flex items-center pb-1 text-micro leading-none font-medium uppercase outline-offset-4 focus-visible:outline-1 focus-visible:outline-current focus-visible:outline-dashed"
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
