/* ══════════════════════════════════════════════════════════════
   inplicit revenue plan — the whole model, as pure functions.

   Three revenue motions that feed each other:

     LAND        a new customer always starts with one paid pilot
                 campaign. One-off.
     EXPAND      a share of pilot customers converts to an annual
                 subscription after a lag; that base then grows on
                 its own as further departments come on.
     MULTIPLIER  channel partners licence the platform for their own
                 mandates, paying a licence plus a price per
                 interview — and send referrals back into the direct
                 funnel, which is the actual multiplier.

   Two things keep it honest: delivery capacity caps how many pilots
   can actually be run, and nothing is staffed before the financing
   month.

   No React, no DOM — see plan.test.ts.
   ══════════════════════════════════════════════════════════════ */

import { addMonths, horizon, monthLabel, parseMonth } from "../months.ts";

export { addMonths, horizon, monthLabel, parseMonth };

export type Phase = "bootstrap" | "funded";
export type CustomerType = "direct" | "channel";
export type Segment = "mittelstand" | "enterprise";

/** One named account. Overrides beat the modelled defaults. */
export type Customer = {
  id: string;
  name: string;
  type: CustomerType;
  segment: Segment;
  /** Month index into the horizon; null = not planned. */
  pilotMonth: number | null;
  /** k€. Overrides the automatic pilot price when set. */
  pilotRevenue: number | null;
  subMonth: number | null;
  /** k€ per year. Overrides the default ACV when set. */
  subACV: number | null;
  /** Whether this account's subscription grows at the expansion rate. */
  expand: boolean;
  note: string;
};

export type PlanInputs = {
  /* ── Horizon & phase ── */
  startMonth: string; // "YYYY-MM"
  months: number;
  /** Month index the round lands in. */
  fundingMonth: number;
  /** k€. */
  roundSize: number;
  /** k€ in the bank at the start. */
  startCash: number;

  /* ── Bootstrap phase ── */
  bootDemos: number;
  /** Pilots the founders can deliver per month, unaided. */
  founderCapacity: number;
  /** k€ per month. */
  bootFixed: number;
  /** k€ per founder per month. Shown, never charged to the company. */
  stipendPerFounder: number;
  founders: number;
  stipendMonths: number;

  /* ── After the round ── */
  postDemos: number;
  /** Pilots one employee can deliver per month. */
  campaignsPerEmployee: number;
  /** Hires per month once funded. */
  hiringRate: number;
  maxTeam: number;
  /** k€ per employee per month, fully loaded. */
  employerCost: number;
  /** k€ per founder per month, from the round onward. */
  founderSalary: number;
  /** k€ per month. */
  postFixed: number;

  /* ── Funnel ── */
  cvDemoToPilot: number; // 0..1
  lagDemoToPilot: number; // months
  cvPilotToSub: number; // 0..1
  lagPilotToSub: number; // months

  /* ── Prices ── */
  /** The first N pilots ever run get the design-partner price. */
  designPartners: number;
  pilotPriceDesign: number; // k€
  pilotPriceList: number; // k€
  subACV: number; // k€ per year
  /** Monthly growth of the installed subscription base. */
  expansionRate: number;

  /* ── Channel ── */
  partnerLicense: number; // k€ per year
  interviewsPerPartner: number; // per month at full ramp
  wholesalePerInterview: number; // €
  partnerRampMonths: number;
  referralDemosPerPartner: number; // per month at full ramp

  /* ── Unit costs ── */
  interviewsPerCampaign: number;
  interviewsPerSubMonth: number;
  costPerInterview: number; // €

  /* ── Motions ── */
  expandActive: boolean;
  channelActive: boolean;
};

