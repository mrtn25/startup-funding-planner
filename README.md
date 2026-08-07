# Startup Funding & Dilution Planner

Two free tools for founders, in one Next.js app:

- **Funding Planner** — model dilution across FFF, Angels & VCs, handle grants and
  convertibles, build a cap table, and simulate exits under different liquidation
  preferences.
- **Network Strategy** — a weighted three-layer model (founder attributes →
  mechanisms → strategies) built from the empirical fundraising literature.

## Running it

```bash
npm install
npm run dev
```

| Script | Does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |

## Layout

```
app/
  page.tsx                  hero + tool switcher
  globals.css               design tokens, shared component styles, print rules
  api/milestones/route.ts   server-side milestone suggestions
components/
  ScrollHero.tsx            scroll-driven word hero (pure CSS, no JS animation)
  PillNav.tsx               sticky tool switcher
  ToolSwitcher.tsx          keeps both tools mounted, syncs ?tool=
  planner/                  funding planner UI
  network/                  network strategy UI
lib/
  planner.ts                all planner maths — pure, no DOM
  network-strategy.ts       weights, citations, and the two-layer model
```

The planner's maths lives entirely in `lib/planner.ts` and reads only from a
`PlannerState` object, so it can be exercised without a browser.

## Optional: AI milestone suggestions

The "Suggest with AI" button calls `/api/milestones`. Set

```
OPENAI_API_KEY=sk-...
```

in `.env.local` (or as a Vercel environment variable) to enable it. **Without a
key the route returns a curated fallback set** rather than failing, so the
feature degrades quietly. The key is only ever read server-side.

## Deployment

Deployed on Vercel. `vercel.json` pins `framework: "nextjs"` so the build runs
`next build` regardless of the project's dashboard preset.
