# decdn stats

A single-page status dashboard for the DeCDN network — value settled, bytes served, and active nodes, presented as raw on-chain state read from Arbitrum Sepolia.

Built with Next.js (App Router), React 19, Tailwind CSS v4, shadcn/ui, and recharts.

> **Every figure on the page is currently static.** There is no backend, no data fetching, and no API routes — the numbers live in [`lib/mock.ts`](lib/mock.ts) as stand-ins for values that would be read from chain.

## Getting started

Package manager is **pnpm**.

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000.

## Scripts

| Command          | What it does                    |
| ---------------- | ------------------------------- |
| `pnpm dev`       | Start the dev server            |
| `pnpm build`     | Production build                |
| `pnpm start`     | Serve the production build      |
| `pnpm lint`      | ESLint (next core-web-vitals)   |
| `pnpm typecheck` | `tsc --noEmit`                  |
| `pnpm format`    | Prettier over `**/*.{ts,tsx}`   |

There is no test framework in this project. Verify changes with `pnpm typecheck && pnpm lint` and by looking at the running dev server.

## Project layout

```
app/            layout, globals.css, and page.tsx — the only composition point
blocks/         page sections (hero, metric-*, regions, settlements, signals)
globals/        chrome reused across sections (Header, Footer, SectionDivider)
components/ui/  unmodified shadcn/ui primitives
lib/mock.ts     the figures — typed exports standing in for on-chain reads
```

Two rules explain most of the structure:

- **Figures and copy are separated.** `lib/mock.ts` holds only values (`Metric`, `MetricPoint`, `Settlement`, `Region`). Headlines, labels, and prose are hardcoded in the block that renders them — so changing what the page *says* means editing that block, not the data file.
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

## The editorial rule

An off-chain signal with `value: null` (see [`blocks/off-chain-signals.tsx`](blocks/off-chain-signals.tsx)) renders as an em dash meaning *"not verifiably measured yet."* Never fill one in with an estimate or a placeholder number — the premise of the page is that every displayed figure is verifiable on-chain state.
