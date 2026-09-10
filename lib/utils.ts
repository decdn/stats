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
