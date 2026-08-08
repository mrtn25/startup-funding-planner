# Startup Funding & Dilution Planner

Three free tools for founders, in one Next.js app —
**[startup-funding-planner.vercel.app](https://startup-funding-planner.vercel.app)**

- **Ready to Raise** — an investor-readiness board. Tick what you already have; it
  scores five readiness dimensions from the fundraising literature, names your
  binding constraint, and ranks what to fix by leverage. Also ranks which investor
  archetypes to target.
- **Funding Planner** — model dilution across FFF, Angels & VCs, handle grants and
  convertibles, build a cap table, and simulate exits under different liquidation
  preferences.
- **Network Strategy** — a weighted three-layer model (founder attributes →
  mechanisms → strategies) built from the empirical fundraising literature, each
  strategy with a step-by-step playbook.

Both research-backed tools state their weights openly and cite the papers behind
them. The weights are set by hand from the literature, not fitted to data — the
output is a structured argument, not a prediction.

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
  page.tsx                  hero + tool switcher + footer
  globals.css               design tokens, shared component styles, print rules
  api/milestones/route.ts   server-side milestone suggestions
components/
  ScrollHero.tsx            scroll-driven word hero
  PillNav.tsx               tool switcher (dropdown on mobile)
  ToolSwitcher.tsx          keeps all three tools mounted, syncs ?tool=
  MotionButton.tsx          circle-that-grows-into-a-pill link
  SiteFooter.tsx            GitHub links + disclaimer
  ready/                    ready-to-raise UI
  planner/                  funding planner UI
  network/                  network strategy UI
lib/
  planner.ts                all planner maths — pure, no DOM
  network-strategy.ts       weights, citations, and the two-layer model
  ready-to-raise.ts         readiness dimensions, actions, archetypes
```

All three models live in `lib/` as pure functions over a state object, with no DOM
access, so they can be exercised without a browser.

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
