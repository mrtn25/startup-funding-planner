/* ══════════════════════════════════════════════════════════════
   When bootstrapping actually works — and what has to be true.

   "Bootstrap or raise" is not a matter of temperament. Whether a
   company can fund itself out of its own revenue is mostly a property
   of the business: how long until the first euro arrives, how much of
   it survives the variable costs, how much has to be spent before
   anything can be sold at all, and whether the market gives you the
   time.

   The criteria follow Bhidé's study of the Inc. 500 founders (HBR
   1992): get operational fast, look for early cash-generating work,
   sell at a price that lets the founders do the selling, keep growth
   in check, watch cash rather than profit. Winborg and Landström later
   catalogued the techniques; Sarasvathy's effectuation explains why
   the approach often beats planning under real uncertainty.

   Pure functions, no DOM — see bootstrap.test.ts.
   ══════════════════════════════════════════════════════════════ */

export const SRC: Record<string, [string, string]> = {
  bhide: [
    "Bhidé, A. (1992). <em>Bootstrap Finance: The Art of Start-ups.</em> Harvard Business Review 70(6). A study of 100 companies from the 1989 Inc. 500 list.",
    "https://hbr.org/1992/11/bootstrap-finance-the-art-of-start-ups",
  ],
  winborg: [
    "Winborg, J. &amp; Landström, H. (2001). <em>Financial bootstrapping in small businesses.</em> Journal of Business Venturing 16(3).",
    "https://doi.org/10.1016/S0883-9026(99)00055-5",
  ],
  sarasvathy: [
    "Sarasvathy, S. (2001). <em>Causation and Effectuation.</em> Academy of Management Review 26(2).",
    "https://doi.org/10.5465/amr.2001.4378020",
  ],
};

export type Verdict = "yes" | "maybe" | "no";

export type CriterionKey =
  | "timeToRevenue"
  | "grossMargin"
  | "upfrontCapital"
  | "cashCycle"
  | "marketClock"
  | "founderSells"
  | "founderRunway"
  | "ambition";

export type BootstrapInputs = {
  /** Months until the first euro arrives. */
  monthsToRevenue: number;
  /** What survives the variable costs. */
  grossMargin: number;
  /** Money that must be spent before anything can be sold, k€. */
  upfrontCapital: number;
  /** Days between delivering and being paid. Negative means paid upfront. */
  paymentDays: number;
  /** How fast the market is being taken. */
  marketClock: "landgrab" | "contested" | "open";
  /** Can the founders sell it themselves? */
  founderSells: boolean;
  /** Months the founders can go without a salary. */
  founderRunwayMonths: number;
  /** What the end state is meant to be. */
  ambition: "profitable" | "large" | "venture";
};

export type Criterion = {
  key: CriterionKey;
  label: string;
  /** 0..1 toward "supports bootstrapping". */
  score: number;
  weight: number;
  verdict: Verdict;
  /** What the current value actually means. */
  finding: string;
  /** What would have to be true for it to hold. */
  requirement: string;
  sources: string[];
};

