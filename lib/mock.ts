export type RegionStats = {
  nodes: number
  bytes: number
  cacheHitPct: number
  p95Ms: number
}

export type Region = RegionStats & {
  code: string
}

export const regions: Region[] = [
  { code: "DE", nodes: 9, bytes: 71_200_000_000, cacheHitPct: 96.4, p95Ms: 24 },
  { code: "US", nodes: 8, bytes: 63_800_000_000, cacheHitPct: 95.1, p95Ms: 31 },
  { code: "FR", nodes: 6, bytes: 44_000_000_000, cacheHitPct: 94.8, p95Ms: 28 },
  { code: "SG", nodes: 5, bytes: 33_100_000_000, cacheHitPct: 92.7, p95Ms: 41 },
  { code: "NL", nodes: 4, bytes: 26_400_000_000, cacheHitPct: 95.9, p95Ms: 22 },
  { code: "GB", nodes: 4, bytes: 21_700_000_000, cacheHitPct: 93.5, p95Ms: 27 },
  { code: "BR", nodes: 3, bytes: 14_900_000_000, cacheHitPct: 90.2, p95Ms: 63 },
  { code: "JP", nodes: 2, bytes: 6_300_000_000, cacheHitPct: 91.8, p95Ms: 44 },
  { code: "ZA", nodes: 1, bytes: 2_600_000_000, cacheHitPct: 88.4, p95Ms: 89 },
]

export const networkTotals: RegionStats = {
  nodes: 42,
  bytes: 284_000_000_000,
  cacheHitPct: 94.7,
  p95Ms: 34,
}