export type PlanMonth = {
  index: number;
  /** "YYYY-MM". */
  key: string;
  /** "Aug 26". */
  label: string;
  phase: Phase;
  demos: number;
  /** Of those demos, the share that came from partner referrals. */
  referralDemos: number;
  employees: number;
  capacity: number;
  newPilots: number;
  newPilotsNamed: number;
  pilotsTotal: number;
  newSubs: number;
  subsTotal: number;
  partnersActive: number;
  revPilot: number;
  revSub: number;
  revChannel: number;
  revenue: number;
  interviews: number;
  costVariable: number;
  costPeople: number;
  costFixed: number;
  cost: number;
  result: number;
  cash: number;
  /** Round money landing this month, k€. */
  inflow: number;
  /** Names that started a pilot or a subscription this month. */
  events: string[];

  /* ── Leverage ──
     A motion is not another revenue line, it is a different relationship
     between effort and revenue. Only pilots consume a delivery slot; the
     subscription base and the partners' own campaigns do not. These three
     numbers are what make that visible. */
  people: number;
  /** k€ of revenue per person-month. Flat means you are selling your time. */
  revenuePerPerson: number;
  /** Revenue that consumed no campaign slot this month. */
  capacityFreeRevenue: number;
  /** Campaign-equivalents the partners ran for their own clients. */
  partnerCampaigns: number;
  /** Campaigns delivered in our name and theirs, over the ones we delivered. */
  reachMultiple: number;
};

export type PlanSummary = {
  /** Recurring only (subscription + channel), annualised. k€. */
  arr: number;
  /** Last month's total revenue annualised — includes one-off pilots. k€. */
  runRate: number;
  customersTotal: number;
  subsTotal: number;
  partners: number;
  /** 0..1 over the whole horizon. */
  grossMargin: number;
  endCash: number;
  /** First month that is profitable and stays profitable to the end, or null. */
  breakEvenMonth: number | null;
  /** Month index cash first goes negative, or null. */
  cashOutMonth: number | null;
  revenueTotal: number;
  costTotal: number;
  /** Share of planned pilots that are on the named list, 0..1. */
  namedCoverage: number;
  pilotsNamed: number;
  pilotsPlanned: number;

  /* ── Leverage ── */
  /** k€ of revenue per person-month, first month against last. */
  leverageStart: number;
  leverageEnd: number;
  /** Share of the last month's revenue that took no campaign slot. */
  capacityFreeShare: number;
  /** Campaign-equivalents delivered through partners over the horizon. */
  partnerCampaignsTotal: number;
  /** Campaigns we ran ourselves over the horizon. */
  ownCampaignsTotal: number;
};

export type PlanResult = {
  months: PlanMonth[];
  summary: PlanSummary;
};

/* ── The model ───────────────────────────────────────────────── */

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Partner ramp: a partner reaching full volume over `rampMonths`, linearly,
 * counting the start month as the first step. rampMonths <= 1 means instant.
 */
export function partnerRamp(monthsActive: number, rampMonths: number): number {
  if (monthsActive < 0) return 0;
  if (rampMonths <= 1) return 1;
  return clamp01((monthsActive + 1) / rampMonths);
}

/**
 * Price of the n-th pilot ever run (1-based). The first `designPartners`
 * pilots are discounted; this follows from the order alone, never from a
 * manual flag.
 */
export function pilotPrice(ordinal: number, inputs: PlanInputs): number {
  return ordinal <= inputs.designPartners ? inputs.pilotPriceDesign : inputs.pilotPriceList;
}

