/* ══════════════════════════════════════════════════════════════
   ARR and MRR, and the difference between them and revenue.

   The arithmetic is trivial. What is not trivial, and what costs
   founders credibility in diligence, is what may be counted. ARR is
   contracted recurring revenue annualised — not last month times
   twelve, not the best month times twelve, and not anything that has
   to be re-won next quarter. One-off setup fees, professional
   services and usage overages above a committed floor are revenue and
   are not ARR, and an investor will strip them out whether or not you
   did.

   The second thing worth doing here is the bridge: starting ARR, plus
   new, plus expansion, minus contraction, minus churn, equals ending
   ARR. Two companies with identical growth can have completely
   different bridges, and the bridge is what the next round is priced
   on — net revenue retention is the single number a Series A investor
   will ask for first.

   Pure functions, no DOM — see recurring.test.ts.
   ══════════════════════════════════════════════════════════════ */

export const SRC: Record<string, [string, string]> = {
  gornallStrebulaev: [
    "Gornall, W. &amp; Strebulaev, I. (2020). <em>Squaring Venture Capital Valuations with Reality.</em> Journal of Financial Economics 135(1), 120–143 — why the headline number and the defensible number diverge.",
    "https://www.nber.org/papers/w23895",
  ],
  index: [
    "Index Ventures — <em>Rewarding Talent.</em> European benchmarks from 27 portfolio companies and a survey of 53 startups.",
    "https://www.indexventures.com/rewarding-talent/esop-size-at-seed",
  ],
};

export type Term = "monthly" | "quarterly" | "annual";

export const TERMS: { key: Term; label: string; perYear: number }[] = [
  { key: "monthly", label: "Monthly", perYear: 12 },
  { key: "quarterly", label: "Quarterly", perYear: 4 },
  { key: "annual", label: "Annual", perYear: 1 },
];

export type Plan = {
  id: string;
  name: string;
  /** What one customer pays per billing period. */
  price: number;
  term: Term;
  customers: number;
};

export type RecurringInputs = {
  plans: Plan[];

  /* ── The bridge, per month ── */
  /** New MRR won from new customers. */
  newMrr: number;
  /** Additional MRR from existing customers upgrading. */
  expansionMrr: number;
  /** MRR lost to downgrades that did not cancel. */
  contractionMrr: number;
  /** MRR lost to customers leaving entirely. */
  churnedMrr: number;

  /* ── Not recurring, and counted separately ── */
  /** One-off setup or onboarding fees this month. */
  setupFees: number;
  /** Professional services and anything re-won each time. */
  servicesRevenue: number;
  /** Usage above a committed floor — real money, not contracted. */
  overageRevenue: number;

  /** Months to project the bridge forward. */
  horizonMonths: number;
};

export type PlanLine = {
  id: string;
  name: string;
  /** Normalised to a month, whatever the billing term. */
  mrr: number;
  arr: number;
  /** Annual value of one customer on this plan. */
  perCustomer: number;
  shareOfArr: number;
};

export type Bridge = {
  startMrr: number;
  newMrr: number;
  expansionMrr: number;
  contractionMrr: number;
  churnedMrr: number;
  endMrr: number;
  /** New plus expansion, the part that grew. */
  grossNew: number;
  /** Everything after churn and contraction. */
  netNew: number;
};

export type RecurringResult = {
  lines: PlanLine[];
  mrr: number;
  arr: number;
  /** Revenue this month that is not recurring. */
  nonRecurring: number;
  /** Total revenue this month, recurring and not. */
  totalMonthly: number;
  /** What annualising total revenue would claim — the number to avoid. */
  inflatedArr: number;
  /** How much of "revenue × 12" is not actually ARR. */
  inflationGap: number;
  bridge: Bridge;
  /** Gross revenue retention: what survives without counting upgrades. */
  grr: number;
  /** Net revenue retention: the number a Series A asks for first. */
  nrr: number;
  /** Annualised monthly churn, as a share of starting MRR. */
  logoAgnosticChurnRate: number;
  /** Months of the projection, MRR compounding at the current net rate. */
  projection: { month: number; mrr: number; arr: number }[];
  /** Monthly growth implied by the current bridge. */
  monthlyGrowth: number;
  verdicts: Verdict[];
};

export type Verdict = { key: string; level: "ok" | "warn" | "note"; text: string; sources: string[] };

/** One month of revenue from a plan, whatever its billing period. */
export function planMrr(plan: Plan): number {
  const perYear = TERMS.find((t) => t.key === plan.term)?.perYear ?? 12;
  return (plan.price * perYear * plan.customers) / 12;
}

