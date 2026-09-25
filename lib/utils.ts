export { cn } from "cn"

const byteUnits = ["B", "KB", "MB", "GB", "TB", "PB"]

// Raw byte count → value in the largest base-1000 unit (up to PB) that keeps
// it ≥ 1,
// plus the divisor so related figures can be put in the same unit.
export function scaleBytes(bytes: number) {
  let value = bytes
  let unit = 0
  while (value >= 1000 && unit < byteUnits.length - 1) {
    value /= 1000
    unit += 1
  }
  return { value, unit: byteUnits[unit], divisor: 1000 ** unit }
}

// Whole bytes stay whole: "0 B", not "0.0 B".
export function formatBytes(bytes: number) {
  const { value, unit } = scaleBytes(bytes)
  return `${value.toFixed(unit === "B" ? 0 : 1)} ${unit}`
}

// 6-decimal USDC base units → "0.318204", without going through a float.
export function formatUsdc(base: string) {
  const value = BigInt(base)
  const scale = BigInt(1_000_000)
  const whole = value / scale
  const frac = (value % scale).toString().padStart(6, "0")
  return `${whole}.${frac}`
}

// 6-decimal USDC base units → "61.40", truncated (never rounded up) to cents.
export function formatUsdcCents(base: string) {
  const [whole, frac] = formatUsdc(base).split(".")
  return `${whole}.${frac.slice(0, 2)}`
}

export function truncateHex(hex: string, lead = 6, tail = 4) {
  if (hex.length <= lead + tail + 1) return hex
  return `${hex.slice(0, lead)}…${hex.slice(-tail)}`
}

// unix seconds → "2026-09-08 14:12" (UTC). Minutes, not seconds: the
// indexer runs every 10 minutes, so seconds are false precision.
export function formatUtcTime(timestamp: number) {
  return new Date(timestamp * 1000).toISOString().slice(0, 16).replace("T", " ")
}
