/* ══════════════════════════════════════════════════════════════
   Growth motions, and whether you can pay for growth out of
   revenue.

   The point of the model is that a growth motion is not another
   revenue line. It is a different relationship between effort and
   revenue, and that relationship is what decides the shape of the
   curve:

     LAND     revenue is bought with delivery capacity. One more
              customer costs one more slot. Linear, and it stops
              exactly where your people stop.

     EXPAND   more revenue from a customer you already have. The
              acquisition was paid for once, in Land, and the upsell
              is a multiple of it. Since the installed base is the
              running total of Land, this term is roughly the
              integral of Land — it bends upward on its own.

     LICENSE  one sale reaches many. You sell to a partner, the
              partner serves their own customers, and the revenue
              scales with their reach rather than with your capacity.
              The sale costs about as much as a Land deal and is
              worth a multiple of one.

   So the honest headline is not total revenue — it is revenue per
   person-month. Flat means you are a services business wearing a
   software costume. Rising means a motion has actually decoupled
   revenue from effort.

   Pure functions, no DOM — see growth-motions.test.ts.
   ══════════════════════════════════════════════════════════════ */

import { addMonths, monthLabel } from "./months.ts";

export type MotionKey = "land" | "expand" | "license";

export const MOTIONS: { key: MotionKey; label: string; short: string; blurb: string }[] = [
  {
    key: "land",
    label: "Land",
    short: "One-off deal",
    blurb:
      "The first paid engagement — a pilot, a project, an implementation. Every one of them costs delivery capacity, so this motion can never grow faster than your team.",
  },
  {
    key: "expand",
    label: "Expand",
    short: "Upsell the same customer",
    blurb:
      "The same customer, on a bigger contract, with the acquisition already paid for. A 10 k€ pilot that becomes a 50 k€ subscription is five times the revenue for none of the selling — which is why this motion bends the curve instead of extending it.",
  },
  {
    key: "license",
    label: "License",
    short: "One sale, many end customers",
    blurb:
      "A partner licences the platform for their own client base. You make one sale and reach their whole roster, and if they deliver to their own customers the revenue scales without touching your capacity at all.",
  },
];

export type GrowthInputs = {
  startMonth: string;
  months: number;

  /* ── Starting position ── */
  startCash: number; // k€
  fixedCosts: number; // k€ per month
  founders: number;
  /** k€ per founder per month actually taken out of the company. */
  founderDraw: number;

  /* ── Capacity and hiring ── */
  /** Land deals one person can deliver per month. */
  deliveryPerPerson: number;
  hiringRate: number;
  maxTeam: number;
  costPerEmployee: number; // k€ per month, loaded
  /** Months of runway a hire must not eat into. */
  hireBuffer: number;
  /** The bootstrap constraint: only hire what revenue has already paid for. */
  hireOnlyFromCash: boolean;

  /* ── LAND ── */
  /** New deals per month you can actually source. */
  landDeals: number;
  landPrice: number; // k€, one-off
  landCost: number; // k€ variable per deal

  /* ── EXPAND ── */
  expandOn: boolean;
  /** Share of land customers that upsell. */
  expandRate: number;
  expandLag: number; // months
  /** Contract value as a multiple of the land price. This is the leverage. */
  expandMultiple: number;
  /** Monthly growth of the installed base on top of new conversions. */
  expandGrowth: number;
  /** Capacity one active account consumes per month. */
  expandEffort: number;
  /** Share of expand revenue that goes out again as delivery cost. */
  expandCostRate: number;

  /* ── LICENSE ── */
  licenseOn: boolean;
  /** New partners signed per month. */
  partnersPerMonth: number;
  partnerFee: number; // k€ per year
  /** End customers each partner brings. This is the multiplier. */
  partnerReach: number;
  revPerEndCustomer: number; // k€ per year
  partnerRamp: number; // months to full reach
  /** Capacity one partner consumes per month. */
  partnerEffort: number;
  /** Capacity one *end* customer consumes per month — near zero when the
      partner does their own delivery, which is the whole point. */
  endCustomerEffort: number;

  /* ── The capital question ── */
  /** Months it takes to actually close a round. */
  fundraiseLeadMonths: number;
  /** Cash you refuse to go below. */
  minCashBuffer: number;
};