export function computePlan(inputs: PlanInputs, customers: Customer[]): PlanResult {
  const n = Math.max(1, Math.round(inputs.months));
  const months: PlanMonth[] = [];

  /* Named accounts, bucketed by the month they land in. Channel partners are
     a separate motion: their "pilot month" starts the partnership. */
  const namedPilots: Customer[][] = Array.from({ length: n }, () => []);
  const namedSubs: Customer[][] = Array.from({ length: n }, () => []);
  const partners: Customer[] = [];
  for (const c of customers) {
    if (c.type === "channel") {
      if (c.pilotMonth != null && c.pilotMonth >= 0 && c.pilotMonth < n) partners.push(c);
      continue;
    }
    if (c.pilotMonth != null && c.pilotMonth >= 0 && c.pilotMonth < n) namedPilots[c.pilotMonth].push(c);
    if (c.subMonth != null && c.subMonth >= 0 && c.subMonth < n) namedSubs[c.subMonth].push(c);
  }

  /* Running state. Fractional demand is carried in accumulators so a 0.4
     doesn't silently vanish each month. */
  let pilotPipeline = 0;
  let subPipeline = 0;
  let pilotsTotal = 0;
  let subsTotal = 0;
  let pilotOrdinal = 0; // pilots ever run, for the design-partner window
  let subMrrExpanding = 0; // k€/month, grows at the expansion rate
  let subMrrFlat = 0; // k€/month, named accounts with expand off
  let cash = inputs.startCash;

  /* Pilots started per month, so the pilot→subscription lag can look back.
     Only funnel pilots feed it: named accounts carry their own sub month. */
  const funnelPilotsByMonth: number[] = [];
  const demosByMonth: number[] = [];

  for (let m = 0; m < n; m++) {
    const key = addMonths(inputs.startMonth, m);
    const funded = m >= inputs.fundingMonth;
    const phase: Phase = funded ? "funded" : "bootstrap";

    /* ── Team and delivery capacity ──
       Nothing is staffed before the round: the founders live on the stipend
       and carry the whole delivery load themselves. */
    const monthsFunded = funded ? m - inputs.fundingMonth : 0;
    const employees = funded ? Math.min(inputs.maxTeam, Math.floor(inputs.hiringRate * monthsFunded)) : 0;
    const capacity = inputs.founderCapacity + employees * inputs.campaignsPerEmployee;

    /* ── Channel ──
       Each partner ramps from its own start month. */
    let partnersActive = 0;
    let partnerInterviews = 0;
    let referralDemos = 0;
    let revChannel = 0;
    if (inputs.channelActive) {
      for (const p of partners) {
        const start = p.pilotMonth!;
        if (m < start) continue;
        partnersActive++;
        const ramp = partnerRamp(m - start, inputs.partnerRampMonths);
        partnerInterviews += inputs.interviewsPerPartner * ramp;
        referralDemos += inputs.referralDemosPerPartner * ramp;
        revChannel += inputs.partnerLicense / 12;
        revChannel += (inputs.interviewsPerPartner * ramp * inputs.wholesalePerInterview) / 1000;
        // An optional one-off onboarding fee, booked in the start month.
        if (m === start && p.pilotRevenue != null) revChannel += p.pilotRevenue;
      }
    }

    /* ── Demand ── */
    const baseDemos = funded ? inputs.postDemos : inputs.bootDemos;
    const demos = baseDemos + referralDemos;
    demosByMonth[m] = demos;

    /* Demo → pilot, with the lag. */
    const srcDemo = m - Math.round(inputs.lagDemoToPilot);
    if (srcDemo >= 0) pilotPipeline += demosByMonth[srcDemo] * inputs.cvDemoToPilot;
    const funnelReady = Math.floor(pilotPipeline);

    /* Named accounts always land — you already know they are coming. The
       funnel then fills whatever capacity is left over. */
    const named = namedPilots[m].length;
    const newPilots = Math.max(named, Math.min(funnelReady + named, capacity));
    const fromFunnel = Math.max(0, newPilots - named);
    pilotPipeline -= fromFunnel; // the rest stays in the pipeline for next month

    funnelPilotsByMonth[m] = fromFunnel;

    /* ── Pilot revenue ──
       Named accounts take their ordinal first, then the funnel ones. An
       explicit pilot price overrides the window but still uses up a slot. */
    let revPilot = 0;
    const events: string[] = [];
    for (const c of namedPilots[m]) {
      pilotOrdinal++;
      revPilot += c.pilotRevenue != null ? c.pilotRevenue : pilotPrice(pilotOrdinal, inputs);
      events.push(c.name);
    }
    for (let i = 0; i < fromFunnel; i++) {
      pilotOrdinal++;
      revPilot += pilotPrice(pilotOrdinal, inputs);
    }
    pilotsTotal += newPilots;

    /* ── Expand ── */
    let newSubs = 0;
    let revSub = 0;
    if (inputs.expandActive) {
      // The installed base grows before this month's additions are counted.
      subMrrExpanding *= 1 + inputs.expansionRate;

      const srcPilot = m - Math.round(inputs.lagPilotToSub);
      if (srcPilot >= 0) subPipeline += (funnelPilotsByMonth[srcPilot] ?? 0) * inputs.cvPilotToSub;
      const funnelSubs = Math.floor(subPipeline);
      subPipeline -= funnelSubs;

      subMrrExpanding += (funnelSubs * inputs.subACV) / 12;
      newSubs += funnelSubs;

      for (const c of namedSubs[m]) {
        const acv = c.subACV != null ? c.subACV : inputs.subACV;
        if (c.expand) subMrrExpanding += acv / 12;
        else subMrrFlat += acv / 12;
        newSubs++;
        events.push(`${c.name} → Abo`);
      }
      subsTotal += newSubs;
      revSub = subMrrExpanding + subMrrFlat;
    }

    /* ── Costs ──
       Interviews are the only variable cost: the pilots run this month, the
       ongoing subscription work, and whatever the partners consume. */
    const interviews =
      newPilots * inputs.interviewsPerCampaign +
      subsTotal * inputs.interviewsPerSubMonth +
      partnerInterviews;
    const costVariable = (interviews * inputs.costPerInterview) / 1000;
    // The stipend deliberately never lands here — it is the founders' income,
    // not a company cost.
    const costPeople = funded ? employees * inputs.employerCost + inputs.founders * inputs.founderSalary : 0;
    const costFixed = funded ? inputs.postFixed : inputs.bootFixed;
    const cost = costVariable + costPeople + costFixed;

    const people = inputs.founders + employees;
    /* What the partners delivered to their own clients, expressed in the same
       unit as our own campaigns so the two are comparable. */
    const partnerCampaigns =
      inputs.interviewsPerCampaign > 0 ? partnerInterviews / inputs.interviewsPerCampaign : 0;

    const revenue = revPilot + revSub + revChannel;
    const result = revenue - cost;
    const inflow = m === inputs.fundingMonth ? inputs.roundSize : 0;
    cash += result + inflow;

    months.push({
      index: m,
      key,
      label: monthLabel(key),
      phase,
      demos,
      referralDemos,
      employees,
      capacity,
      newPilots,
      newPilotsNamed: named,
      pilotsTotal,
      newSubs,
      subsTotal,
      partnersActive,
      revPilot,
      revSub,
      revChannel,
      revenue,
      interviews,
      costVariable,
      costPeople,
      costFixed,
      cost,
      result,
      cash,
      inflow,
      events,

      people,
      revenuePerPerson: people > 0 ? revenue / people : 0,
      // The subscription base and the channel both earn without taking a
      // campaign slot off the founders or the team.
      capacityFreeRevenue: revSub + revChannel,
      partnerCampaigns,
      reachMultiple: newPilots > 0 ? (newPilots + partnerCampaigns) / newPilots : 1,
    });
  }

  return { months, summary: summarise(months) };
}