export function computeRecurring(i: RecurringInputs): RecurringResult {
  const lines: PlanLine[] = i.plans.map((p) => {
    const mrr = planMrr(p);
    const perYear = TERMS.find((t) => t.key === p.term)?.perYear ?? 12;
    return { id: p.id, name: p.name, mrr, arr: mrr * 12, perCustomer: p.price * perYear, shareOfArr: 0 };
  });

  const mrr = lines.reduce((a, l) => a + l.mrr, 0);
  const arr = mrr * 12;
  for (const l of lines) l.shareOfArr = arr > 0 ? l.arr / arr : 0;

  const nonRecurring = i.setupFees + i.servicesRevenue + i.overageRevenue;
  const totalMonthly = mrr + nonRecurring;

  /* The mistake this tool exists to prevent: annualising everything that
     landed this month and calling it ARR. */
  const inflatedArr = totalMonthly * 12;

  const startMrr = mrr;
  const endMrr = startMrr + i.newMrr + i.expansionMrr - i.contractionMrr - i.churnedMrr;
  const bridge: Bridge = {
    startMrr,
    newMrr: i.newMrr,
    expansionMrr: i.expansionMrr,
    contractionMrr: i.contractionMrr,
    churnedMrr: i.churnedMrr,
    endMrr,
    grossNew: i.newMrr + i.expansionMrr,
    netNew: i.newMrr + i.expansionMrr - i.contractionMrr - i.churnedMrr,
  };

  /* Retention counts only the existing base — new business is not retention,
     and mixing it in is how a leaky product looks healthy. */
  const retained = startMrr - i.churnedMrr - i.contractionMrr;
  const grr = startMrr > 0 ? Math.max(0, retained) / startMrr : 1;
  const nrr = startMrr > 0 ? Math.max(0, retained + i.expansionMrr) / startMrr : 1;
  const monthlyGrowth = startMrr > 0 ? bridge.netNew / startMrr : 0;

  const n = Math.max(1, Math.round(i.horizonMonths));
  const projection: { month: number; mrr: number; arr: number }[] = [];
  let m = startMrr;
  for (let k = 0; k <= n; k++) {
    projection.push({ month: k, mrr: m, arr: m * 12 });
    m = m * (1 + monthlyGrowth);
  }

  return {
    lines,
    mrr,
    arr,
    nonRecurring,
    totalMonthly,
    inflatedArr,
    inflationGap: inflatedArr - arr,
    bridge,
    grr,
    nrr,
    logoAgnosticChurnRate: startMrr > 0 ? (i.churnedMrr / startMrr) * 12 : 0,
    projection,
    monthlyGrowth,
    verdicts: verdictsFor(i, { arr, nonRecurring, totalMonthly, nrr, grr, monthlyGrowth }),
  };
}

function verdictsFor(
  i: RecurringInputs,
  x: { arr: number; nonRecurring: number; totalMonthly: number; nrr: number; grr: number; monthlyGrowth: number },
): Verdict[] {
  const v: Verdict[] = [];

  const nonRecurringShare = x.totalMonthly > 0 ? x.nonRecurring / x.totalMonthly : 0;
  if (nonRecurringShare > 0.25) {
    v.push({
      key: "mixed",
      level: "warn",
      text: `${Math.round(nonRecurringShare * 100)} % of this month's revenue is not recurring. Annualising the lot would claim an ARR that is ${Math.round((x.nonRecurring * 12) / 1000)} k higher than the defensible one. Diligence will strip it out, so it is better to strip it out yourself and present the recurring number with the services revenue beside it.`,
      sources: ["gornallStrebulaev"],
    });
  }

  if (x.nrr >= 1.2) {
    v.push({
      key: "nrr-strong",
      level: "ok",
      text: `Net revenue retention of ${Math.round(x.nrr * 100)} % means the existing base grows on its own. Above 120 % a company can grow without winning a single new customer, which is the profile that gets priced on a premium multiple.`,
      sources: [],
    });
  } else if (x.nrr < 1) {
    v.push({
      key: "nrr-leak",
      level: "warn",
      text: `Net revenue retention is ${Math.round(x.nrr * 100)} %. The base shrinks by itself, so every month of growth has to be bought again from new business — a bucket that has to be filled faster than it drains.`,
      sources: [],
    });
  }

  if (x.grr < 0.85 && i.churnedMrr > 0) {
    v.push({
      key: "grr",
      level: "note",
      text: `Gross retention of ${Math.round(x.grr * 100)} % is the number without upgrades flattering it. Expansion can hide a churn problem in the net figure for a long time; gross retention cannot.`,
      sources: [],
    });
  }

  const annualised = Math.pow(1 + x.monthlyGrowth, 12) - 1;
  if (x.monthlyGrowth > 0.15) {
    v.push({
      key: "fast",
      level: "note",
      text: `${Math.round(x.monthlyGrowth * 100)} % a month compounds to ${Math.round(annualised * 100)} % a year. Sustained rates like that are rare and usually reflect a small base — worth stating the absolute numbers alongside, because a percentage off a low base persuades nobody who has seen a few decks.`,
      sources: [],
    });
  }

  return v;
}

let seq = 0;
export function newPlan(partial: Partial<Plan> = {}): Plan {
  seq++;
  return {
    id: `p${Date.now().toString(36)}${seq.toString(36)}`,
    name: "",
    price: 500,
    term: "monthly",
    customers: 10,
    ...partial,
  };
}

export const DEFAULT_RECURRING: RecurringInputs = {
  plans: [
    newPlan({ id: "seed-starter", name: "Starter", price: 250, term: "monthly", customers: 24 }),
    newPlan({ id: "seed-pro", name: "Pro", price: 1200, term: "monthly", customers: 11 }),
    newPlan({ id: "seed-ent", name: "Enterprise", price: 36000, term: "annual", customers: 3 }),
  ],
  newMrr: 3200,
  expansionMrr: 900,
  contractionMrr: 350,
  churnedMrr: 1100,
  setupFees: 2500,
  servicesRevenue: 4000,
  overageRevenue: 600,
  horizonMonths: 24,
};

export function fmtMoney(v: number): string {
  if (!isFinite(v)) return "–";
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} M€`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)} k€`;
  return `${Math.round(v)} €`;
}
