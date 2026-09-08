export type MetricPoint = {
  t: string
  value: number
}

export type Metric = {
  value: string
  unit?: string
  delta: string
  series: MetricPoint[]
}

const valueSettledSeries: MetricPoint[] = [
  { t: "t-11", value: 42.18 },
  { t: "t-10", value: 44.06 },
  { t: "t-9", value: 43.71 },
  { t: "t-8", value: 46.9 },
  { t: "t-7", value: 48.33 },
  { t: "t-6", value: 47.85 },
  { t: "t-5", value: 51.24 },
  { t: "t-4", value: 53.6 },
  { t: "t-3", value: 55.09 },
  { t: "t-2", value: 57.42 },
  { t: "t-1", value: 59.72 },
  { t: "t-0", value: 61.4 },
]

const bytesServedSeries: MetricPoint[] = [
  { t: "t-11", value: 249.2 },
  { t: "t-10", value: 253.7 },
  { t: "t-9", value: 251.8 },
  { t: "t-8", value: 258.4 },
  { t: "t-7", value: 261.9 },
  { t: "t-6", value: 265.3 },
  { t: "t-5", value: 264.1 },
  { t: "t-4", value: 270.6 },
  { t: "t-3", value: 274.2 },
  { t: "t-2", value: 277.5 },
  { t: "t-1", value: 280.9 },
  { t: "t-0", value: 284.0 },
]

const activeNodesSeries: MetricPoint[] = [
  { t: "t-11", value: 33 },
  { t: "t-10", value: 34 },
  { t: "t-9", value: 34 },
  { t: "t-8", value: 36 },
  { t: "t-7", value: 37 },
  { t: "t-6", value: 37 },
  { t: "t-5", value: 38 },
  { t: "t-4", value: 39 },
  { t: "t-3", value: 40 },
  { t: "t-2", value: 41 },
  { t: "t-1", value: 41 },
  { t: "t-0", value: 42 },
]

export const valueSettledMetric: Metric = {
  value: "61.40",
  delta: "+1.68",
  series: valueSettledSeries,
}

export const bytesServedMetric: Metric = {
  value: "284.0",
  unit: "GB",
  delta: "+3.1 GB",
  series: bytesServedSeries,
}

export const activeNodesMetric: Metric = {
  value: "42",
  delta: "+1",
  series: activeNodesSeries,
}

export type Settlement = {
  time: string
  operator: string
  bytes: string
  value: string
  tx: string
  href: string
}

export const settlements: Settlement[] = [
  {
    time: "2026-09-08 14:12:07",
    operator: "0x8f2a...c41d",
    bytes: "1.42 GB",
    value: "0.318204",
    tx: "0x9c17e4...8ab2",
    href: "#",
  },
  {
    time: "2026-09-08 13:58:41",
    operator: "0x3bd7...9e06",
    bytes: "0.87 GB",
    value: "0.194860",
    tx: "0x41f0aa...2d75",
    href: "#",
  },
  {
    time: "2026-09-08 13:41:19",
    operator: "0xa05c...17f4",
    bytes: "2.06 GB",
    value: "0.461332",
    tx: "0xbe6329...c108",
    href: "#",
  },
  {
    time: "2026-09-08 13:22:55",
    operator: "0x6e19...b283",
    bytes: "0.54 GB",
    value: "0.120915",
    tx: "0x27d5b1...f9e4",
    href: "#",
  },
  {
    time: "2026-09-08 13:04:38",
    operator: "0xd472...50ac",
    bytes: "1.79 GB",
    value: "0.400776",
    tx: "0x5a8c07...31bd",
    href: "#",
  },
  {
    time: "2026-09-08 12:47:02",
    operator: "0x1fc8...e6b9",
    bytes: "0.93 GB",
    value: "0.208247",
    tx: "0xf3049e...7c60",
    href: "#",
  },
]

export type Region = {
  code: string
  count: number
}

export const regions: Region[] = [
  { code: "DE", count: 9 },
  { code: "US", count: 8 },
  { code: "FR", count: 6 },
  { code: "SG", count: 5 },
  { code: "NL", count: 4 },
  { code: "GB", count: 4 },
  { code: "BR", count: 3 },
  { code: "JP", count: 2 },
  { code: "ZA", count: 1 },
]
