# backable

Seven free tools for founders, a plain-language term sheet glossary and the
startup numbers that are actually traceable to a source, in one Next.js app — **[startup-funding-planner.vercel.app](https://startup-funding-planner.vercel.app)**

- **Bootstrap** — whether you need outside money at all, in two parts. First
  eight conditions from the bootstrapping literature — time to first revenue,
  gross margin, capital needed before the first sale, payment terms, how fast
  the market is being taken, whether founders can sell it, how long they last
  unpaid, and what the company is meant to become. Three of them rule it out on
  their own rather than costing points. Then the same question in cash: capacity
  caps who can be served, hiring waits for money that already exists, and the
  plan either funds itself or names the amount and the month to start raising.
- **ARR & MRR** — what your recurring revenue really is. Normalises monthly,
  quarterly and annual plans onto one monthly number, then builds the bridge —
  starting MRR plus new plus expansion minus contraction minus churn — and
  reports gross and net retention on the base that existed at the start of the
  month, not on the base after new sales flattered it. It also shows the gap
  between ARR taken as *committed* recurring revenue and the number you get by
  annualising everything that came in, which is the gap investors ask about.

  A second view models **land and expand in ACV**, for software that starts
  with a paid project and grows into a platform licence. Pilots are won at a
  rate that itself accelerates, a cohort of them steps up after a lag, and the
  licence carries an ACV, a billing cycle and a term — so total contract value
  and annual contract value stay apart, annual contracts churn at renewal
  rather than continuously, and billing annually upfront produces a deferred
  revenue balance you can see. Whether the first engagement is a one-off
  project or a small subscription decides whether an upgrade is new ARR or
  expansion, which moves net retention enormously for the same business; the
  model computes it both ways and shows the two numbers side by side.
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
- **Co-Founder Split** — who should get how much, by the weighted-factor method
  (Demmler's Founders' Pie) rather than by handshake, plus a vesting simulation
  showing what each founder keeps and forfeits if they leave in a given month.
  Around three quarters of teams split equally; the research finding is not that
  this is wrong but that arriving there *by default* rather than by argument
  made teams markedly likelier to be unhappy later and less able to change it.
- **Network Strategy** — a weighted three-layer model (founder attributes →
  mechanisms → strategies) built from the empirical fundraising literature, each
  strategy with a step-by-step playbook.

Plus a module that is not a calculator at all:

- **Can you get to an exit?** (`/simulator`) — a decision game, modelled on
  GermanZero's *Klimakanzler:in* and its one good idea: two meters that pull
  against each other, one of which falls while you are deciding. Here the
  meters are cash, the confidence of investors, the affection of customers and
  the equity you still hold — and investor confidence decays a point a month
  whatever you do. Nine decisions from the kitchen table to the seed round,
  each one with a note on what it does in reality and a link to the tool that
  works it out properly. Five endings, four of them survivable, because most
  companies neither die nor exit — they continue.

Plus two sections that are not tools:

- **Infos** — the vocabulary of a term sheet in plain words, each entry
  answering what it is, why it exists and what it does to you, with the worked
  numbers where prose would be vaguer than arithmetic.
- **Stats** — survival rates, how concentrated venture outcomes are, what a
  prior success does and does not predict, and the gap between a unicorn
  headline and what the common shares are worth. Every figure traces to a paper
  or a government series and carries what it measures — including the survival
  series, which counts every new employer establishment and is not a startup
  failure rate however often it is quoted as one. There is deliberately no
  unicorn map and no founder-archetype chart: those counts come from commercial
  trackers whose inclusion rules nobody can check, and the section says so.

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
  page.tsx                  shell + footer
  globals.css               design tokens, shared component styles, print rules
  api/milestones/route.ts   server-side milestone suggestions
components/
  SiteHeader.tsx            wordmark and the one menu
  simulator/                the decision game on /simulator
  bootstrap/                bootstrap tool UI
  split/                    co-founder split UI
  infos/                    term sheet glossary cards
  stats/                    the data board
  recurring/                ARR & MRR calculator
  ScrollHero.tsx            scroll-driven word hero
  PillNav.tsx               tool switcher (dropdown on mobile)
  ToolSwitcher.tsx          shell: header, hero, seven mounted tools, glossary, stats
  MotionButton.tsx          circle-that-grows-into-a-pill link
  SiteFooter.tsx            GitHub links + disclaimer
  ready/                    ready-to-raise UI
  round/                    round planner UI
  planner/                  dilution planner UI
  network/                  network strategy UI
lib/
  months.ts                 month arithmetic, shared by the planners
  bootstrap.ts              the eight conditions, weighted, with sources
  bootstrap-cash.ts         capacity, hiring gates, the capital verdict
  glossary.ts               term sheet vocabulary
  stats.ts                  the quoted figures, their sources, and what is left out
  recurring.ts              MRR normalisation, the bridge, GRR/NRR
  simulator.ts              game engine: meters, a choice, an ending
  simulator-scenes.ts       the two chapters, as data
  land-expand.ts            pilots, ACV, renewals, deferred revenue
  equity-split.ts           founders pie, vesting, the warnings
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
public tools. It has two views of the same company:

- **Ziel** — top-down. Set a target ARR; it divides back to the customers
  needed, compares the three pricing models (per interview, per campaign,
  annual licence) and reports CAC, LTV, LTV:CAC and payback. One chart shows
  Land, Expand and Channel as stacked layers, so the gap between two lines
  is that motion's contribution and each crosses the target on a different
  month. Plain arithmetic throughout — `lib/inplicit/goal.ts`.
- **Monatsplan** — bottom-up from the named pipeline, with delivery capacity
  and the financing phase switch — `lib/inplicit/plan.ts`.

It has **no access control**: it is excluded in `robots.txt`, absent from
`sitemap.xml`, carries `noindex` and is not in the tool navigation — so search
engines skip it, but anyone with the URL can read it.

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

## The simulator's artwork

The twelve scenes in `public/game/` were generated with Figma's image tool
(`gpt-image-2.5-flare`, 1536×1024, downscaled to 1200 px wide) from one shared
style prompt:

> Flat comic-style editorial illustration, bold black outlines, flat colour
> fills, no gradients, no text, no logos, no watermarks. Limited palette:
> cobalt blue, warm off-white, mustard yellow, lime green, muted brick red.
> Simple flat background, slightly stylised faces, confident clean linework.

…followed by the scene itself. They are placeholders in the sense that any
replacement dropped in under the same filename is picked up without a code
change, and a missing file degrades to a coloured frame rather than a broken
layout — see `Scene` in `components/simulator/Simulator.tsx`.
