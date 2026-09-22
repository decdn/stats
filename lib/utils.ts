export { cn } from "cn"

const byteUnits = ["B", "KB", "MB", "GB", "TB", "PB"]

export function formatBytes(bytes: number) {
  let value = bytes
  let unit = 0
  while (value >= 1000 && unit < byteUnits.length - 1) {
    value /= 1000
    unit += 1
  }
  return `${value.toFixed(1)} ${byteUnits[unit]}`
}

// 6-decimal USDC base units → "0.318204", without going through a float.
export function formatUsdc(base: string) {
  const value = BigInt(base)
  const scale = BigInt(1_000_000)
  const whole = value / scale
  const frac = (value % scale).toString().padStart(6, "0")
  return `${whole}.${frac}`
}

export function truncateHex(hex: string, lead = 6, tail = 4) {
  if (hex.length <= lead + tail + 1) return hex
  return `${hex.slice(0, lead)}…${hex.slice(-tail)}`
}

// unix seconds → "2026-09-08 14:12:07" (UTC)
export function formatUtcTime(timestamp: number) {
  return new Date(timestamp * 1000).toISOString().slice(0, 19).replace("T", " ")
}
