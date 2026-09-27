"use client"

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"

import { cn } from "@/lib/utils"

// A mouse press that moves this many pixels sideways is a drag, not a click.
const dragThreshold = 4

// A horizontal scroller for a table wider than its container: touch swipes it
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
  const [fadeLeft, setFadeLeft] = useState(false)
  const [fadeRight, setFadeRight] = useState(false)
  const [dragging, setDragging] = useState(false)
  const scrollable = fadeLeft || fadeRight

  useEffect(() => {
    const scroller = ref.current
    if (!scroller) return
    // No requestAnimationFrame throttle: scroll events and ResizeObserver
    // callbacks already arrive once a frame, and the setters bail out when
    // nothing changed.
    const update = () => {
      const max = scroller.scrollWidth - scroller.clientWidth
      // Allow 1px either way: sub-pixel widths leave scrollLeft a fraction
      // short of max at the end.
      setFadeLeft(scroller.scrollLeft > 1)
      setFadeRight(scroller.scrollLeft < max - 1)
    }

    update()
    const listeners = new AbortController()
    scroller.addEventListener("scroll", update, {
      passive: true,
      signal: listeners.signal,
    })
    // The table resizes as stats load and rows change, and the scroller
    // resizes with the viewport. Watch the <table> itself, which both blocks
    // always render: with the overflow-visible override below, shadcn's
    // container around it stays the scroller's width while it overflows.
    const observer = new ResizeObserver(update)
    observer.observe(scroller)
    const table = scroller.querySelector("table")
    if (table) observer.observe(table)
    return () => {
      listeners.abort()
      observer.disconnect()
    }
  }, [])

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const scroller = ref.current
    if (!scroller || !scrollable) return
    // Touch and pen scroll natively.
    if (event.pointerType !== "mouse" || event.button !== 0) return
    // A press below the content box is on the native scrollbar, which scrolls
    // by itself.
    const { top } = scroller.getBoundingClientRect()
    if (event.clientY >= top + scroller.clientTop + scroller.clientHeight) {
      return
    }

    const startX = event.clientX
    const startLeft = scroller.scrollLeft
    let moved = false
    const drag = new AbortController()

    const onMove = (move: PointerEvent) => {
      // The button came up where the page didn't see it (a context menu, an
      // app switch), so no pointerup ends the drag.
      if ((move.buttons & 1) === 0) return onUp()
      const dx = move.clientX - startX
      if (!moved) {
        if (Math.abs(dx) < dragThreshold) return
        moved = true
        setDragging(true)
        window.getSelection()?.removeAllRanges()
      }
      scroller.scrollLeft = startLeft - dx
    }

    const onUp = () => {
      drag.abort()
      if (!moved) return
      setDragging(false)
      // A drag that starts and ends on the same link would still click it.
      // The click follows pointerup in the same task, so the timeout only
      // disarms this when the release landed where no click fires.
      const swallow = (click: MouseEvent) => {
        click.preventDefault()
        click.stopPropagation()
      }
      window.addEventListener("click", swallow, { capture: true, once: true })
      setTimeout(() =>
        window.removeEventListener("click", swallow, { capture: true })
      )
    }

    window.addEventListener("pointermove", onMove, { signal: drag.signal })
    window.addEventListener("pointerup", onUp, { signal: drag.signal })
    window.addEventListener("pointercancel", onUp, { signal: drag.signal })
  }

  return (
    // The focus ring sits on this unmasked wrapper, where the edge fade can't
    // hide it.
    <div className="rounded-sm has-[>:focus-visible]:ring-[3px] has-[>:focus-visible]:ring-ring/50">
      <div
        ref={ref}
        role="region"
        aria-label={label}
        // Focusable only while there's something to scroll with the arrow
        // keys.
        tabIndex={scrollable ? 0 : undefined}
        onPointerDown={onPointerDown}
        // A native drag of a link or selection would cancel ours.
        onDragStart={scrollable ? (event) => event.preventDefault() : undefined}
        className={cn(
          "w-full overflow-x-auto overscroll-x-contain outline-none *:data-[slot=table-container]:overflow-visible",
          fadeLeft && "mask-l-from-[calc(100%-2rem)]",
          fadeRight && "mask-r-from-[calc(100%-2rem)]",
          scrollable && "cursor-grab",
          dragging && "cursor-grabbing select-none"
        )}
      >
        {children}
      </div>
    </div>
  )
}
