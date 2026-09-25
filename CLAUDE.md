# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Commands

Package manager is **pnpm** (see `pnpm-workspace.yaml`, `pnpm-lock.yaml`).

```bash
pnpm dev        # next dev
pnpm build      # next build
pnpm start      # next start (after build)
pnpm lint       # eslint (flat config, next core-web-vitals + typescript)
pnpm typecheck  # tsc --noEmit
pnpm format     # prettier --write "**/*.{ts,tsx}"
```

There is no test framework in this project — no test runner, config, or test files. Verify changes with `pnpm typecheck && pnpm lint` (plus `pnpm --filter @decdn/stats-worker typecheck` for the worker) and by looking at the running dev server. Local end-to-end for the indexer: `pnpm worker:dev`, `curl "http://localhost:8787/__scheduled?cron=*/10+*+*+*+*"`, then `pnpm dev` with `STATS_BASE_URL=http://localhost:8787` and `CHAIN_ID` in `.env` (see README).

Add shadcn/ui components with `npx shadcn@latest add <name>`; they land in `components/ui/`.

## Architecture

Single-page Next.js App Router status dashboard ("network status") that presents on-chain metrics for a CDN-style network on Arbitrum Sepolia. There are no API routes. Every section reads real data from the worker's stats file.

- **`worker/` — the indexer.** A separate pnpm workspace package (Cloudflare Worker, viem, wrangler) with its own `tsconfig.json`; the root `tsconfig`/eslint exclude it. On a cron it reads `stats-<CHAIN_ID>.json` (one file per chain, `statsKey` in `worker/src/store.ts`) from an R2 binding, indexes from `lastBlock + 1` in capped chunks, one `eth_getLogs` per chunk across three contracts (`worker/src/indexer.ts`): `FeeRouter.Settled` into totals plus daily and hourly buckets; `CapacityBond` `NodeRegistered`/`NodeDeregistered`/`NodeAutoEjected`/`RegionUpdated` into the registered set (`nodes`, keyed by nodeId, with operator and declared region) and each hourly bucket's `registeredNodes`; `PaymentPool` `PoolOpened`/`PoolRedeemed` into pool owners and per-region `bytesPulled`. `regions` holds all-time `bytesServed`/`bytesPulled` by the operator's region at event time; cache hit is `1 − pulled/served`, where pulled is what a node paid peers from its own pools (origin fetches are free and invisible). Then it writes the file back (`worker/src/run.ts`). `worker/src/stats.ts` is pure (types + fold functions, no I/O) and is the shared schema — `lib/stats.ts` and `lib/regions.ts` import it. Bigints are decimal strings in base units. The file also records `chainId`/`feeRouter`/`capacityBond`/`paymentPool`/`startBlock`; `resumeStats` only extends a file that parses, has the expected shape and matches the worker's config, otherwise the worker overwrites it and re-indexes from scratch. So a contract redeploy only needs `FEE_ROUTER`, `CAPACITY_BOND`, `PAYMENT_POOL` and `START_BLOCK` (wrangler.jsonc `vars`; `START_BLOCK` mirrored in `.env` for local runs) updated, and a schema change needs no migration code. Note `.env` may carry R2 S3 credentials, which point `pnpm worker:dev` at the **real** bucket — blank the `R2_*` vars to use the local emulation. `GET /stats-<CHAIN_ID>.json` on the worker serves the bucket for local dev.
- **`lib/stats.ts` — `getStats()`.** Wrapped in React `cache()`; fetches `${STATS_BASE_URL}/stats-${CHAIN_ID}.json` with `next: { revalidate: 60 }` and returns a discriminated result: `ok` with the stats, `unconfigured` (either env var unset), or `unindexed` (worker 404, pre-first-tick). It throws on any other non-OK response, so a live deployment keeps serving the last good page. There is deliberately no mock fallback — every live section renders labeled empty states instead, including while `stats.caughtUp` is false (partial totals mid-backfill). `lib/metrics.ts` turns `Stats` into status-only views (`MetricView`: `ok` with a `Metric` — headline, rolling-24h delta, hourly points — plus `staleSince` when the worker stopped writing, or `unconfigured`/`unindexed`/`catching-up`); `lib/regions.ts` does the same for the by-region table (`RegionsView`). Each block maps statuses to its own labels. Formatting for display (`formatUsdc`, `truncateHex`, `formatUtcTime`) lives in `lib/utils.ts`.

The layering that matters:

- **Copy lives in blocks.** `lib/metrics.ts` and `lib/regions.ts` return figures and statuses only; headlines, labels, captions, micro-labels, and prose are hardcoded in the block that renders them, so changing what the page *says* means editing that block.
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
- Commits follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`).