export type GrowthMonth = {
  index: number;
  key: string;
  label: string;
  people: number;
  employees: number;
  capacity: number;
  capacityUsed: number;
  /** Capacity consumed by each motion. */
  usedLand: number;
  usedExpand: number;
  usedLicense: number;
  newLand: number;
  landCustomers: number;
  expandCustomers: number;
  partners: number;
  /** Customers the partners reach, which we never sold to directly. */
  endCustomers: number;
  revLand: number;
  revExpand: number;
  revLicense: number;
  revenue: number;
  cost: number;
  result: number;
  cash: number;
  /** Revenue that consumed no delivery capacity this month. */
  capacityFreeRevenue: number;
  /** k€ of revenue per person-month — the leverage curve. */
  revenuePerPerson: number;
  /** Everyone we serve ÷ everyone we sold to. */
  reachMultiple: number;
};

export type CapitalVerdict = {
  bootstrappable: boolean;
  /** Lowest cash across the horizon, k€. */
  minCash: number;
  minCashMonth: number;
  /** What it would take to never breach the buffer, k€. */
  capitalNeeded: number;
  /** First month cash breaches the buffer, or null. */
  breachMonth: number | null;
  /** When you would have to start raising to land it in time, or null. */
  startRaisingMonth: number | null;
  /** True when the breach comes sooner than a raise could possibly close. */
  tooLate: boolean;
};

export type GrowthSummary = {
  revenueTotal: number;
  byMotion: Record<MotionKey, number>;
  endRevenue: number;
  endCustomersServed: number;
  endReachMultiple: number;
  /** Revenue per person-month, first month against last. */
  leverageStart: number;
  leverageEnd: number;
  /** Share of the final month's revenue that cost no capacity. */
  capacityFreeShare: number;
  capital: CapitalVerdict;
  /** One land deal's worth of revenue, against one partner deal's. */
  landDealValue: number;
  licenseDealValue: number;
  expandAccountValue: number;
};

export type GrowthResult = { months: GrowthMonth[]; summary: GrowthSummary };

const ramp = (monthsActive: number, rampMonths: number) =>
  rampMonths <= 1 ? 1 : Math.min(1, (monthsActive + 1) / rampMonths);

