# decdn stats

A single-page status dashboard for the DeCDN network — value settled, bytes served, registered nodes and a per-region breakdown, presented as raw on-chain state read from Arbitrum Sepolia.

Built with Next.js (App Router), React 19, Tailwind CSS v4, shadcn/ui, and recharts.

> Every section is live: a Cloudflare Worker in [`worker/`](worker/) indexes `FeeRouter`, `CapacityBond` and `PaymentPool` logs on a cron and writes `stats-<CHAIN_ID>.json` to R2, which the page reads at build/revalidate time.

## Getting started

Package manager is **pnpm**.

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000. Without a `.env` the metric cards and settlements table render their empty state ("live data not configured").

### Live on-chain data (local)

```bash
cp .env.example .env   # fill RPC_URL and START_BLOCK
pnpm worker:dev        # wrangler dev with a locally emulated R2 bucket, on :8787
```

Trigger the cron by hand and check the result:

```bash
curl "http://localhost:8787/__scheduled?cron=*/10+*+*+*+*"
curl http://localhost:8787/stats-421614.json
```

Each tick indexes at most `LOG_CHUNK_BLOCKS × MAX_CHUNKS_PER_RUN` blocks (see [`worker/wrangler.jsonc`](worker/wrangler.jsonc)) past `lastBlock`, so the first backfill takes a few ticks; pass `--var LOG_CHUNK_BLOCKS:1000000` to `wrangler dev` if your RPC allows wide `eth_getLogs` ranges. With `STATS_BASE_URL=http://localhost:8787` and `CHAIN_ID=421614` in `.env`, `pnpm dev` renders the indexed data. Until the worker has caught up with the chain the metric cards read "catching up · block N" and the table footer "re-indexing". The registered-node count and its history are folded from `CapacityBond` registration events, so the sparkline and 24h change are complete as soon as the worker catches up.

Deploy with `pnpm worker:deploy` after `wrangler login`, `wrangler r2 bucket create decdn-stats`, and `wrangler secret put RPC_URL`.

When the contracts are redeployed, update `FEE_ROUTER`, `CAPACITY_BOND`, `PAYMENT_POOL` and `START_BLOCK` in [`worker/wrangler.jsonc`](worker/wrangler.jsonc) (and `START_BLOCK` in `.env`). The addresses come from `decdn/contracts/deployments/421614.json`, but that file's `deployBlock` is an **L1** number — `START_BLOCK` must be the L2 block: take the earliest creation block of the three contracts from arbiscan, or the first L2 block whose `l1BlockNumber` ≥ `deployBlock`. The stats file records the deployment it was built from (chain, the three addresses, `START_BLOCK`), so the next tick notices the change and re-indexes from scratch over it. A stats file the worker can't read (bad JSON, or a shape from an older worker) is overwritten the same way. The rebuild takes several ticks, during which the cards show "catching up".

## Scripts

| Command          | What it does                    |
| ---------------- | ------------------------------- |
| `pnpm dev`       | Start the dev server            |
| `pnpm build`     | Production build                |
| `pnpm start`     | Serve the production build      |
| `pnpm lint`      | ESLint (next core-web-vitals)   |
| `pnpm typecheck` | `tsc --noEmit`                  |
| `pnpm format`    | Prettier over `**/*.{ts,tsx}`   |
| `pnpm worker:dev`    | Run the indexer worker locally (`wrangler dev --test-scheduled`) |
| `pnpm worker:deploy` | Deploy the worker to Cloudflare |

There is no test framework in this project. Verify changes with `pnpm typecheck && pnpm lint` and by looking at the running dev server.

## Project layout

```
app/            layout, globals.css, and page.tsx — the only composition point
blocks/         page sections (hero, metric-*, by-region, settlements); charts/ holds the metric cards' client charts
globals/        chrome reused across sections (Header, Footer, SectionDivider)
components/ui/  unmodified shadcn/ui primitives
lib/stats.ts    getStats() — reads the worker's stats-<CHAIN_ID>.json
lib/metrics.ts  stats file → metric card view models (headline, 24h change, hourly series)
lib/regions.ts  stats file → by-region rows (nodes, bytes, cache hit)
```

Two rules explain most of the structure:

- **Figures and copy are separated.** `lib/metrics.ts` and `lib/regions.ts` hold only values and statuses (`Metric`, `MetricView`, `RegionRow`, `RegionsView`); even empty-state labels live in the blocks. Headlines, labels, and prose are hardcoded in the block that renders them — so changing what the page *says* means editing that block, not the data file.
- **Blocks take no props and own no layout.** Each section's entry component takes no props and loads its own figures; only the `charts/metric-*-chart.tsx` client halves receive `series` from their server block. `app/page.tsx` assembles them and owns all page-level layout (the `max-w-6xl` container, the metrics grid).

The three metric cards are deliberately separate files rather than one parameterized component: each owns its own `ChartConfig`, gradient `id`, and Y-domain math. Each is an async server component (`metric-*.tsx`, awaits `getStats()`) paired with a `"use client"` chart (`charts/metric-*-chart.tsx`) because of recharts; the rest are server components.

## Conventions

- Charts are recharts inside shadcn's `ChartContainer`; series colors come from `ChartConfig` and are read in JSX as `var(--color-<dataKey>)`.
- Design tokens are CSS variables in `app/globals.css` (`:root` / `.dark`), mapped into Tailwind v4 via `@theme inline`. There is no `tailwind.config`. `--accent-green` is the one non-neutral accent — use tokens (`text-muted-foreground`, `bg-accent-green`) rather than raw colors.
- Visual voice: lowercase copy, `font-mono` uppercase micro-labels with wide tracking for metadata, `tabular-nums` for figures.
- Import paths use the `@/*` alias rooted at the project directory.
- Prettier: no semicolons, double quotes, 2-space indent, 80 columns, with `prettier-plugin-tailwindcss` sorting classes.
- Commits follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`).

## Adding UI components

```bash
npx shadcn@latest add button
```

Components land in `components/ui/` and are imported as `@/components/ui/button`.
