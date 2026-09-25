# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Commands

Package manager is **pnpm** (see `pnpm-workspace.yaml`, `pnpm-lock.yaml`). Node ≥ 22.22.1 (`engines`; lint-staged 17 and commitlint 21 need it).

```bash
pnpm dev        # next dev (the page fetches the live public stats file)
pnpm build      # cf-typegen, then next build → static export in out/
pnpm lint       # eslint (flat config, next core-web-vitals + typescript)
pnpm typecheck  # wrangler types (cf-typegen → cloudflare-env.d.ts), then tsc --noEmit — the file is gitignored, so build and typecheck both generate it first
pnpm format     # prettier --write "**/*.{ts,tsx,js,jsx,mjs,cjs,json,jsonc,css,md,yaml,yml}"
pnpm cf-typegen   # wrangler types → cloudflare-env.d.ts (gitignored)
pnpm index        # one indexer tick (worker/src/tick.ts) into the local, or .env-configured, bucket
pnpm app:preview  # build + wrangler dev --test-scheduled (assets on workerd; cron fires on /__scheduled)
pnpm app:deploy   # build + wrangler deploy
```

There is no test framework in this project — no test runner, config, or test files. Verify changes with `pnpm typecheck && pnpm lint` (both cover `worker/`) and by looking at the running dev server. The page and the indexer are decoupled locally: `pnpm dev` fetches the production file from `https://data.decdn.org` (or `NEXT_PUBLIC_STATS_URL`, which must send CORS headers), while `pnpm index` (`RPC_URL` in `.env`, repeat until caught up) gets the Worker's bindings and vars from `wrangler.jsonc` + `.env` via wrangler's `getPlatformProxy` and writes the emulated bucket in `.wrangler/state` — read it with `npx wrangler r2 object get decdn-stats/stats-421614.json --local --pipe` (see README).

Git hooks (husky, installed by `pnpm install` via `prepare`): `pre-commit` runs lint-staged — `eslint --fix` + `prettier --write` on staged JS/TS, `prettier --write` on staged json/jsonc/md/css/yaml/yml; `commit-msg` runs commitlint (`@commitlint/config-conventional`). Both are local only: `git commit --no-verify` or `HUSKY=0` skips them, and CI doesn't re-check. Typecheck is deliberately not in the hook: it checks the whole project, and `pretypecheck` first rewrites the gitignored `cloudflare-env.d.ts` with `wrangler types`.

Cloudflare: the repo is one Worker, `stats`, configured by the root `wrangler.jsonc`. The page is a Next static export (`output: "export"` in `next.config.ts`) served from `out/` as Worker assets (`not_found_handling: "404-page"`); there is no server rendering, ISR or OpenNext. Its `main` is `worker/src/index.ts`: the cron's `scheduled` handler, plus a `fetch` that passes asset misses to the `ASSETS` binding. The `STATS` bucket is public at `https://data.decdn.org` and needs the CORS policy in `r2-cors.json` (`npx wrangler r2 bucket cors set decdn-stats --file r2-cors.json`) for the browser to read it. It deploys with the Workers Builds defaults (`pnpm run build`, `npx wrangler deploy`); `RPC_URL` is a Worker secret. Non-production branches deploy with `npx wrangler preview`, which inherits no vars or bindings except the assets and their `ASSETS` binding, and runs no cron; the page needs nothing else, so `wrangler.jsonc` `previews` is empty (the command requires the block). See README "Deploying to Cloudflare".

Add shadcn/ui components with `npx shadcn@latest add <name>`; they land in `components/ui/`.

## Architecture

Single-page Next.js App Router status dashboard ("network status") that presents on-chain metrics for a CDN-style network on Arbitrum Sepolia. There are no API routes and no server: every section reads real data from the indexer's stats file, fetched in the browser.