function summarise(months: PlanMonth[]): PlanSummary {
  const last = months[months.length - 1];
  const revenueTotal = months.reduce((a, r) => a + r.revenue, 0);
  const costTotal = months.reduce((a, r) => a + r.cost, 0);
  const variableTotal = months.reduce((a, r) => a + r.costVariable, 0);
  const pilotsNamed = months.reduce((a, r) => a + r.newPilotsNamed, 0);
  const pilotsPlanned = months.reduce((a, r) => a + r.newPilots, 0);

  /* Break-even is the month it turns positive *and stays* positive — a single
     good month in the bootstrap phase, where one pilot fee beats the fixed
     costs, is not a company that has broken even. */
  let breakEvenMonth: number | null = null;
  for (let i = months.length - 1; i >= 0; i--) {
    if (months[i].result > 0) breakEvenMonth = i;
    else break;
  }
  const cashOut = months.find((r) => r.cash < 0);

  return {
    /* ARR counts recurring money only. The pilot fee is a one-off, so
       folding it in would overstate the base the next round is priced on. */
    arr: (last.revSub + last.revChannel) * 12,
    runRate: last.revenue * 12,
    customersTotal: last.pilotsTotal,
    subsTotal: last.subsTotal,
    partners: last.partnersActive,
    grossMargin: revenueTotal > 0 ? (revenueTotal - variableTotal) / revenueTotal : 0,
    endCash: last.cash,
    breakEvenMonth,
    cashOutMonth: cashOut ? cashOut.index : null,
    revenueTotal,
    costTotal,
    namedCoverage: pilotsPlanned > 0 ? pilotsNamed / pilotsPlanned : 0,
    pilotsNamed,
    pilotsPlanned,

    leverageStart: months[0].revenuePerPerson,
    leverageEnd: last.revenuePerPerson,
    capacityFreeShare: last.revenue > 0 ? last.capacityFreeRevenue / last.revenue : 0,
    partnerCampaignsTotal: months.reduce((a, r) => a + r.partnerCampaigns, 0),
    ownCampaignsTotal: pilotsPlanned,
  };
}

