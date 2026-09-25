import { getPlatformProxy } from "wrangler"

import type { Env } from "./env"
import { runIndex } from "./run"

// `pnpm index`: one cron tick outside workerd, without `wrangler dev` (which
// needs out/ from `pnpm build`). The bindings and vars come from
// wrangler.jsonc plus `.env`, and the emulated bucket persists in
// `.wrangler/state` (`wrangler r2 object get --local` reads it).
const { env, dispose } = await getPlatformProxy<Env>()
try {
  await runIndex(env)
} finally {
  await dispose()
}
