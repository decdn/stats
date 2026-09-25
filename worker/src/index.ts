// .open-next/ exists only after `opennextjs-cloudflare build`, so this import
// errors before a build and resolves after — @ts-expect-error can't cover both.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import handler from "../../.open-next/worker.js"

import type { Env } from "./env"
import { runIndex } from "./run"

// The Worker entry (wrangler.jsonc `main`): OpenNext's handler serves the page,
// the cron indexes the chain into the STATS bucket the page reads.
export default {
  fetch: handler.fetch,

  // Awaited (not waitUntil) so a failed run marks the cron invocation as
  // failed — that's what the dashboard's cron health and alerting key on.
  async scheduled(_event, env) {
    await runIndex(env)
  },
} satisfies ExportedHandler<Env>
