import { readFileSync, writeFileSync } from "node:fs"

import {
  geoArea,
  geoCentroid,
  geoEqualEarth,
  geoPath,
  type GeoPermissibleObjects,
} from "d3-geo"
import type { MultiPolygon, Polygon } from "geojson"
import countries from "i18n-iso-countries"
import prettier from "prettier"
import { feature } from "topojson-client"
import type { GeometryCollection, Topology } from "topojson-specification"

// `pnpm world-map`: writes lib/world-map.json, the by-region map's geometry,
// projected once here so the page ships a plain SVG path and no geo library.
// It's generated; edit this script and re-run it rather than editing the JSON.
// The land comes from Natural Earth 110m (world-atlas), and each country's
// point from 50m, which still has small hubs like SG, HK and MT.

const WIDTH = 960
const OUT = new URL("../lib/world-map.json", import.meta.url)

function atlas(name: string) {
  const url = new URL(import.meta.resolve(`world-atlas/${name}`))
  return JSON.parse(readFileSync(url, "utf8")) as Topology<{
    [key: string]: GeometryCollection
  }>
}

function polygons(geometry: Polygon | MultiPolygon): Polygon[] {
  if (geometry.type === "Polygon") return [geometry]
  return geometry.coordinates.map((coordinates) => ({
    type: "Polygon",
    coordinates,
  }))
}

function isAntarctica(polygon: Polygon) {
  return geoCentroid(polygon)[1] < -60
}

const landTopology = atlas("land-110m.json")
const land: GeoPermissibleObjects = {
  type: "MultiPolygon",
  coordinates: feature(landTopology, landTopology.objects.land)
    .features.flatMap((f) => polygons(f.geometry as Polygon | MultiPolygon))
    .filter((polygon) => !isAntarctica(polygon))
    .map((polygon) => polygon.coordinates),
}

const projection = geoEqualEarth().fitWidth(WIDTH, land)
const path = geoPath(projection).digits(1)
const height = Math.ceil(path.bounds(land)[1][1])

const round = (n: number) => Math.round(n * 10) / 10

// A country's largest polygon, so FR, NL, NO and US sit on their mainland
// instead of being pulled toward overseas territories.
const countryTopology = atlas("countries-50m.json")
const centroids: Record<string, [number, number]> = {}
for (const f of feature(countryTopology, countryTopology.objects.countries)
  .features) {
  const code = f.id === undefined ? undefined : countries.numericToAlpha2(f.id)
  if (!code || code === "AQ") continue
  const largest = polygons(f.geometry as Polygon | MultiPolygon).reduce(
    (a, b) => (geoArea(b) > geoArea(a) ? b : a)
  )
  const point = projection(geoCentroid(largest))
  if (point) centroids[code] = [round(point[0]), round(point[1])]
}

const json = JSON.stringify({
  viewBox: [0, 0, WIDTH, height],
  land: path(land),
  centroids: Object.fromEntries(
    Object.entries(centroids).sort(([a], [b]) => a.localeCompare(b))
  ),
})
const options = await prettier.resolveConfig(OUT)
writeFileSync(
  OUT,
  await prettier.format(json, { ...options, filepath: OUT.pathname })
)
console.log(
  `wrote lib/world-map.json: ${Object.keys(centroids).length} countries`
)
