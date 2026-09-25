# decdn stats

A single-page status dashboard for the DeCDN network — value settled, bytes served, registered nodes and a per-region breakdown, presented as raw on-chain state read from Arbitrum Sepolia.

[![Live](https://img.shields.io/badge/live-stats.decdn.org-22C55E)](https://stats.decdn.org)
![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Tailwind CSS v4](https://img.shields.io/badge/Tailwind%20CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)
![TypeScript 5](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare%20Workers-deployed-F38020?logo=cloudflareworkers&logoColor=white)
![Arbitrum Sepolia](https://img.shields.io/badge/chain-Arbitrum%20Sepolia-28A0F0?logo=arbitrum&logoColor=white)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-FE5196?logo=conventionalcommits&logoColor=white)](https://www.conventionalcommits.org)
![Code style: Prettier](https://img.shields.io/badge/code%20style-Prettier-F7B93E?logo=prettier&logoColor=black)

Built with Next.js (App Router), React 19, Tailwind CSS v4, shadcn/ui, and recharts.

> Every section is live: the Worker's cron (code in [`worker/`](worker/)) indexes `FeeRouter`, `CapacityBond` and `PaymentPool` logs and writes `stats-<CHAIN_ID>.json` to R2, which the page reads from the same bucket at build/revalidate time.

## Getting started

Package manager is **pnpm**.

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000. Without a `.env` the metric cards and settlements table render their empty state ("live data not configured").

### Live on-chain data (local)

```bash
cp .env.example .env   # fill RPC_URL
pnpm index             # one cron tick into a locally emulated R2 bucket
pnpm dev               # reads the same bucket
```

Each tick indexes at most `LOG_CHUNK_BLOCKS × MAX_CHUNKS_PER_RUN` blocks (see [`wrangler.jsonc`](wrangler.jsonc)) past `lastBlock`, so the first backfill takes a few runs of `pnpm index`; set `LOG_CHUNK_BLOCKS=1000000` in `.env` if your RPC allows wide `eth_getLogs` ranges. Both commands take their bindings and vars from `wrangler.jsonc` plus `.env`, and share the emulated bucket in `.wrangler/state`. Until the index has caught up with the chain the metric cards read "catching up · block N" and the table footer "re-indexing". The registered-node count and its history are folded from `CapacityBond` registration events, so the sparkline and 24h change are complete as soon as the index catches up.

## Deploying to Cloudflare

The repo is one Worker, `stats`, configured in [`wrangler.jsonc`](wrangler.jsonc). Its entry, [`worker/src/index.ts`](worker/src/index.ts), wraps the `fetch` handler that [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) generates into `.open-next/worker.js` and adds the `scheduled` handler: every 10 minutes the cron indexes the chain into the `decdn-stats` R2 bucket (binding `STATS`), which the page reads directly.

On Workers Builds it's one project with the repo root as root directory and the defaults: build command `pnpm run build`, deploy command `npx wrangler deploy`, non-production branch deploy command `npx wrangler versions upload`. The Worker name in the dashboard must match `name` in `wrangler.jsonc`, or the build fails. `pnpm build` is the OpenNext build (it runs `next build` itself, via `buildCommand` in [`open-next.config.ts`](open-next.config.ts)). Keep the Worker free of Durable Object migrations: `wrangler versions upload` refuses to apply them — hence the in-memory revalidation queue.

Before the first deploy: `wrangler r2 bucket create decdn-stats` and `wrangler secret put RPC_URL`. The ISR cache (the page's 60s revalidate) lives in the `decdn-stats-cache` R2 bucket, which `wrangler deploy` creates if it's missing. Locally, `pnpm app:preview` runs the built Worker in workerd — after `pnpm build`, `npx wrangler dev --test-scheduled` does the same and fires the cron on `curl "http://localhost:8787/__scheduled?cron=*/10+*+*+*+*"` — and `pnpm app:deploy` deploys it (also pre-filling the R2 cache, which `wrangler deploy` leaves to the first request).

When the contracts are redeployed, update `FEE_ROUTER`, `CAPACITY_BOND`, `PAYMENT_POOL` and `START_BLOCK` in [`wrangler.jsonc`](wrangler.jsonc). The addresses come from `decdn/contracts/deployments/421614.json`, but that file's `deployBlock` is an **L1** number — `START_BLOCK` must be the L2 block: take the earliest creation block of the three contracts from arbiscan, or the first L2 block whose `l1BlockNumber` ≥ `deployBlock`. The stats file records the deployment it was built from (chain, the three addresses, `START_BLOCK`), so the next tick notices the change and re-indexes from scratch over it. A stats file the indexer can't read (bad JSON, or a shape from an older version) is overwritten the same way. The rebuild takes several ticks, during which the cards show "catching up".

## Scripts

| Command            | What it does                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| `pnpm dev`         | Start the dev server                                                                                    |
| `pnpm build`       | Production build (OpenNext, for Cloudflare)                                                             |
| `pnpm start`       | Serve the production build                                                                              |
| `pnpm lint`        | ESLint (next core-web-vitals)                                                                           |
| `pnpm typecheck`   | `tsc --noEmit`                                                                                          |
| `pnpm format`      | Prettier over ts/tsx/js/json/css/md/yaml                                                                |
| `pnpm index`       | Run one indexer tick into the local (or `.env`-configured) bucket                                       |
| `pnpm cf-typegen`  | Generate `cloudflare-env.d.ts` from `wrangler.jsonc` (gitignored; `build` and `typecheck` run it first) |
| `pnpm app:preview` | Build with OpenNext and run the Worker in workerd                                                       |
| `pnpm app:deploy`  | Build and deploy the Worker to Cloudflare                                                               |

There is no test framework in this project. Verify changes with `pnpm typecheck && pnpm lint` and by looking at the running dev server.

`pnpm install` also installs husky git hooks: `pre-commit` runs lint-staged (ESLint + Prettier on staged files) and `commit-msg` checks the message against Conventional Commits with commitlint.

## Project layout

```
app/            layout, globals.css, and page.tsx — the only composition point
blocks/         page sections (hero, metric-*, by-region, settlements); charts/ holds the metric cards' client charts
globals/        chrome reused across sections (Header, Footer, SectionDivider)
components/ui/  unmodified shadcn/ui primitives
lib/stats.ts    getStats() — reads stats-<CHAIN_ID>.json from the STATS bucket
worker/src/     the Worker entry and the indexer (cron → R2)
lib/metrics.ts  stats file → metric card view models (headline, 24h change, hourly series)
lib/regions.ts  stats file → by-region rows (nodes, bytes, cache hit)
```

Two rules explain most of the structure:

- **Figures and copy are separated.** `lib/metrics.ts` and `lib/regions.ts` hold only values and statuses (`Metric`, `MetricView`, `RegionRow`, `RegionsView`); even empty-state labels live in the blocks. Headlines, labels, and prose are hardcoded in the block that renders them — so changing what the page _says_ means editing that block, not the data file.
- **Blocks take no props and own no layout.** Each section's entry component takes no props and loads its own figures; only the `charts/metric-*-chart.tsx` client halves receive `series` from their server block. `app/page.tsx` assembles them and owns all page-level layout (the `max-w-6xl` container, the metrics grid).

The three metric cards are deliberately separate files rather than one parameterized component: each owns its own `ChartConfig`, gradient `id`, and Y-domain math. Each is an async server component (`metric-*.tsx`, awaits `getStats()`) paired with a `"use client"` chart (`charts/metric-*-chart.tsx`) because of recharts; the rest are server components.

## Conventions

- Charts are recharts inside shadcn's `ChartContainer`; series colors come from `ChartConfig` and are read in JSX as `var(--color-<dataKey>)`.
- Design tokens are CSS variables in `app/globals.css` (`:root` / `.dark`), mapped into Tailwind v4 via `@theme inline`. There is no `tailwind.config`. `--accent-green` is the one non-neutral accent — use tokens (`text-muted-foreground`, `bg-accent-green`) rather than raw colors.
- Visual voice: lowercase copy, `font-mono` uppercase micro-labels with wide tracking for metadata, `tabular-nums` for figures.
- Import paths use the `@/*` alias rooted at the project directory.
- Prettier: no semicolons, double quotes, 2-space indent, 80 columns, with `prettier-plugin-tailwindcss` sorting classes.
- Commits follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`), enforced by the `commit-msg` hook.

## Adding UI components

```bash
npx shadcn@latest add button
```

Components land in `components/ui/` and are imported as `@/components/ui/button`.
