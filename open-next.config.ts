import { defineCloudflareConfig } from "@opennextjs/cloudflare"
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache"
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue"

// The page revalidates every 60s: R2 holds the rendered page between
// regenerations. The in-memory queue (rather than the Durable Object one)
// keeps the Worker free of DO migrations, which `wrangler versions upload`
// refuses to apply.
const config = {
  ...defineCloudflareConfig({
    incrementalCache: r2IncrementalCache,
    queue: memoryQueue,
  }),
  // `pnpm build` runs this OpenNext build, so OpenNext must not run it back.
  buildCommand: "pnpm exec next build",
}

export default config
