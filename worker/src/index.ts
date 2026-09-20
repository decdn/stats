import type { Env } from "./env"
import { runIndex, STATS_KEY } from "./run"

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(runIndex(env))
  },

  // Serves the current stats.json so the Next app can read the locally
  // emulated bucket (STATS_URL=http://localhost:8787/stats.json). Doubles as
  // the public URL in prod if the bucket itself isn't made public.
  async fetch(request, env) {
    const url = new URL(request.url)
    if (request.method !== "GET" || url.pathname !== `/${STATS_KEY}`) {
      return new Response("not found", { status: 404 })
    }
    const object = await env.STATS.get(STATS_KEY)
    if (!object)
      return new Response("stats.json not indexed yet", { status: 404 })
    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set("etag", object.httpEtag)
    return new Response(object.body, { headers })
  },
} satisfies ExportedHandler<Env>
