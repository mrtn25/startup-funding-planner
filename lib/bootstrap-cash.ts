/* ══════════════════════════════════════════════════════════════
   Does the plan run dry, and if so, when and by how much.

   Deliberately free of any opinion about how revenue arrives. An
   earlier version modelled three named growth motions; that is one
   company's playbook, not a general truth, and baking it in told
   every other business that it was doing things wrong. What is
   general is the arithmetic: customers arrive at some rate, each is
   worth something per year, people cost money, and cash either lasts
   or it doesn't.

   Two constraints do the real work. Delivery capacity caps how many
   customers can actually be served, and hiring is gated twice — on
   demand actually being blocked, and on the money already existing.
   The second is what bootstrapping means.

   Pure functions, no DOM — see bootstrap-cash.test.ts.
   ══════════════════════════════════════════════════════════════ */

import { addMonths, monthLabel } from "./months.ts";

export type CashInputs = {
  startMonth: string;
  months: number;

  /* ── Starting position ── */
  startCash: number; // k€
  fixedCosts: number; // k€ per month
  founders: number;
  /** k€ per founder per month actually taken out. */
  founderDraw: number;

  /* ── Revenue ── */
  /** New customers in the first month. */
  startNewCustomers: number;
  /** Monthly growth of that rate. */
  acquisitionGrowth: number;
  /** What one customer is worth per year, k€. */
  revenuePerCustomer: number;
  /** Share of that which recurs. 1 = subscription, 0 = one-off project. */
  recurringShare: number;
  /** Share of customers lost per year. */
  churnPerYear: number;
  /** Variable cost of serving one customer for a year, k€. */
  costToServe: number;
  /** What winning one customer costs, k€. */
  cac: number;

  /* ── Capacity and hiring ── */
  /** Customers one person can carry. */
  customersPerPerson: number;
  hiringRate: number;
  maxTeam: number;
  costPerEmployee: number; // k€ per month
  /** Months of a hire's cost that must be in the bank first. */
  hireBuffer: number;
  /** The bootstrap constraint. */
  hireOnlyFromCash: boolean;

  /* ── The capital question ── */
  fundraiseLeadMonths: number;
  /** Cash you refuse to go below. */
  minCashBuffer: number;
};

export type CashMonth = {
  index: number;
  key: string;
  label: string;
  people: number;
  employees: number;
  capacity: number;
  newCustomers: number;
  customers: number;
  revenue: number;
  cost: number;
  result: number;
  cash: number;
  /** k€ of revenue per person-month. */
  revenuePerPerson: number;
};

export type CapitalVerdict = {
  bootstrappable: boolean;
  minCash: number;
  minCashMonth: number;
  capitalNeeded: number;
  breachMonth: number | null;
  startRaisingMonth: number | null;
  tooLate: boolean;
};

export type CashResult = {
  months: CashMonth[];
  revenueTotal: number;
  endRevenue: number;
  endCustomers: number;
  capital: CapitalVerdict;
  /** First month the result turns positive and stays positive, or null. */
  breakEvenMonth: number | null;
};

export function computeCash(i: CashInputs): CashResult {
  const n = Math.max(1, Math.round(i.months));
  const monthlyChurn = i.churnPerYear / 12;
  const months: CashMonth[] = [];

  let employees = 0;
  let hireCredit = 0;
  let customers = 0;
  let cash = i.startCash;

  for (let m = 0; m < n; m++) {
    const people = i.founders + employees;
    const capacity = people * i.customersPerPerson;

    const wanted = i.startNewCustomers * Math.pow(1 + i.acquisitionGrowth, m);
    const room = Math.max(0, capacity - customers);
    const newCustomers = Math.min(wanted, room);

    customers = customers * (1 - monthlyChurn) + newCustomers;

    /* Recurring revenue is carried by the whole base; the one-off part is
       earned once, by the customers who arrived this month. */
    const recurring = (customers * i.revenuePerCustomer * i.recurringShare) / 12;
    const oneOff = newCustomers * i.revenuePerCustomer * (1 - i.recurringShare);
    const revenue = recurring + oneOff;

    const variable = (customers * i.costToServe) / 12 + newCustomers * i.cac;
    const peopleCost = employees * i.costPerEmployee + i.founders * i.founderDraw;
    const cost = variable + peopleCost + i.fixedCosts;

    const result = revenue - cost;
    cash += result;

    /* Hire only when capacity is what is holding you back, and only when the
       money is already there. Hiring on a timer instead adds people with
       nothing to do, which drags revenue per person down and makes the plan
       look worse than it is. */
    const demandBlocked = wanted > room + 1e-9;
    if (employees < i.maxTeam && demandBlocked) {
      const affordable = !i.hireOnlyFromCash || cash >= i.costPerEmployee * i.hireBuffer;
      if (affordable) {
        hireCredit += i.hiringRate;
        const hires = Math.floor(hireCredit);
        hireCredit -= hires;
        employees = Math.min(i.maxTeam, employees + hires);
      }
    }

    const key = addMonths(i.startMonth, m);
    months.push({
      index: m,
      key,
      label: monthLabel(key),
      people,
      employees,
      capacity,
      newCustomers,
      customers,
      revenue,
      cost,
      result,
      cash,
      revenuePerPerson: people > 0 ? revenue / people : 0,
    });
  }

  let minCash = Infinity;
  let minCashMonth = 0;
  for (const r of months) {
    if (r.cash < minCash) {
      minCash = r.cash;
      minCashMonth = r.index;
    }
  }

  const breach = months.find((r) => r.cash < i.minCashBuffer);
  const breachMonth = breach ? breach.index : null;
  const startRaising = breachMonth != null ? breachMonth - i.fundraiseLeadMonths : null;

  /* Break-even is the month it turns positive and stays positive. A single
     good month early on is not a company that has broken even. */
  let breakEvenMonth: number | null = null;
  for (let k = months.length - 1; k >= 0; k--) {
    if (months[k].result > 0) breakEvenMonth = k;
    else break;
  }

  const last = months[months.length - 1];

  return {
    months,
    revenueTotal: months.reduce((a, r) => a + r.revenue, 0),
    endRevenue: last.revenue,
    endCustomers: last.customers,
    breakEvenMonth,
    capital: {
      bootstrappable: breachMonth == null,
      minCash,
      minCashMonth,
      capitalNeeded: breachMonth == null ? 0 : Math.max(0, i.minCashBuffer - minCash),
      breachMonth,
      startRaisingMonth: startRaising,
      tooLate: startRaising != null && startRaising < 0,
    },
  };
}

export const DEFAULT_CASH: CashInputs = {
  startMonth: "2026-09",
  months: 24,

  startCash: 25,
  fixedCosts: 2,
  founders: 2,
  founderDraw: 2.5,

  startNewCustomers: 1,
  acquisitionGrowth: 0.06,
  revenuePerCustomer: 24,
  recurringShare: 0.6,
  churnPerYear: 0.2,
  costToServe: 3,
  cac: 4,

  customersPerPerson: 12,
  hiringRate: 0.34,
  maxTeam: 6,
  costPerEmployee: 7,
  hireBuffer: 6,
  hireOnlyFromCash: true,

  fundraiseLeadMonths: 5,
  minCashBuffer: 0,
};

export function fmtK(k: number): string {
  if (!isFinite(k)) return "–";
  if (Math.abs(k) >= 1000) return `${(k / 1000).toFixed(k >= 10000 ? 1 : 2)} M€`;
  return `${Math.round(k).toLocaleString("en-GB")} k€`;
}
