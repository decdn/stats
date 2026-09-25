import { getPlatformProxy } from "wrangler"

import type { Env } from "./env"
import { runIndex } from "./run"

// `pnpm index`: one cron tick outside workerd, since `wrangler dev` can't run
// the Worker before an OpenNext build. The bindings and vars come from
// wrangler.jsonc plus `.env`, and the emulated bucket persists in
// `.wrangler/state` — the same one `next dev` reads (next.config.ts).
const { env, dispose } = await getPlatformProxy<Env>()
try {
  await runIndex(env)
} finally {
  await dispose()
}
