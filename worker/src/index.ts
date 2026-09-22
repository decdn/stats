import type { Env } from "./env"
import { runIndex } from "./run"
import { STATS_KEY, statsStore } from "./store"

export default {
  // Awaited (not waitUntil) so a failed run marks the cron invocation as
  // failed — that's what the dashboard's cron health and alerting key on.
  async scheduled(_event, env) {
    await runIndex(env)
  },

  // Serves the current stats.json from whichever store the cron writes to,
  // so the Next app can read it locally (STATS_URL=http://localhost:8787/stats.json).
  // Doubles as the public URL in prod if the bucket itself isn't made public.
  async fetch(request, env) {
    const url = new URL(request.url)
    if (request.method !== "GET" || url.pathname !== `/${STATS_KEY}`) {
      return new Response("not found", { status: 404 })
    }
    try {
      const body = await statsStore(env).get()
      if (body === null) {
        return new Response("stats.json not indexed yet", { status: 404 })
      }
      return new Response(body, {
        headers: {
          "content-type": "application/json",
          "cache-control": "public, max-age=60",
        },
      })
    } catch (err) {
      console.error("stats.json read failed", err)
      return new Response("stats store error", { status: 500 })
    }
  },
} satisfies ExportedHandler<Env>