export function computeGrowth(inputs: GrowthInputs): GrowthResult {
  const n = Math.max(1, Math.round(inputs.months));
  const months: GrowthMonth[] = [];

  let employees = 0;
  let hireCredit = 0;
  let landCustomers = 0;
  let expandCustomers = 0;
  let expandBase = 0; // k€ per month of recurring revenue
  let partners = 0;
  let partnerCredit = 0;
  let cash = inputs.startCash;
  const partnerStarts: number[] = [];
  const newLandByMonth: number[] = [];
  let expandPipeline = 0;

  const acv = inputs.landPrice * inputs.expandMultiple;

  for (let m = 0; m < n; m++) {
    const key = addMonths(inputs.startMonth, m);
    const people = inputs.founders + employees;
    const capacity = people * inputs.deliveryPerPerson;

    /* Partners are signed before anything is measured, so the partner count
       and the reach it implies always describe the same month. */
    if (inputs.licenseOn) {
      partnerCredit += inputs.partnersPerMonth;
      const newPartners = Math.floor(partnerCredit);
      partnerCredit -= newPartners;
      for (let i = 0; i < newPartners; i++) partnerStarts.push(m);
      partners += newPartners;
    }

    /* ── Committed capacity comes off first ──
       You serve the customers you already have before you sell new ones.
       Whatever is left is what Land can actually use. */
    const usedExpand = inputs.expandOn ? expandCustomers * inputs.expandEffort : 0;
    const activeEnd = inputs.licenseOn
      ? partnerStarts.reduce((a, s) => a + inputs.partnerReach * ramp(m - s, inputs.partnerRamp), 0)
      : 0;
    const usedLicense = inputs.licenseOn
      ? partners * inputs.partnerEffort + activeEnd * inputs.endCustomerEffort
      : 0;
    const freeCapacity = Math.max(0, capacity - usedExpand - usedLicense);

    const newLand = Math.min(inputs.landDeals, freeCapacity);
    const usedLand = newLand;
    newLandByMonth[m] = newLand;
    landCustomers += newLand;

    /* ── LAND: bought with capacity, one-off ── */
    const revLand = newLand * inputs.landPrice;

    /* ── EXPAND: the acquisition was already paid for ── */
    let revExpand = 0;
    if (inputs.expandOn) {
      expandBase *= 1 + inputs.expandGrowth;
      const src = m - Math.round(inputs.expandLag);
      if (src >= 0) expandPipeline += (newLandByMonth[src] ?? 0) * inputs.expandRate;
      const converted = Math.floor(expandPipeline);
      expandPipeline -= converted;
      expandCustomers += converted;
      expandBase += (converted * acv) / 12;
      revExpand = expandBase;
    }

    /* ── LICENSE: one sale, many end customers ── */
    const revLicense = inputs.licenseOn
      ? (partners * inputs.partnerFee) / 12 + (activeEnd * inputs.revPerEndCustomer) / 12
      : 0;

    const revenue = revLand + revExpand + revLicense;

    /* ── Costs ── */
    const variable = newLand * inputs.landCost + revExpand * inputs.expandCostRate;
    const people_cost = employees * inputs.costPerEmployee + inputs.founders * inputs.founderDraw;
    const cost = variable + people_cost + inputs.fixedCosts;
    const result = revenue - cost;
    cash += result;

    /* ── Hiring ──
       Two gates, and both have to open.

       You only hire when capacity is what is actually holding you back — if
       there is demand you are turning away for want of hands. Hiring on a
       timer instead would add people with nothing to do, which quietly drags
       revenue per person down and makes every motion look worse than it is.

       And bootstrapping means the hire is paid for by money that already
       exists: the buffer is how many months of that person's cost you insist
       on having in the bank before you sign. */
    const demandBlocked = inputs.landDeals > freeCapacity + 1e-9;
    if (employees < inputs.maxTeam && demandBlocked) {
      const affordable =
        !inputs.hireOnlyFromCash || cash >= inputs.costPerEmployee * inputs.hireBuffer;
      if (affordable) {
        hireCredit += inputs.hiringRate;
        const hires = Math.floor(hireCredit);
        hireCredit -= hires;
        employees = Math.min(inputs.maxTeam, employees + hires);
      }
    }

    const capacityUsed = usedLand + usedExpand + usedLicense;
    const endCustomers = activeEnd;
    /* Revenue that arrived without consuming a capacity slot this month: the
       expansion beyond what the accounts cost to serve, plus everything the
       partners' end customers pay while their delivery is on the partner. */
    const capacityFreeRevenue =
      (inputs.expandOn ? revExpand : 0) +
      (inputs.licenseOn ? (activeEnd * inputs.revPerEndCustomer) / 12 : 0);

    months.push({
      index: m,
      key,
      label: monthLabel(key),
      people,
      employees,
      capacity,
      capacityUsed,
      usedLand,
      usedExpand,
      usedLicense,
      newLand,
      landCustomers,
      expandCustomers,
      partners,
      endCustomers,
      revLand,
      revExpand,
      revLicense,
      revenue,
      cost,
      result,
      cash,
      capacityFreeRevenue,
      revenuePerPerson: people > 0 ? revenue / people : 0,
      reachMultiple:
        landCustomers + partners > 0 ? (landCustomers + endCustomers) / (landCustomers + partners) : 1,
    });
  }

  return { months, summary: summarise(months, inputs, acv) };
}

