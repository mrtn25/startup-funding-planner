/* ══════════════════════════════════════════════════════════════
   Land and expand, in ACV.

   The plan-and-bridge model next door assumes every euro is already
   recurring. A lot of B2B software does not start there. It starts
   with a paid project — a pilot, an integration, a first department —
   and the recurring contract is what the project is *for*. The two
   are different kinds of money and the difference is the whole point:

   • A project fee is earned once. It is revenue, it is often the best
     revenue a young company has, and it is not ARR. Each one has to be
     won again.
   • A platform licence is contracted. Its annualised value is the ACV,
     and the sum of live ACVs is the ARR.

   Which of the two the pilot is decides how the upgrade shows up in
   the bridge, and that changes net revenue retention enormously for
   the same underlying business:

   • Pilot as a one-off project → the pilot was never ARR, so the whole
     platform contract is **new ARR**. NRR is unaffected.
   • Pilot as a small subscription → the pilot was ARR, so only the
     step up is **expansion**. NRR goes through the roof.

   Same customers, same cash, two very different-looking companies.
   The model computes both and says which one you are looking at,
   because the flattering version is the one that gets quoted and the
   unflattering one is the one that survives a data room.

   The third thing it tracks is billing. An annual contract invoiced
   upfront collects twelve months of cash on day one and earns it a
   month at a time. The gap is deferred revenue: real money in the
   bank that is not yet yours. It is why annual billing is worth a
   discount, and why a company can run out of road while its ARR
   still looks fine.

   Pure functions, no DOM — see land-expand.test.ts.
   ══════════════════════════════════════════════════════════════ */

import { fmtMoney } from "./recurring.ts";

export type Billing = "monthly" | "quarterly" | "annual";

export const BILLINGS: { key: Billing; label: string; perYear: number }[] = [
  { key: "monthly", label: "Monthly", perYear: 12 },
  { key: "quarterly", label: "Quarterly", perYear: 4 },
  { key: "annual", label: "Annual, upfront", perYear: 1 },
];

/** What the first engagement actually is, contractually. */
export type PilotMode = "oneOff" | "subscription";

export type LandExpandInputs = {
  horizonMonths: number;

  /* ── Land ── */
  /** Projects won in month 0. */
  projectsMonth1: number;
  /** How fast the win rate itself grows, per month. */
  projectGrowth: number;
  /** The one-off fee, in `oneOff` mode. */
  projectFee: number;
  /** Delivery duration — what the fee is earned over. */
  projectMonths: number;
  pilotMode: PilotMode;
  /** Annualised value of the pilot, in `subscription` mode. */
  pilotAcv: number;

  /* ── Expand ── */
  /** Share of a pilot cohort that steps up to the platform. */
  upgradeShare: number;
  /** Months from starting the pilot to the upgrade decision. */
  upgradeLagMonths: number;
  /** Annual contract value of the platform licence. */
  platformAcv: number;
  billing: Billing;
  /** Term length. TCV is this times the ACV — and TCV is not ARR. */
  contractYears: number;

  /* ── What happens afterwards ── */
  /** Price and seat growth applied at each renewal. */
  annualUplift: number;
  /** Share not renewing, per year. Annual contracts cannot churn mid-term. */
  annualChurn: number;
  /** Customers who skip the pilot and buy the platform outright. */
  directWinsPerMonth: number;
};

export type LeMonth = {
  month: number;
  /** Pilots started this month. */
  newProjects: number;
  /** Pilots currently running. */
  pilotCustomers: number;
  /** Pilots stepping up to the platform this month. */
  upgrades: number;
  platformCustomers: number;
  /** ARR from pilots — zero unless the pilot is itself a subscription. */
  pilotArr: number;
  platformArr: number;
  arr: number;
  /** Average annual contract value across every live contract. */
  acvAvg: number;
  /** Project fees earned this month. Never part of ARR. */
  projectRevenue: number;
  /** Everything earned this month, recurring and not. */
  recognised: number;
  /** Cash invoiced this month. */
  billings: number;
  /** Billed and not yet earned. Cash you hold and owe. */
  deferred: number;
  newArr: number;
  expansionArr: number;
  churnedArr: number;
};

