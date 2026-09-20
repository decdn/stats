# decdn stats

A single-page status dashboard for the DeCDN network — value settled, bytes served, and active nodes, presented as raw on-chain state read from Arbitrum Sepolia.

Built with Next.js (App Router), React 19, Tailwind CSS v4, shadcn/ui, and recharts.

> The settlements table is live: a Cloudflare Worker in [`worker/`](worker/) indexes `FeeRouter.Settled` logs on a cron and writes `stats.json` to R2, which the page reads at build/revalidate time. The metric cards and by-region table are still static stand-ins from [`lib/mock.ts`](lib/mock.ts).

## Getting started

Package manager is **pnpm**.

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000. Without a `.env` the settlements table shows mock rows.

### Live on-chain data (local)

```bash
cp .env.example .env   # fill RPC_URL and START_BLOCK
pnpm worker:dev        # wrangler dev with a locally emulated R2 bucket, on :8787
```

Trigger the cron by hand and check the result:

```bash
curl "http://localhost:8787/__scheduled?cron=*/10+*+*+*+*"
curl http://localhost:8787/stats.json
```

Each tick indexes at most `LOG_CHUNK_BLOCKS × MAX_CHUNKS_PER_RUN` blocks (see [`worker/wrangler.jsonc`](worker/wrangler.jsonc)) past `lastBlock`, so the first backfill takes a few ticks; pass `--var LOG_CHUNK_BLOCKS:1000000` to `wrangler dev` if your RPC allows wide `eth_getLogs` ranges. With `STATS_URL=http://localhost:8787/stats.json` in `.env`, `pnpm dev` renders the indexed rows.

Deploy with `pnpm worker:deploy` after `wrangler login`, `wrangler r2 bucket create decdn-stats`, and `wrangler secret put RPC_URL`.

When the contracts are redeployed, update `FEE_ROUTER` in [`worker/wrangler.jsonc`](worker/wrangler.jsonc) and `START_BLOCK` (the L2 block of the new FeeRouter) from `decdn/contracts/deployments/421614.json`. `stats.json` records the deployment it was built from, so the next tick notices the change and re-indexes from scratch — no manual bucket wipe.

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
blocks/         page sections (hero, metric-*, by-region, settlements)
globals/        chrome reused across sections (Header, Footer, SectionDivider)
components/ui/  unmodified shadcn/ui primitives
lib/mock.ts     the figures — typed exports standing in for on-chain reads
```

Two rules explain most of the structure:

- **Figures and copy are separated.** `lib/mock.ts` holds only values (`Metric`, `MetricPoint`, `Settlement`, `Region`, `RegionStats`). Headlines, labels, and prose are hardcoded in the block that renders them — so changing what the page *says* means editing that block, not the data file.
- **Blocks take no props and own no layout.** Each section is a zero-prop component that imports its own figures. `app/page.tsx` assembles them and owns all page-level layout (the `max-w-6xl` container, the metrics grid).

The three metric cards are deliberately separate files rather than one parameterized component: each owns its own `ChartConfig`, gradient `id`, and Y-domain math. They are client components (`"use client"`) because of recharts; the rest are server components.

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
