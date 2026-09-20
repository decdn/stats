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

There is no test framework in this project — no test runner, config, or test files. Verify changes with `pnpm typecheck && pnpm lint` (plus `pnpm --filter @decdn/stats-worker typecheck` for the worker) and by looking at the running dev server. Local end-to-end for the indexer: `pnpm worker:dev`, `curl "http://localhost:8787/__scheduled?cron=*/10+*+*+*+*"`, then `pnpm dev` with `STATS_URL=http://localhost:8787/stats.json` (see README).

Add shadcn/ui components with `npx shadcn@latest add <name>`; they land in `components/ui/`.

## Architecture

Single-page Next.js App Router status dashboard ("network status") that presents on-chain metrics for a CDN-style network on Arbitrum Sepolia. There are no API routes. The settlements table reads real data; everything else is static from `lib/mock.ts`.

- **`worker/` — the indexer.** A separate pnpm workspace package (Cloudflare Worker, viem, wrangler) with its own `tsconfig.json`; the root `tsconfig`/eslint exclude it. On a cron it reads `stats.json` from an R2 binding, indexes `FeeRouter.Settled` from `lastBlock + 1` in capped chunks, and writes `stats.json` back (`worker/src/run.ts`). `worker/src/stats.ts` is pure (types + fold functions, no I/O) and is the shared schema — `lib/stats.ts` type-imports it. Bigints are decimal strings in base units. `GET /stats.json` on the worker serves the bucket for local dev.
- **`lib/stats.ts` — `getStats()`.** Fetches `STATS_URL` with `next: { revalidate: 60 }`; returns `null` when the env var is unset so blocks can fall back to mock. Formatting for display (`formatUsdc`, `truncateHex`, `formatUtcTime`) lives in `lib/utils.ts`.

The layering that matters:

- **`lib/mock.ts` — the static figures.** Metric values, deltas, chart series, fallback settlement rows, and per-region delivery figures live here as typed exports (`Metric`, `MetricPoint`, `Settlement`, `Region`, `RegionStats`) — the stand-ins for data that would be read from chain. Components import named exports directly; nothing takes props. Copy does **not** live here: headlines, labels, captions, micro-labels, and prose are hardcoded in the block that renders them, so changing what the page *says* means editing that block.
- **`blocks/` — page sections.** One file per section (`hero`, `metric-*`, `by-region`, `settlements-table`), each a zero-prop exported component that owns its own copy and pulls its figures from `lib/mock.ts` (or, for `settlements-table`, awaits `getStats()` as an async server component). The three metric cards are deliberately separate files rather than one parameterized component: each owns its own `ChartConfig`, gradient `id`, and Y-domain math.
- **`globals/<Name>/` — chrome reused across sections** (`Header`, `Footer`, `SectionDivider`). `SiteHeader`/`SiteFooter` are currently empty spacer elements.
- **`app/page.tsx` — the only composition point.** It assembles blocks and owns all page-level layout (`max-w-6xl` container, the metrics grid). Blocks do not lay themselves out relative to each other.
- **`components/ui/` — unmodified shadcn/ui primitives.** `app/layout.tsx` wraps everything in `ThemeProvider` (next-themes, class attribute) and `TooltipProvider`.

### Conventions in this codebase

- Charts are recharts inside shadcn's `ChartContainer`; series colors come from `ChartConfig` and are read in JSX as `var(--color-<dataKey>)`.
- Metric cards are client components (`"use client"`) because of recharts; hero, divider, and by-region stay server components.
- Design tokens are CSS variables defined in `app/globals.css` (`:root` / `.dark`) and mapped into Tailwind v4 via `@theme inline`. There is no `tailwind.config`. `--accent-green` is the project's one non-neutral accent; use tokens (`text-muted-foreground`, `bg-accent-green`) rather than raw colors.
- Visual voice: lowercase copy, `font-mono` uppercase micro-labels with wide tracking for metadata, `tabular-nums` for figures.
- `lib/utils.ts` re-exports `cn` from the `cn` package and holds `formatBytes`, which picks a base-1000 unit for a raw byte count. Import paths use the `@/*` alias rooted at the project directory.
- Prettier: no semicolons, double quotes, 2-space indent, 80 columns, with `prettier-plugin-tailwindcss` sorting classes.
- Commits follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`).