- **`worker/` — the Worker entry and the indexer.** Part of the root package (same `tsconfig`, eslint and deps); the Workers runtime types come from the generated, gitignored `cloudflare-env.d.ts`. On a cron it reads `stats-<CHAIN_ID>.json` (one file per chain, `statsKey` in `worker/src/store.ts`) from an R2 binding, indexes from `lastBlock + 1` in capped chunks, one `eth_getLogs` per chunk across three contracts (`worker/src/indexer.ts`): `FeeRouter.Settled` into totals plus daily and hourly buckets; `CapacityBond` `NodeRegistered`/`NodeDeregistered`/`NodeAutoEjected`/`RegionUpdated` into the registered set (`nodes`, keyed by nodeId, with operator and declared region) and each hourly bucket's `registeredNodes`; `PaymentPool` `PoolOpened`/`PoolRedeemed` into pool owners and per-region `bytesPulled`. `regions` holds all-time `bytesServed`/`bytesPulled` by the operator's region at event time; cache hit is `1 − pulled/served`, where pulled is what a node paid peers from its own pools (origin fetches are free and invisible). Then it writes the file back (`worker/src/run.ts`). `worker/src/stats.ts` is pure (types + fold functions, no I/O) and is the shared schema — `lib/stats.tsx` (`asStats`) and `lib/regions.ts` import it. Bigints are decimal strings in base units. The file also records `chainId`/`feeRouter`/`capacityBond`/`paymentPool`/`startBlock`; `resumeStats` only extends a file that parses, has the expected shape and matches the worker's config, otherwise the worker overwrites it and re-indexes from scratch. So a contract redeploy only needs `FEE_ROUTER`, `CAPACITY_BOND`, `PAYMENT_POOL` and `START_BLOCK` (root `wrangler.jsonc` `vars`) updated, and a schema change needs no migration code. `statsStore` (`StoreEnv`) resolves the bucket for the indexer only: the `STATS` binding, or R2's S3 API when `R2_ACCESS_KEY_ID` is set. Note `.env` may carry those R2 S3 credentials, which point `pnpm index` at the **real** bucket — blank the `R2_*` vars to use the local emulation.
- **`lib/stats.tsx` — `StatsProvider` + `useStats()`** (`"use client"`). The provider (wrapped around the page in `app/page.tsx`) fetches `https://data.decdn.org/stats-421614.json` (its `chainId` constant must match `CHAIN_ID` in `wrangler.jsonc`; `NEXT_PUBLIC_STATS_URL` overrides the URL at build time) on mount, every 60s while the tab is visible (the file's `max-age`), and when the tab becomes visible; a new fetch aborts one still in flight, and each times out after 15s. `useStats()` (which throws outside the provider) returns a discriminated result: `loading` (also what the static HTML renders), `ok` with the stats and `checkedAt` (the last fetch attempt, which staleness is judged against), `unindexed` (a 404 — pre-first-tick, and only if the 404 carries CORS headers — or an old-schema file), or `error` (the first fetch failed: network, CORS, timeout, non-404 status, a non-JSON body, wrong chain). Once stats have shown, only newer stats replace them: a failed refresh or an unindexed file keeps them on screen and just advances `checkedAt`, so `staleSince` still flags them once they're old. `worker/src/stats.ts` `asStats` validates the parsed JSON; its `parseStats` wraps it for the worker. There is deliberately no mock fallback — every live section renders labeled empty states instead, including while `stats.caughtUp` is false (partial totals mid-backfill). `lib/metrics.ts` turns `Stats` into status-only views (`MetricView`: `ok` with a `Metric` — headline, rolling-24h delta, hourly points — plus `staleSince` when the worker stopped writing, or `loading`/`unindexed`/`error`/`catching-up`) via the pure `metricView(result, build)`; `lib/regions.ts` does the same for the by-region table (`RegionsView`, `regionsView(result)`). Each block maps statuses to its own labels in an `emptyLabel` switch with an explicit return type and no `default`, so a new status fails to compile there rather than borrowing another's label. Formatting for display (`formatUsdc`, `truncateHex`, `formatUtcTime`) lives in `lib/utils.ts`.

The layering that matters:

- **Copy lives in blocks.** `lib/metrics.ts` and `lib/regions.ts` return figures and statuses only; headlines, labels, captions, micro-labels, and prose are hardcoded in the block that renders them, so changing what the page _says_ means editing that block.
- **`blocks/` — page sections.** One entry file per section (`hero`, `metric-*`, `by-region`, `settlements-table`), each a zero-prop exported `"use client"` component that owns its own copy and reads `useStats()` (`by-region` via `regionsView`; `hero`, whose meta line shows index freshness — the headline deliberately ignores it, since a stale index means a lagging worker or RPC, not a down network; `metric-*` via `metricView`; `settlements-table`). The three metric cards are deliberately separate files rather than one parameterized component: each block `metric-*.tsx` is paired with its own `charts/metric-*-chart.tsx` that owns its `ChartConfig`, gradient `id`, and Y-domain math.
- **`globals/<Name>/` — chrome reused across sections** (`Header`, `Footer`, `SectionDivider`). `SiteHeader` is a static wordmark; `SiteFooter` is a client component that links the indexed `feeRouter`/`capacityBond` from `useStats()`.
- **`app/page.tsx` — the only composition point.** It assembles blocks and owns all page-level layout (`max-w-6xl` container, the metrics grid). Blocks do not lay themselves out relative to each other.
- **`components/ui/` — unmodified shadcn/ui primitives.** `app/layout.tsx` wraps everything in `ThemeProvider` (next-themes, class attribute) and `TooltipProvider`.

### Conventions in this codebase

- Charts are recharts inside shadcn's `ChartContainer`; series colors come from `ChartConfig` and are read in JSX as `var(--color-<dataKey>)`.
- Everything that reads stats is a client component (`"use client"`, `useStats()`), since the page is static; `app/page.tsx`, `app/layout.tsx`, `SiteHeader` and `SectionDivider` stay server components, rendered at build time. The `charts/metric-*-chart.tsx` files take `series` from their block.
- Design tokens are CSS variables defined in `app/globals.css` (`:root` / `.dark`) and mapped into Tailwind v4 via `@theme inline`. There is no `tailwind.config`. `--accent-green` is the project's one non-neutral accent; use tokens (`text-muted-foreground`, `bg-accent-green`) rather than raw colors.
- Visual voice: lowercase copy, `font-mono` uppercase micro-labels with wide tracking for metadata, `tabular-nums` for figures.
- `lib/utils.ts` re-exports `cn` from the `cn` package and holds the display formatters (`scaleBytes`/`formatBytes` pick a base-1000 unit for a raw byte count; `formatUsdc`/`formatUsdcCents` do bigint-safe 6-decimal USDC). Import paths use the `@/*` alias rooted at the project directory.
- Prettier: no semicolons, double quotes, 2-space indent, 80 columns, with `prettier-plugin-tailwindcss` sorting classes.
- Commits follow Conventional Commits, checked by the `commit-msg` hook (`@commitlint/config-conventional`): a type from `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `perf`, `test`, `build`, `ci`, `revert`; a subject not in sentence, start, pascal or upper case; header and body lines of at most 100 characters. The hook is local, so a squash merge's title (the PR title) is never checked.
