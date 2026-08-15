# Startup Funding & Dilution Planner

Five free tools for founders, in one Next.js app —
**[startup-funding-planner.vercel.app](https://startup-funding-planner.vercel.app)**

- **Growth Planner** — whether you need outside money at all. Models growth
  motions by what they do to the *slope*: Land buys revenue with delivery
  capacity and stops where your people stop, Expand compounds on a base you
  already paid to acquire, and License scales with a partner's customer list
  instead of your headcount. Reports revenue per person-month, and either says
  the plan funds itself or names the amount and the month you must start
  raising.
- **Ready to Raise** — an investor-readiness board. Tick what you already have; it
  scores five readiness dimensions from the fundraising literature, names your
  binding constraint, and ranks what to fix by leverage. Also ranks which investor
  archetypes to target.
- **Round Planner** — how much to raise and what it buys. Sizes the round from the
  milestone the next one expects, in either direction: bottom-up from a team plan,
  or top-down from a revenue, user or product target. Shows both and the gap
  between them, with a timeline of when to start raising again.
- **Dilution Planner** — model dilution across FFF, Angels & VCs, handle grants and
  convertibles, build a cap table, and simulate exits under different liquidation
  preferences.
- **Network Strategy** — a weighted three-layer model (founder attributes →
  mechanisms → strategies) built from the empirical fundraising literature, each
  strategy with a step-by-step playbook.

Each model states its weights openly and cites the papers behind them. The
weights are set by hand from the literature, not fitted to data — the output is
a structured argument, not a prediction.

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
| `npm test` | Model unit tests, via Node's own runner |

Copy `.env.example` to `.env.local` for the optional keys.

## Layout

```
app/
  page.tsx                  hero + tool switcher + footer
  globals.css               design tokens, shared component styles, print rules
  api/milestones/route.ts   server-side milestone suggestions
components/
  growth/                   growth planner UI
  ScrollHero.tsx            scroll-driven word hero
  PillNav.tsx               tool switcher (dropdown on mobile)
  ToolSwitcher.tsx          keeps all five tools mounted, syncs ?tool=
  MotionButton.tsx          circle-that-grows-into-a-pill link
  SiteFooter.tsx            GitHub links + disclaimer
  ready/                    ready-to-raise UI
  round/                    round planner UI
  planner/                  dilution planner UI
  network/                  network strategy UI
lib/
  months.ts                 month arithmetic, shared by the planners
  growth-motions.ts         motions, leverage metrics, the capital verdict
  planner.ts                all planner maths — pure, no DOM
  network-strategy.ts       weights, citations, and the two-layer model
  ready-to-raise.ts         readiness dimensions, actions, archetypes
  round-planner.ts          round sizing, capacity model, timeline
  inplicit/                 revenue planner: model, roster, share codec
```

All the models live in `lib/` as pure functions over a state object, with no DOM
access, so they can be exercised without a browser.

## Unlisted route

`/inplicit` is a company-specific revenue planner rather than one of the
public tools. It has **no access control**: it is excluded in `robots.txt`,
absent from `sitemap.xml`, carries `noindex` and is not in the tool
navigation — so search engines skip it, but anyone with the URL can read it.

`lib/inplicit/roster.ts` therefore holds **placeholder rows only** — it ships
in the client bundle and lives in a public repo, so treat everything in it as
published. Real account names go in through the tool itself and persist in the
share link and in the browser's saved scenarios, never in the repository.

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
