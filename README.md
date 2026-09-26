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

> Every section is live: the Worker's cron (code in [`worker/`](worker/)) indexes `FeeRouter`, `CapacityBond` and `PaymentPool` logs and writes `stats-<CHAIN_ID>.json` to R2. The bucket is public at `https://data.decdn.org`, and the page, a static export, fetches the file in the browser and refreshes it every minute while the tab is visible.

## Getting started

Package manager is **pnpm**; Node ≥ 22.22.1 (`engines` — the git hooks' lint-staged and commitlint need it).

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000. The page needs no `.env`: it fetches the live production file, `https://data.decdn.org/stats-421614.json`, from the browser. Set `NEXT_PUBLIC_STATS_URL` in `.env` to read another URL, which must send CORS headers. Until the file loads, every section says "loading"; if the first fetch fails they say "stats unavailable". After that a failed refresh keeps the last stats on screen, marked "as of …" once they are over 30 minutes old.

### Running the indexer locally

```bash
cp .env.example .env   # fill RPC_URL
pnpm index             # one cron tick into a locally emulated R2 bucket
npx wrangler r2 object get decdn-stats/stats-421614.json --local --pipe
```

Each tick indexes at most `LOG_CHUNK_BLOCKS × MAX_CHUNKS_PER_RUN` blocks (see [`wrangler.jsonc`](wrangler.jsonc)) past `lastBlock`, so the first backfill takes a few runs of `pnpm index`; set `LOG_CHUNK_BLOCKS=1000000` in `.env` if your RPC allows wide `eth_getLogs` ranges. `pnpm index` takes its bindings and vars from `wrangler.jsonc` plus `.env`, and the emulated bucket persists in `.wrangler/state`; with the `R2_*` credentials set it writes the real bucket instead. To render a local file, serve it with CORS headers and point `NEXT_PUBLIC_STATS_URL` at it. Until the index has caught up with the chain the metric cards read "catching up · block N" and the table footer "re-indexing". The registered-node count and its history are folded from `CapacityBond` registration events, so the sparkline and 24h change are complete as soon as the index catches up.

## Deploying to Cloudflare

The repo is one Worker, `stats`, configured in [`wrangler.jsonc`](wrangler.jsonc). It serves the static export in `out/` as assets (`not_found_handling: "404-page"`), and its entry, [`worker/src/index.ts`](worker/src/index.ts), adds the `scheduled` handler: every 5 minutes the cron indexes the chain into the `decdn-stats` R2 bucket (binding `STATS`). The bucket's public domain, `data.decdn.org`, serves the file to the page. There is no server rendering, so the Worker's own `fetch` only hands asset misses back to the assets binding.

On Workers Builds it's one project with the repo root as root directory and the defaults: build command `pnpm run build`, deploy command `npx wrangler deploy`, non-production branch deploy command `npx wrangler preview`. A Preview inherits no vars or bindings except the assets and their `ASSETS` binding, and runs no cron; the page needs nothing else, so the `previews` block in [`wrangler.jsonc`](wrangler.jsonc) is empty (`wrangler preview` requires it to exist). A Preview reads the production file like everything else. The Worker name in the dashboard must match `name` in `wrangler.jsonc`, or the build fails. `pnpm build` is `next build` with `output: "export"` (after `cf-typegen`, since it typechecks `worker/` too).

Before the first deploy: `wrangler r2 bucket create decdn-stats`, `wrangler secret put RPC_URL`, connect the bucket's public custom domain (`data.decdn.org`) in the R2 dashboard, and give it the CORS policy in [`r2-cors.json`](r2-cors.json) — `npx wrangler r2 bucket cors set decdn-stats --file r2-cors.json` — without which the browser can't read the file. `CHAIN_ID` in `wrangler.jsonc` names the file, so the page's URL in [`lib/stats.tsx`](lib/stats.tsx) must change with it. Locally, `pnpm app:preview` builds and runs the Worker in workerd with `--test-scheduled`, so `curl "http://localhost:8787/__scheduled?cron=*/5+*+*+*+*"` fires a cron tick. `pnpm app:deploy` builds and deploys it.

When the contracts are redeployed, update `FEE_ROUTER`, `CAPACITY_BOND`, `PAYMENT_POOL` and `START_BLOCK` in [`wrangler.jsonc`](wrangler.jsonc). The addresses come from `decdn/contracts/deployments/421614.json`, but that file's `deployBlock` is an **L1** number — `START_BLOCK` must be the L2 block: take the earliest creation block of the three contracts from arbiscan, or the first L2 block whose `l1BlockNumber` ≥ `deployBlock`. The stats file records the deployment it was built from (chain, the three addresses, `START_BLOCK`), so the next tick notices the change and re-indexes from scratch over it. A stats file the indexer can't read (bad JSON, or a shape from an older version) is overwritten the same way. The rebuild takes several ticks, during which the cards show "catching up".

## Scripts

| Command            | What it does                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| `pnpm dev`         | Start the dev server                                                                                    |
| `pnpm build`       | Production build: the static export in `out/`                                                           |
| `pnpm lint`        | ESLint (next core-web-vitals)                                                                           |
| `pnpm typecheck`   | `wrangler types` (via `cf-typegen`), then `tsc --noEmit`                                                |
| `pnpm format`      | Prettier over ts/tsx/js/jsx/mjs/cjs/json/jsonc/css/md/yaml/yml                                          |
| `pnpm index`       | Run one indexer tick into the local (or `.env`-configured) bucket                                       |
| `pnpm cf-typegen`  | Generate `cloudflare-env.d.ts` from `wrangler.jsonc` (gitignored; `build` and `typecheck` run it first) |
| `pnpm app:preview` | Build and run the Worker in workerd; `/__scheduled` fires a cron tick                                   |
| `pnpm app:deploy`  | Build and deploy the Worker to Cloudflare                                                               |

There is no test framework in this project. Verify changes with `pnpm typecheck && pnpm lint` and by looking at the running dev server.

`pnpm install` also installs husky git hooks: `pre-commit` runs lint-staged (ESLint `--fix` + Prettier on staged JS/TS, Prettier on staged JSON/JSONC/Markdown/CSS/YAML) and `commit-msg` checks the message against Conventional Commits with commitlint. They're local only: `git commit --no-verify` or `HUSKY=0` skips them.

## Project layout

```
app/            layout, globals.css, and page.tsx — the only composition point
blocks/         page sections (hero, metric-*, by-region, settlements); charts/ holds the metric cards' client charts
globals/        chrome reused across sections (Header, Footer, SectionDivider)
components/ui/  unmodified shadcn/ui primitives
lib/stats.tsx   StatsProvider + useStats() — fetches the public stats file in the browser
worker/src/     the Worker entry and the indexer (cron → R2)
lib/metrics.ts  stats file → metric card view models (headline, 24h change, hourly series)
lib/regions.ts  stats file → by-region rows (nodes, bytes, cache hit)
```

Two rules explain most of the structure:

- **Figures and copy are separated.** `lib/metrics.ts` and `lib/regions.ts` hold only values and statuses (`Metric`, `MetricView`, `RegionRow`, `RegionsView`); even empty-state labels live in the blocks. Headlines, labels, and prose are hardcoded in the block that renders them — so changing what the page _says_ means editing that block, not the data file.
- **Blocks take no props and own no layout.** Each section's entry component takes no props and reads its own figures with `useStats()`; only the `charts/metric-*-chart.tsx` halves receive `series` from their block. `app/page.tsx` assembles them inside `StatsProvider` and owns all page-level layout (the `max-w-6xl` container, the metrics grid).

The three metric cards are deliberately separate files rather than one parameterized component: each owns its own `ChartConfig`, gradient `id`, and Y-domain math. Each is a client component (`metric-*.tsx`, `useStats()`) paired with its recharts chart (`charts/metric-*-chart.tsx`). Every block that shows live data is a client component; the static HTML is their "loading" state.

## Conventions

- Charts are recharts inside shadcn's `ChartContainer`; series colors come from `ChartConfig` and are read in JSX as `var(--color-<dataKey>)`.
- Design tokens are CSS variables in `app/globals.css` (`:root` / `.dark`), mapped into Tailwind v4 via `@theme inline`. There is no `tailwind.config`. `--accent-green` is the one non-neutral accent — use tokens (`text-muted-foreground`, `bg-accent-green`) rather than raw colors.
- Visual voice: lowercase copy, `font-mono` uppercase micro-labels with wide tracking for metadata, `tabular-nums` for figures.
- Import paths use the `@/*` alias rooted at the project directory.
- Prettier: no semicolons, double quotes, 2-space indent, 80 columns, with `prettier-plugin-tailwindcss` sorting classes.
- Commits follow Conventional Commits, checked by the `commit-msg` hook (`@commitlint/config-conventional`): a type from `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `perf`, `test`, `build`, `ci`, `revert`; a subject not in sentence, start, pascal or upper case; header and body lines of at most 100 characters. The hook is local, so a squash merge's title (the PR title) is never checked.

## Adding UI components

```bash
npx shadcn@latest add button
```

Components land in `components/ui/` and are imported as `@/components/ui/button`.
