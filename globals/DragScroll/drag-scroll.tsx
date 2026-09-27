"use client"

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"

import { cn } from "@/lib/utils"

// Past this many pixels a mouse press is a drag, not a click.
const dragThreshold = 4

// A horizontal scroller for a table wider than the screen: touch swipes it
// natively, a mouse drags it, and an edge fades while there's more that way.
// It takes over from shadcn's own table container, which would otherwise be a
// second, nested scroller.
export function DragScroll({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })
  const [dragging, setDragging] = useState(false)
  const scrollable = edges.left || edges.right

  useEffect(() => {
    const scroller = ref.current
    if (!scroller) return
    // Scroll events and ResizeObserver callbacks already arrive at most once
    // a frame, and setEdges bails out when nothing changed.
    const update = () => {
      const max = scroller.scrollWidth - scroller.clientWidth
      // Sub-pixel widths leave scrollLeft a fraction short of max at the end.
      const left = scroller.scrollLeft > 1
      const right = scroller.scrollLeft < max - 1
      setEdges((prev) =>
        prev.left === left && prev.right === right ? prev : { left, right }
      )
    }

    update()
    scroller.addEventListener("scroll", update, { passive: true })
    // The table resizes as stats load and rows change, the scroller with the
    // viewport. Watch the <table> itself: shadcn's container around it stays
    // the scroller's width while the table overflows it.
    const observer = new ResizeObserver(update)
    observer.observe(scroller)
    const table = scroller.querySelector("table")
    if (table) observer.observe(table)
    return () => {
      scroller.removeEventListener("scroll", update)
      observer.disconnect()
    }
  }, [])

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const scroller = ref.current
    // Touch and pen scroll natively.
    if (!scroller || !scrollable) return
    if (event.pointerType !== "mouse" || event.button !== 0) return

    const startX = event.clientX
    const startLeft = scroller.scrollLeft
    let moved = false

    const onMove = (move: PointerEvent) => {
      const dx = move.clientX - startX
      if (!moved && Math.abs(dx) < dragThreshold) return
      if (!moved) {
        moved = true
        setDragging(true)
        window.getSelection()?.removeAllRanges()
      }
      scroller.scrollLeft = startLeft - dx
    }

    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
      if (!moved) return
      setDragging(false)
      // Releasing a drag over a link would otherwise open it. The click
      // follows pointerup in the same task, so the timeout only disarms this
      // when the release landed where no click fires.
      const swallow = (click: MouseEvent) => {
        click.preventDefault()
        click.stopPropagation()
      }
      window.addEventListener("click", swallow, { capture: true, once: true })
      setTimeout(() =>
        window.removeEventListener("click", swallow, { capture: true })
      )
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
  }

  const fadeLeft = edges.left ? "transparent, black 2rem" : "black"
  const fadeRight = edges.right
    ? "black calc(100% - 2rem), transparent"
    : "black"
  const mask = scrollable
    ? `linear-gradient(to right, ${fadeLeft}, ${fadeRight})`
    : undefined

  return (
    <div
      ref={ref}
      role="region"
      aria-label={label}
      // Focusable only while there's something to scroll with the arrow keys.
      tabIndex={scrollable ? 0 : undefined}
      onPointerDown={onPointerDown}
      // A dragged link or selection would start a native drag and cancel
      // ours.
      onDragStart={scrollable ? (event) => event.preventDefault() : undefined}
      style={{ maskImage: mask, WebkitMaskImage: mask }}
      className={cn(
        "w-full overflow-x-auto overscroll-x-contain rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset [&>[data-slot=table-container]]:overflow-visible",
        scrollable && "cursor-grab",
        dragging && "cursor-grabbing select-none"
      )}
    >
      {children}
    </div>
  )
}