export type LeResult = {
  months: LeMonth[];
  final: LeMonth;
  /** Annual contract value of one platform licence. */
  acv: number;
  /** Total contract value over the term — quoted as ARR more often than it should be. */
  tcv: number;
  /** What one converted pilot is worth against what the pilot itself was. */
  upgradeMultiple: number;
  /** Trailing-twelve-month net and gross revenue retention. */
  nrr: number;
  grr: number;
  /** The same plan booked the other way, for comparison. */
  nrrIfOther: number;
  otherMode: PilotMode;
  peakDeferred: number;
  /** Share of the final month's revenue that is not recurring. */
  nonRecurringShare: number;
  /** Annualising the final month's total revenue — the number to avoid. */
  inflatedArr: number;
  verdicts: LeVerdict[];
};

export type LeVerdict = { key: string; level: "ok" | "warn" | "note"; text: string };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Pilots started in month `k`, growing at the win-rate growth. */
export function projectsStartedAt(i: LandExpandInputs, k: number): number {
  if (k < 0) return 0;
  return Math.max(0, i.projectsMonth1) * Math.pow(1 + i.projectGrowth, k);
}

type Cohort = { start: number; customers: number; acv: number };

export function computeLandExpand(i: LandExpandInputs, withCounterfactual = true): LeResult {
  const H = Math.min(180, Math.max(1, Math.round(i.horizonMonths)));
  const lag = Math.max(0, Math.round(i.upgradeLagMonths));
  const pm = Math.max(1, Math.round(i.projectMonths));
  const years = Math.max(1, Math.round(i.contractYears));
  const termMonths = years * 12;
  const perYear = BILLINGS.find((b) => b.key === i.billing)?.perYear ?? 12;
  const billEvery = Math.round(12 / perYear);

  /* Churn and uplift are quoted per year but only get a chance to happen at
     a renewal. On a two-year term that is once every 24 months, so the annual
     rates compound over the term rather than applying twice. */
  const termChurn = 1 - Math.pow(1 - clamp01(i.annualChurn), years);
  const termUplift = Math.pow(1 + i.annualUplift, years) - 1;
  const share = clamp01(i.upgradeShare);

  const cohorts: Cohort[] = [];
  const months: LeMonth[] = [];
  let deferred = 0;

  for (let m = 0; m <= H; m++) {
    let newArr = 0;
    let expansionArr = 0;
    let churnedArr = 0;
    let billings = 0;

    /* ── Renewals, before anything else this month ── */
    for (const c of cohorts) {
      const age = m - c.start;
      if (age > 0 && age % termMonths === 0) {
        const lost = c.customers * termChurn;
        churnedArr += lost * c.acv;
        c.customers -= lost;
        const before = c.customers * c.acv;
        c.acv *= 1 + termUplift;
        expansionArr += c.customers * c.acv - before;
      }
    }

    /* ── Upgrades: one conversion per cohort, not a trickle over the base ──
       The customers who started a pilot `lag` months ago decide now. Those
       who do not step up do not step up later either — otherwise the rate
       would mean nothing and every pilot would eventually convert. */
    const upgrades = projectsStartedAt(i, m - lag) * share;
    const direct = Math.max(0, i.directWinsPerMonth);
    if (upgrades + direct > 0) {
      cohorts.push({ start: m, customers: upgrades + direct, acv: Math.max(0, i.platformAcv) });
    }

    if (i.pilotMode === "subscription") {
      /* The pilot was already ARR, so only the step up is expansion — and
         the pilots that did not convert leave at the same moment. */
      expansionArr += upgrades * Math.max(0, i.platformAcv - i.pilotAcv);
      newArr += direct * i.platformAcv;
      churnedArr += projectsStartedAt(i, m - lag) * (1 - share) * Math.max(0, i.pilotAcv);
    } else {
      newArr += (upgrades + direct) * Math.max(0, i.platformAcv);
    }

    /* ── Pilots currently running ── */
    let pilotCustomers = 0;
    for (let k = Math.max(0, m - lag + 1); k <= m; k++) pilotCustomers += projectsStartedAt(i, k);

    const pilotArr = i.pilotMode === "subscription" ? pilotCustomers * Math.max(0, i.pilotAcv) : 0;

    /* ── Project fees: invoiced at the start, earned over the delivery ── */
    let projectRevenue = 0;
    if (i.pilotMode === "oneOff") {
      for (let k = Math.max(0, m - pm + 1); k <= m; k++) {
        projectRevenue += (projectsStartedAt(i, k) * Math.max(0, i.projectFee)) / pm;
      }
      billings += projectsStartedAt(i, m) * Math.max(0, i.projectFee);
    } else {
      billings += pilotArr / 12;
    }

    /* ── Platform invoices fall due on the billing cycle ── */
    for (const c of cohorts) {
      const age = m - c.start;
      if (age >= 0 && age % billEvery === 0) billings += (c.customers * c.acv) / perYear;
    }

    const platformCustomers = cohorts.reduce((a, c) => a + c.customers, 0);
    const platformArr = cohorts.reduce((a, c) => a + c.customers * c.acv, 0);
    const arr = pilotArr + platformArr;
    const recognised = arr / 12 + projectRevenue;
    deferred = Math.max(0, deferred + billings - recognised);

    /* ACV is the annual value of a *contract*. A one-off project is not one,
       so it does not belong in the denominator — counting it there halves the
       average and makes the platform licence look cheaper than it is. */
    const liveCustomers = platformCustomers + (i.pilotMode === "subscription" ? pilotCustomers : 0);
    months.push({
      month: m,
      newProjects: projectsStartedAt(i, m),
      pilotCustomers,
      upgrades,
      platformCustomers,
      pilotArr,
      platformArr,
      arr,
      acvAvg: liveCustomers > 0 ? arr / liveCustomers : 0,
      projectRevenue,
      recognised,
      billings,
      deferred,
      newArr,
      expansionArr,
      churnedArr,
    });
  }

  const final = months[months.length - 1];

  /* Retention over the trailing twelve months, on the base that existed at
     the start of the window — new business is not retention. */
  const from = Math.max(0, months.length - 13);
  const base = months[from].arr;
  let exp = 0;
  let ch = 0;
  for (let k = from + 1; k < months.length; k++) {
    exp += months[k].expansionArr;
    ch += months[k].churnedArr;
  }
  const nrr = base > 0 ? Math.max(0, base + exp - ch) / base : 1;
  const grr = base > 0 ? Math.max(0, base - ch) / base : 1;

  const otherMode: PilotMode = i.pilotMode === "oneOff" ? "subscription" : "oneOff";
  const nrrIfOther = withCounterfactual ? computeLandExpand({ ...i, pilotMode: otherMode }, false).nrr : nrr;

  const pilotWorth = i.pilotMode === "oneOff" ? Math.max(0, i.projectFee) : Math.max(0, i.pilotAcv);
  const inflatedArr = final.recognised * 12;

  const r: LeResult = {
    months,
    final,
    acv: Math.max(0, i.platformAcv),
    tcv: Math.max(0, i.platformAcv) * years,
    upgradeMultiple: pilotWorth > 0 ? i.platformAcv / pilotWorth : 0,
    nrr,
    grr,
    nrrIfOther,
    otherMode,
    peakDeferred: months.reduce((a, x) => Math.max(a, x.deferred), 0),
    nonRecurringShare: final.recognised > 0 ? final.projectRevenue / final.recognised : 0,
    inflatedArr,
    verdicts: [],
  };
  r.verdicts = verdictsFor(i, r, years);
  return r;
}