export type BootstrapResult = {
  criteria: Criterion[];
  /** 0..1, weighted. */
  score: number;
  verdict: Verdict;
  headline: string;
  /** The criterion most in the way. */
  blocker: Criterion | null;
  /** Criteria that rule it out on their own. */
  hardStops: Criterion[];
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Linear between two anchors, clamped outside. */
const between = (v: number, worst: number, best: number) => clamp01((v - worst) / (best - worst));

const verdictOf = (score: number): Verdict => (score >= 0.66 ? "yes" : score >= 0.34 ? "maybe" : "no");

export function assessBootstrap(i: BootstrapInputs): BootstrapResult {
  const raw: Omit<Criterion, "verdict">[] = [
    {
      key: "timeToRevenue",
      label: "Time to first revenue",
      // Being able to charge immediately is the single strongest condition;
      // past roughly a year without income, bootstrapping is over in practice.
      score: between(i.monthsToRevenue, 12, 0),
      weight: 0.2,
      finding:
        i.monthsToRevenue <= 3
          ? `Money arrives after ${i.monthsToRevenue} months — early enough that revenue pays for what comes next.`
          : `${i.monthsToRevenue} months with no income have to be funded out of your own pocket.`,
      requirement:
        "Sell something before the product is finished: a paid pilot, a service, a pre-order. Bhidé calls it getting operational fast — not shipping the product, but issuing the first invoice.",
      sources: ["bhide"],
    },
    {
      key: "grossMargin",
      label: "Gross margin",
      // Under 40 % too little of each euro survives to fund the next sale;
      // past 70 % growth pays for itself.
      score: between(i.grossMargin, 0.2, 0.75),
      weight: 0.18,
      finding:
        i.grossMargin >= 0.6
          ? `${Math.round(i.grossMargin * 100)} cents of every euro survive — enough to pay for the next customer.`
          : `At ${Math.round(i.grossMargin * 100)} % margin, little of each euro is left to fund growth from.`,
      requirement:
        "The contribution per customer has to cover acquiring the next one. Without outside money it is the only source of growth there is.",
      sources: ["bhide"],
    },
    {
      key: "upfrontCapital",
      label: "Capital before the first sale",
      score: between(i.upfrontCapital, 500, 0),
      weight: 0.16,
      finding:
        i.upfrontCapital <= 25
          ? `${Math.round(i.upfrontCapital)} k€ upfront — savings or a grant can carry that.`
          : `${Math.round(i.upfrontCapital)} k€ has to be spent before the first customer pays anything.`,
      requirement:
        "Everything that must be built, certified or bought before the first euro of revenue. Hardware, biotech and regulated products fail here — not on willingness, but on sequence.",
      sources: ["bhide"],
    },
    {
      key: "cashCycle",
      label: "Payment terms",
      // Paid upfront funds the growth; 90-day terms fund the customer.
      score: between(i.paymentDays, 90, -30),
      weight: 0.12,
      finding:
        i.paymentDays <= 0
          ? "Customers pay upfront — they are helping to fund the growth."
          : `${Math.round(i.paymentDays)} days until the money lands: that is how long you finance your customers.`,
      requirement:
        "Upfront payment, a deposit, or annual billing in advance. Bhidé: watch cash, not profit — a profitable company can still die of payment terms.",
      sources: ["bhide", "winborg"],
    },
    {
      key: "marketClock",
      label: "Speed of the market",
      score: i.marketClock === "open" ? 1 : i.marketClock === "contested" ? 0.5 : 0,
      weight: 0.14,
      finding:
        i.marketClock === "landgrab"
          ? "A land grab: whoever gets there first takes it all. Growing out of cash flow here means losing the race."
          : i.marketClock === "contested"
            ? "Contested but not decided — bootstrapping works, at the cost of market share."
            : "No race against the clock. Growing at the pace of revenue costs you nothing.",
      requirement:
        "No network effect that makes the first mover unassailable, and no competitor currently buying the market with someone else's money. Otherwise slow growth is not discipline, it is losing in instalments.",
      sources: ["sarasvathy"],
    },
    {
      key: "founderSells",
      label: "Founders can sell it",
      score: i.founderSells ? 1 : 0.2,
      weight: 0.08,
      finding: i.founderSells
        ? "The founders can do the selling — no sales team that would have to be funded first."
        : "Selling needs people who do not exist yet, and who want paying before the revenue does.",
      requirement:
        "A price point that carries direct personal selling. Bhidé lists it among the seven rules: sell at a value high enough that the founders can do it themselves.",
      sources: ["bhide"],
    },
    {
      key: "founderRunway",
      label: "How long the founders last",
      score: between(i.founderRunwayMonths, 3, 18),
      weight: 0.06,
      finding: `${Math.round(i.founderRunwayMonths)} months without a salary are covered.`,
      requirement:
        "Savings, a grant, part-time work or a second income. The most common reason bootstrapping ends is not the company — it is rent.",
      sources: ["winborg"],
    },
    {
      key: "ambition",
      label: "What it is meant to become",
      score: i.ambition === "profitable" ? 1 : i.ambition === "large" ? 0.55 : 0.1,
      weight: 0.06,
      finding:
        i.ambition === "venture"
          ? "A venture-scale outcome demands a speed that cash flow rarely pays for."
          : i.ambition === "large"
            ? "A large independent company can be bootstrapped — it just takes longer."
            : "A profitable company you own outright is exactly what bootstrapping is for.",
      requirement:
        "Honesty about the goal. Wanting a venture-scale exit means needing the speed only outside money buys; wanting to keep the company means not needing it.",
      sources: ["sarasvathy"],
    },
  ];
  const criteria: Criterion[] = raw.map((c) => ({ ...c, verdict: verdictOf(c.score) }));

  const score = criteria.reduce((a, c) => a + c.score * c.weight, 0) / criteria.reduce((a, c) => a + c.weight, 0);

  /* Some conditions are not points on a scale but doors that are shut:
     money that must be spent before the first sale, and a market decided in
     months, cannot be offset by good numbers elsewhere. */
  const hardStops = criteria.filter(
    (c) => (c.key === "upfrontCapital" || c.key === "marketClock" || c.key === "timeToRevenue") && c.score < 0.2,
  );

  const blocker = [...criteria].sort((a, b) => a.score - b.score)[0] ?? null;

  const verdict: Verdict = hardStops.length ? "no" : verdictOf(score);

  return {
    criteria,
    score,
    verdict,
    hardStops,
    blocker: blocker && blocker.score < 0.66 ? blocker : null,
    headline:
      verdict === "yes"
        ? "The business funds itself — capital would buy speed, not survival."
        : verdict === "maybe"
          ? "Bootstrapping is possible, but it rests on a few things that have to hold."
          : hardStops.length
            ? "Something here cannot be solved by being frugal."
            : "Too much argues against it — this business needs capital before it can carry itself.",
  };
}

export const DEFAULT_BOOTSTRAP: BootstrapInputs = {
  monthsToRevenue: 3,
  grossMargin: 0.7,
  upfrontCapital: 25,
  paymentDays: 30,
  marketClock: "contested",
  founderSells: true,
  founderRunwayMonths: 12,
  ambition: "large",
};

export const MARKET_CLOCKS: { key: BootstrapInputs["marketClock"]; label: string; note: string }[] = [
  { key: "open", label: "Open", note: "No race — the market is not running away." },
  { key: "contested", label: "Contested", note: "There is competition, but the market is not carved up." },
  { key: "landgrab", label: "Land grab", note: "Network effects, or a race the first mover wins." },
];

export const AMBITIONS: { key: BootstrapInputs["ambition"]; label: string; note: string }[] = [
  { key: "profitable", label: "Profitable & independent", note: "You own it and it throws off cash." },
  { key: "large", label: "Large but independent", note: "Tens of millions in revenue, no forced exit." },
  { key: "venture", label: "Venture scale", note: "An outcome that returns a fund." },
];
