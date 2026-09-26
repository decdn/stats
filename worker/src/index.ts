import type { Env } from "./env"
import { runIndex } from "./run"

// The indexer's Env plus the assets binding only the fetch fallback reads.
type WorkerEnv = Env & { ASSETS: Fetcher }

// The Worker entry (wrangler.jsonc `main`): the static page in out/ is served
// as assets, and the cron indexes the chain into the STATS bucket, which is
// public at data.decdn.org for the page to fetch.
export default {
  // Only reached for paths that match no asset; the assets binding answers
  // them with out/404.html (`not_found_handling`).
  fetch(request, env) {
    return env.ASSETS.fetch(request)
  },

  // Awaited (not waitUntil) so a failed run marks the cron invocation as
  // failed — that's what the dashboard's cron health and alerting key on.
  async scheduled(_event, env) {
    await runIndex(env)
  },
} satisfies ExportedHandler<WorkerEnv>