function verdictsFor(i: LandExpandInputs, r: LeResult, years: number): LeVerdict[] {
  const v: LeVerdict[] = [];
  const pct = (x: number) => Math.round(x * 100);
  /* Shared with the plan view so a million reads as a million rather than
     as four figures of thousands. */
  const k = fmtMoney;

  if (i.pilotMode === "oneOff" && r.nonRecurringShare > 0.1) {
    v.push({
      key: "project-not-arr",
      level: "warn",
      text: `${pct(r.nonRecurringShare)} % of what you earn in the last month is project work. Annualising the whole month would claim ${k(r.inflatedArr)} of ARR against ${k(r.final.arr)} that is actually contracted — a gap of ${k(r.inflatedArr - r.final.arr)}. The project money is real and it is not ARR: every one of those has to be sold again.`,
    });
  }

  if (i.pilotMode === "subscription") {
    v.push({
      key: "pilot-is-arr",
      level: "note",
      text: `Because the pilot is itself a subscription, an upgrade shows as expansion rather than as new business — which is why net retention comes out at ${pct(r.nrr)} %. Booked as a one-off project instead, the same customers would arrive as new ARR and NRR would read ${pct(r.nrrIfOther)} %. Neither is wrong; a diligence team will want to know which one it is looking at.`,
    });
  } else if (Math.abs(r.nrrIfOther - r.nrr) > 0.05) {
    v.push({
      key: "would-flatter",
      level: "note",
      text: `Charging the pilot as a small subscription instead of a one-off would turn every upgrade into expansion: NRR would read ${pct(r.nrrIfOther)} % rather than ${pct(r.nrr)} %. The business is identical — the difference is what the first contract says.`,
    });
  }

  if (r.upgradeMultiple >= 2) {
    v.push({
      key: "multiple",
      level: "ok",
      text: `Each pilot that converts is worth ${r.upgradeMultiple.toFixed(1)}× what the pilot itself was, and unlike the pilot it renews. That is the entire argument for pricing a pilot at something close to the cost of delivering it — the pilot is not the product, it is the qualification step.`,
    });
  }

  if (r.grr < 0.85) {
    v.push({
      key: "grr",
      level: "warn",
      text: `Gross retention of ${pct(r.grr)} % is the number without upgrades flattering it. In a land-and-expand model the two move in opposite directions, and expansion can cover a churn problem in the net figure for years.`,
    });
  }

  if (i.billing === "annual" && r.peakDeferred > 0) {
    v.push({
      key: "deferred",
      level: "note",
      text: `Billing annually upfront means you hold up to ${k(r.peakDeferred)} that is invoiced and not yet earned. It funds the company, and it is a liability rather than profit — spend it as if it were earned and a cancelled renewal takes it back out.`,
    });
  }

  if (years > 1) {
    v.push({
      key: "tcv",
      level: "warn",
      text: `On a ${years}-year term the total contract value is ${k(r.tcv)}, but the ARR contribution is the annual value of ${k(r.acv)}. Quoting TCV as ARR is one of the fastest ways to lose a room.`,
    });
  }

  if (i.upgradeShare >= 0.5) {
    v.push({
      key: "share",
      level: "note",
      text: `The plan turns on ${pct(i.upgradeShare)} % of pilots converting. That is the single most sensitive number here — halve it and the ARR curve halves with it — so it is worth being the one number you can evidence from real pilots rather than assume.`,
    });
  }

  return v;
}

export const DEFAULT_LAND_EXPAND: LandExpandInputs = {
  horizonMonths: 36,
  projectsMonth1: 2,
  projectGrowth: 0.05,
  projectFee: 15000,
  projectMonths: 3,
  pilotMode: "oneOff",
  pilotAcv: 18000,
  upgradeShare: 0.35,
  upgradeLagMonths: 4,
  platformAcv: 60000,
  billing: "annual",
  contractYears: 1,
  annualUplift: 0.07,
  annualChurn: 0.1,
  directWinsPerMonth: 0,
};
