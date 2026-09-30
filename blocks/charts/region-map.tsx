"use client"

import { useEffect, useRef, useState } from "react"

import type { RegionRow } from "@/lib/regions"
import { enterClass } from "@/lib/utils"
import worldMap from "@/lib/world-map.json"

export type MapPoint = { code: string; nodes: number; bytesServed: bigint }

// Declared codes that are common but not ISO alpha-2, drawn on the country
// they mean. Only the map resolves them; the table shows what was declared.
const REGION_ALIASES: Record<string, string> = { UK: "GB", EL: "GR" }

const centroids: Record<string, number[]> = worldMap.centroids
const viewWidth = worldMap.viewBox[2]

// Radii in screen pixels, so circles read the same at any width. Europe's
// centroids sit a few pixels apart on a phone, so circles overlap there; the
// largest draw first and every one keeps a solid ring on top.
const R_MIN = 3
const R_MAX = 10

// One point per country with nodes, merging rows that alias to the same one.
// Codes with no centroid (UNKNOWN_REGION, two letters that aren't a country)
// stay off the map.
function mapPoints(rows: RegionRow[]) {
  const points = new Map<string, MapPoint>()
  for (const row of rows) {
    const code = REGION_ALIASES[row.code] ?? row.code
    if (!(code in centroids)) continue
    const point = points.get(code) ?? {
      code,
      nodes: 0,
      bytesServed: BigInt(0),
    }
    point.nodes += row.nodes
    point.bytesServed += row.bytesServed
    points.set(code, point)
  }
  return [...points.values()]
    .filter((point) => point.nodes > 0)
    .sort((a, b) => b.nodes - a.nodes)
}

export function RegionMap({
  rows,
  label,
  pointLabel,
}: {
  rows: RegionRow[]
  label: string
  pointLabel: (point: MapPoint) => string
}) {
  const ref = useRef<SVGSVGElement>(null)
  // Rendered width, measured after mount; circles wait for it.
  const [width, setWidth] = useState<number | null>(null)

  useEffect(() => {
    const svg = ref.current
    if (!svg) return
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width)
    })
    observer.observe(svg)
    return () => observer.disconnect()
  }, [])

  const points = width ? mapPoints(rows) : []
  const maxNodes = points[0]?.nodes ?? 0
  const unitsPerPixel = width ? viewWidth / width : 0

  return (
    <svg
      ref={ref}
      role="img"
      aria-label={label}
      viewBox={worldMap.viewBox.join(" ")}
      className="h-auto w-full"
    >
      <path d={worldMap.land} className="fill-muted" />
      {points.length > 0 && (
        <g className={enterClass(false)}>
          {points.map((point) => {
            const [x, y] = centroids[point.code]
            const r =
              R_MIN + (R_MAX - R_MIN) * Math.sqrt(point.nodes / maxNodes)
            return (
              <circle
                key={point.code}
                cx={x}
                cy={y}
                r={r * unitsPerPixel}
                vectorEffect="non-scaling-stroke"
                className="fill-accent-green/35 stroke-accent-green"
              >
                <title>{pointLabel(point)}</title>
              </circle>
            )
          })}
        </g>
      )}
    </svg>
  )
}
