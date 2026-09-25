# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Commands

Package manager is **pnpm** (see `pnpm-workspace.yaml`, `pnpm-lock.yaml`). Node ≥ 22.22.1 (`engines`; lint-staged 17 and commitlint 21 need it).

```bash
pnpm dev        # next dev
pnpm build      # cf-typegen, then opennextjs-cloudflare build (runs next build itself, see open-next.config.ts)
pnpm start      # next start (after build)
pnpm lint       # eslint (flat config, next core-web-vitals + typescript)
pnpm typecheck  # wrangler types (cf-typegen → cloudflare-env.d.ts), then tsc --noEmit — the file is gitignored, so build and typecheck both generate it first
pnpm format     # prettier --write "**/*.{ts,tsx,js,jsx,mjs,cjs,json,jsonc,css,md,yaml,yml}"
pnpm cf-typegen   # wrangler types → cloudflare-env.d.ts (gitignored)
pnpm index        # one indexer tick (worker/src/tick.ts) into the local, or .env-configured, bucket
pnpm app:preview  # opennextjs-cloudflare build + preview (the Worker on workerd)
pnpm app:deploy   # opennextjs-cloudflare build + deploy
```

There is no test framework in this project — no test runner, config, or test files. Verify changes with `pnpm typecheck && pnpm lint` (both cover `worker/`) and by looking at the running dev server. Local end-to-end for the indexer: `RPC_URL` in `.env`, `pnpm index` (repeat until caught up), then `pnpm dev` — both get the Worker's bindings and vars from `wrangler.jsonc` + `.env` via wrangler's `getPlatformProxy` (`next.config.ts` calls `initOpenNextCloudflareForDev`) and share the emulated bucket in `.wrangler/state` (see README).

Git hooks (husky, installed by `pnpm install` via `prepare`): `pre-commit` runs lint-staged — `eslint --fix` + `prettier --write` on staged JS/TS, `prettier --write` on staged json/jsonc/md/css/yaml/yml; `commit-msg` runs commitlint (`@commitlint/config-conventional`). Both are local only: `git commit --no-verify` or `HUSKY=0` skips them, and CI doesn't re-check. Typecheck is deliberately not in the hook: it checks the whole project, and `pretypecheck` first rewrites the gitignored `cloudflare-env.d.ts` with `wrangler types`.

Cloudflare: the repo is one Worker, `stats`, configured by the root `wrangler.jsonc`. Its `main` is `worker/src/index.ts`, which wraps the `fetch` handler `@opennextjs/cloudflare` generates in `.open-next/worker.js` (hence the `@ts-ignore` on that import: the file exists only after a build) and adds the cron's `scheduled` handler. `open-next.config.ts` puts the ISR cache in the `decdn-stats-cache` R2 bucket, with an in-memory queue because `wrangler versions upload` rejects Durable Object migrations. It deploys with the Workers Builds defaults (`pnpm run build`, `npx wrangler deploy`); `RPC_URL` is a Worker secret. Non-production branches deploy with `npx wrangler preview`, which inherits no vars or bindings: `wrangler.jsonc` `previews` redeclares only what the page reads (`CHAIN_ID`, the two production buckets), so a Preview runs no cron and never revalidates ISR. See README "Deploying to Cloudflare".

Add shadcn/ui components with `npx shadcn@latest add <name>`; they land in `components/ui/`.

## Architecture

Single-page Next.js App Router status dashboard ("network status") that presents on-chain metrics for a CDN-style network on Arbitrum Sepolia. There are no API routes. Every section reads real data from the indexer's stats file.

