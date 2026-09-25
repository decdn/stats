import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {}

export default nextConfig

// Gives `next dev` the Worker's bindings and vars (wrangler.jsonc plus .env),
// so getStats() reads the same local bucket `pnpm index` writes.
initOpenNextCloudflareForDev()