function summarise(months: GrowthMonth[], inputs: GrowthInputs, acv: number): GrowthSummary {
  const last = months[months.length - 1];
  const first = months[0];

  let minCash = Infinity;
  let minCashMonth = 0;
  for (const r of months) {
    if (r.cash < minCash) {
      minCash = r.cash;
      minCashMonth = r.index;
    }
  }

  const breach = months.find((r) => r.cash < inputs.minCashBuffer);
  const breachMonth = breach ? breach.index : null;
  const startRaising = breachMonth != null ? breachMonth - inputs.fundraiseLeadMonths : null;

  return {
    revenueTotal: months.reduce((a, r) => a + r.revenue, 0),
    byMotion: {
      land: months.reduce((a, r) => a + r.revLand, 0),
      expand: months.reduce((a, r) => a + r.revExpand, 0),
      license: months.reduce((a, r) => a + r.revLicense, 0),
    },
    endRevenue: last.revenue,
    endCustomersServed: last.landCustomers + last.endCustomers,
    endReachMultiple: last.reachMultiple,
    leverageStart: first.revenuePerPerson,
    leverageEnd: last.revenuePerPerson,
    capacityFreeShare: last.revenue > 0 ? last.capacityFreeRevenue / last.revenue : 0,
    capital: {
      bootstrappable: breachMonth == null,
      minCash,
      minCashMonth,
      // Enough to never touch the buffer, rounded up to something askable.
      capitalNeeded: breachMonth == null ? 0 : Math.max(0, inputs.minCashBuffer - minCash),
      breachMonth,
      startRaisingMonth: startRaising,
      tooLate: startRaising != null && startRaising < 0,
    },
    /* What one sale is worth, by motion — the comparison that makes the
       multiplier concrete rather than rhetorical. */
    landDealValue: inputs.landPrice,
    expandAccountValue: acv,
    licenseDealValue: inputs.partnerFee + inputs.partnerReach * inputs.revPerEndCustomer,
  };
}

/* ── Counterfactuals ──────────────────────────────────────────
   The contribution of a motion is what disappears when you switch
   it off, which is not the same as the revenue booked against it:
   Expand feeds on Land, and License feeds both. */

export function motionContribution(inputs: GrowthInputs, motion: MotionKey): number {
  const full = computeGrowth(inputs).summary.revenueTotal;
  if (motion === "land") return full; // Land is the base; without it nothing exists
  const without = computeGrowth({
    ...inputs,
    ...(motion === "expand" ? { expandOn: false } : { licenseOn: false }),
  }).summary.revenueTotal;
  return full - without;
}

/** Where the plan lands with only Land switched on — the honest baseline. */
export function landOnlyBaseline(inputs: GrowthInputs): GrowthResult {
  return computeGrowth({ ...inputs, expandOn: false, licenseOn: false });
}

export const DEFAULT_GROWTH: GrowthInputs = {
  startMonth: "2026-09",
  months: 24,

  startCash: 25,
  fixedCosts: 2,
  founders: 2,
  founderDraw: 2.5,

  deliveryPerPerson: 1.5,
  hiringRate: 0.34,
  maxTeam: 6,
  costPerEmployee: 7,
  hireBuffer: 6,
  hireOnlyFromCash: true,

  landDeals: 2,
  landPrice: 12,
  landCost: 1.5,

  expandOn: true,
  expandRate: 0.35,
  expandLag: 4,
  expandMultiple: 4,
  expandGrowth: 0.015,
  expandEffort: 0.15,
  expandCostRate: 0.12,

  licenseOn: false,
  partnersPerMonth: 0.25,
  partnerFee: 20,
  partnerReach: 10,
  revPerEndCustomer: 6,
  partnerRamp: 5,
  partnerEffort: 0.4,
  endCustomerEffort: 0.02,

  fundraiseLeadMonths: 5,
  minCashBuffer: 0,
};

export function fmtK(k: number): string {
  if (!isFinite(k)) return "–";
  if (Math.abs(k) >= 1000) return `${(k / 1000).toFixed(k >= 10000 ? 1 : 2)} M€`;
  return `${Math.round(k).toLocaleString("en-GB")} k€`;
}