/* ── Reverse question: what conversion rate reaches a target ARR? ──
   Bisection on cvDemoToPilot, since ARR is monotonic in it. Returns null
   when the target is out of reach even at 100%. */
export function conversionForTargetARR(
  inputs: PlanInputs,
  customers: Customer[],
  targetARR: number,
): number | null {
  const arrAt = (cv: number) => computePlan({ ...inputs, cvDemoToPilot: cv }, customers).summary.arr;
  if (arrAt(1) < targetARR) return null;
  if (arrAt(0) >= targetARR) return 0;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (arrAt(mid) >= targetARR) hi = mid;
    else lo = mid;
  }
  return hi;
}

/* ── Defaults ──────────────────────────────────────────────────
   Placeholders, not benchmarks. Nothing here is measured — they are
   plausible starting values chosen so the mechanics are visible on
   first open, and every one of them is meant to be overwritten with
   what you actually know. The conversion rates in particular are the
   numbers a plan lives or dies on.
   ────────────────────────────────────────────────────────────── */

export const DEFAULT_INPUTS: PlanInputs = {
  startMonth: "2026-08",
  months: 17,
  fundingMonth: 6, // Feb 27
  roundSize: 1200,
  startCash: 40,

  bootDemos: 8,
  founderCapacity: 2,
  bootFixed: 2.5,
  stipendPerFounder: 3,
  founders: 2,
  stipendMonths: 12,

  postDemos: 20,
  campaignsPerEmployee: 2,
  hiringRate: 0.5,
  maxTeam: 8,
  employerCost: 7.5,
  founderSalary: 5.5,
  postFixed: 6,

  cvDemoToPilot: 0.15,
  lagDemoToPilot: 1,
  cvPilotToSub: 0.35,
  lagPilotToSub: 3,

  designPartners: 5,
  pilotPriceDesign: 9,
  pilotPriceList: 18,
  subACV: 36,
  expansionRate: 0.02,

  partnerLicense: 24,
  interviewsPerPartner: 25,
  wholesalePerInterview: 140,
  partnerRampMonths: 4,
  referralDemosPerPartner: 1.5,

  interviewsPerCampaign: 12,
  interviewsPerSubMonth: 4,
  costPerInterview: 45,

  expandActive: true,
  channelActive: true,
};

let seq = 0;
export function newCustomer(partial: Partial<Customer> = {}): Customer {
  seq++;
  return {
    id: `c${Date.now().toString(36)}${seq.toString(36)}`,
    name: "",
    type: "direct",
    segment: "mittelstand",
    pilotMonth: null,
    pilotRevenue: null,
    subMonth: null,
    subACV: null,
    expand: true,
    note: "",
    ...partial,
  };
}

/* ── Formatting ──────────────────────────────────────────────── */

/** k€ with a thousands separator, or M€ once it gets long. */
export function fmtK(k: number): string {
  if (!isFinite(k)) return "–";
  if (Math.abs(k) >= 1000) return `${(k / 1000).toFixed(k >= 10000 ? 1 : 2)} M€`;
  return `${Math.round(k).toLocaleString("de-DE")} k€`;
}

export function fmtPct(x: number, digits = 0): string {
  return `${(x * 100).toFixed(digits)} %`;
}