- **`worker/` — the Worker entry and the indexer.** Part of the root package (same `tsconfig`, eslint and deps); the Workers runtime types come from the generated, gitignored `cloudflare-env.d.ts`. On a cron it reads `stats-<CHAIN_ID>.json` (one file per chain, `statsKey` in `worker/src/store.ts`) from an R2 binding, indexes from `lastBlock + 1` in capped chunks, one `eth_getLogs` per chunk across three contracts (`worker/src/indexer.ts`): `FeeRouter.Settled` into totals plus daily and hourly buckets; `CapacityBond` `NodeRegistered`/`NodeDeregistered`/`NodeAutoEjected`/`RegionUpdated` into the registered set (`nodes`, keyed by nodeId, with operator and declared region) and each hourly bucket's `registeredNodes`; `PaymentPool` `PoolOpened`/`PoolRedeemed` into pool owners and per-region `bytesPulled`. `regions` holds all-time `bytesServed`/`bytesPulled` by the operator's region at event time; cache hit is `1 − pulled/served`, where pulled is what a node paid peers from its own pools (origin fetches are free and invisible). Then it writes the file back (`worker/src/run.ts`). `worker/src/stats.ts` is pure (types + fold functions, no I/O) and is the shared schema — `lib/stats.ts` and `lib/regions.ts` import it. Bigints are decimal strings in base units. The file also records `chainId`/`feeRouter`/`capacityBond`/`paymentPool`/`startBlock`; `resumeStats` only extends a file that parses, has the expected shape and matches the worker's config, otherwise the worker overwrites it and re-indexes from scratch. So a contract redeploy only needs `FEE_ROUTER`, `CAPACITY_BOND`, `PAYMENT_POOL` and `START_BLOCK` (root `wrangler.jsonc` `vars`) updated, and a schema change needs no migration code. `statsStore` (`StoreEnv`) resolves the bucket for both the indexer and the page: the `STATS` binding, or R2's S3 API when `R2_ACCESS_KEY_ID` is set. Note `.env` may carry those R2 S3 credentials, which point `pnpm index` and `pnpm dev` at the **real** bucket — blank the `R2_*` vars to use the local emulation.
- **`lib/stats.ts` — `getStats()`.** Wrapped in React `cache()`; gets the Worker env from `getCloudflareContext({ async: true })` and reads `stats-${CHAIN_ID}.json` through `statsStore` (no fetch, so `revalidate = 60` in `app/page.tsx` is the ISR signal). Returns a discriminated result: `ok` with the stats, `unconfigured` (`CHAIN_ID` unset), or `unindexed` (no file yet — pre-first-tick — or an old-schema file). It throws on a failed read, so a live deployment keeps serving the last good page. There is deliberately no mock fallback — every live section renders labeled empty states instead, including while `stats.caughtUp` is false (partial totals mid-backfill). `lib/metrics.ts` turns `Stats` into status-only views (`MetricView`: `ok` with a `Metric` — headline, rolling-24h delta, hourly points — plus `staleSince` when the worker stopped writing, or `unconfigured`/`unindexed`/`catching-up`); `lib/regions.ts` does the same for the by-region table (`RegionsView`). Each block maps statuses to its own labels. Formatting for display (`formatUsdc`, `truncateHex`, `formatUtcTime`) lives in `lib/utils.ts`.

The layering that matters:

- **Copy lives in blocks.** `lib/metrics.ts` and `lib/regions.ts` return figures and statuses only; headlines, labels, captions, micro-labels, and prose are hardcoded in the block that renders them, so changing what the page _says_ means editing that block.
- **`blocks/` — page sections.** One entry file per section (`hero`, `metric-*`, `by-region`, `settlements-table`), each a zero-prop exported component that owns its own copy and awaits `getStats()` as an async server component (`by-region` via `loadRegions`; `hero`, whose meta line shows index freshness — the headline deliberately ignores it, since a stale index means a lagging worker or RPC, not a down network; `metric-*` via `loadMetric`; `settlements-table`). The three metric cards are deliberately separate files rather than one parameterized component: each server block `metric-*.tsx` is paired with its own `"use client"` `charts/metric-*-chart.tsx` that owns its `ChartConfig`, gradient `id`, and Y-domain math.
- **`globals/<Name>/` — chrome reused across sections** (`Header`, `Footer`, `SectionDivider`). `SiteHeader` is a static wordmark; `SiteFooter` is an async server component that links the indexed `feeRouter`/`capacityBond` from `getStats()`.
- **`app/page.tsx` — the only composition point.** It assembles blocks and owns all page-level layout (`max-w-6xl` container, the metrics grid). Blocks do not lay themselves out relative to each other.
- **`components/ui/` — unmodified shadcn/ui primitives.** `app/layout.tsx` wraps everything in `ThemeProvider` (next-themes, class attribute) and `TooltipProvider`.

### Conventions in this codebase

- Charts are recharts inside shadcn's `ChartContainer`; series colors come from `ChartConfig` and are read in JSX as `var(--color-<dataKey>)`.
- Within `blocks/`, only the `charts/metric-*-chart.tsx` files are client components (`"use client"`), because of recharts; they take `series` from their server block. The metric card blocks themselves are async server components.
- Design tokens are CSS variables defined in `app/globals.css` (`:root` / `.dark`) and mapped into Tailwind v4 via `@theme inline`. There is no `tailwind.config`. `--accent-green` is the project's one non-neutral accent; use tokens (`text-muted-foreground`, `bg-accent-green`) rather than raw colors.
- Visual voice: lowercase copy, `font-mono` uppercase micro-labels with wide tracking for metadata, `tabular-nums` for figures.
- `lib/utils.ts` re-exports `cn` from the `cn` package and holds the display formatters (`scaleBytes`/`formatBytes` pick a base-1000 unit for a raw byte count; `formatUsdc`/`formatUsdcCents` do bigint-safe 6-decimal USDC). Import paths use the `@/*` alias rooted at the project directory.
- Prettier: no semicolons, double quotes, 2-space indent, 80 columns, with `prettier-plugin-tailwindcss` sorting classes.
- Commits follow Conventional Commits, checked by the `commit-msg` hook (`@commitlint/config-conventional`): a type from `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `perf`, `test`, `build`, `ci`, `revert`; a subject not in sentence, start, pascal or upper case; header and body lines of at most 100 characters. The hook is local, so a squash merge's title (the PR title) is never checked.
