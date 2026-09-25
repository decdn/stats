import type { Env } from "./env"
import { runIndex } from "./run"
import { statsKey, statsStore } from "./store"

export default {
  // Awaited (not waitUntil) so a failed run marks the cron invocation as
  // failed — that's what the dashboard's cron health and alerting key on.
  async scheduled(_event, env) {
    await runIndex(env)
  },

  // Serves the configured chain's stats file (`/stats-<CHAIN_ID>.json`) from
  // whichever store the cron writes to, so the Next app can read it locally
  // (STATS_BASE_URL=http://localhost:8787). Doubles as the public origin in
  // prod if the bucket itself isn't made public.
  async fetch(request, env) {
    try {
      const key = statsKey(env)
      const url = new URL(request.url)
      if (request.method !== "GET" || url.pathname !== `/${key}`) {
        return new Response("not found", { status: 404 })
      }
      const store = statsStore(env)
      const body = await store.get()
      if (body === null) {
        return new Response(`${store.key} not indexed yet`, { status: 404 })
      }
      return new Response(body, {
        headers: {
          "content-type": "application/json",
          "cache-control": "public, max-age=60",
        },
      })
    } catch (err) {
      console.error("stats read failed", err)
      return new Response("stats store error", { status: 500 })
    }
  },
} satisfies ExportedHandler<Env>
