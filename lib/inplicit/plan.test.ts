/* Tests for the revenue model. Run with Node's own runner and type
   stripping — no test framework, no build step:

     node --test lib/inplicit/plan.test.ts
*/

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_INPUTS,
  addMonths,
  computePlan,
  conversionForTargetARR,
  monthLabel,
  newCustomer,
  partnerRamp,
  pilotPrice,
  type Customer,
  type PlanInputs,
} from "./plan.ts";

/** A deliberately inert baseline: no funnel, no motions, no costs. Each test
    switches on only the one mechanism it is about. */
const QUIET: PlanInputs = {
  ...DEFAULT_INPUTS,
  months: 12,
  fundingMonth: 99,
  startCash: 0,
  roundSize: 0,
  bootDemos: 0,
  postDemos: 0,
  bootFixed: 0,
  postFixed: 0,
  founderCapacity: 100,
  cvDemoToPilot: 0,
  cvPilotToSub: 0,
  expansionRate: 0,
  costPerInterview: 0,
  expandActive: false,
  channelActive: false,
};

const direct = (over: Partial<Customer> = {}) => newCustomer({ type: "direct", ...over });
const channel = (over: Partial<Customer> = {}) => newCustomer({ type: "channel", ...over });

/* ── Horizon ─────────────────────────────────────────────────── */

test("month arithmetic rolls over the year", () => {
  assert.equal(addMonths("2026-08", 0), "2026-08");
  assert.equal(addMonths("2026-08", 5), "2027-01");
  assert.equal(addMonths("2026-08", 17), "2028-01");
  assert.equal(monthLabel("2026-08"), "Aug 26");
  assert.equal(monthLabel("2027-12"), "Dec 27");
});

/* ── Design-partner price window ─────────────────────────────── */

test("the first N pilots get the design-partner price, the rest list", () => {
  const inputs = { ...QUIET, designPartners: 3, pilotPriceDesign: 9, pilotPriceList: 18 };
  assert.equal(pilotPrice(1, inputs), 9);
  assert.equal(pilotPrice(3, inputs), 9);
  assert.equal(pilotPrice(4, inputs), 18);
});

test("the discount window follows from the order, across months", () => {
  const inputs = { ...QUIET, designPartners: 2, pilotPriceDesign: 9, pilotPriceList: 18 };
  const customers = [0, 1, 2, 3].map((m) => direct({ name: `C${m}`, pilotMonth: m }));
  const { months } = computePlan(inputs, customers);
  assert.deepEqual(months.slice(0, 4).map((r) => r.revPilot), [9, 9, 18, 18]);
});

test("a named pilot revenue overrides the price but still uses a slot", () => {
  const inputs = { ...QUIET, designPartners: 2, pilotPriceDesign: 9, pilotPriceList: 18 };
  const customers = [
    direct({ name: "Override", pilotMonth: 0, pilotRevenue: 42 }),
    direct({ name: "Second", pilotMonth: 1 }),
    direct({ name: "Third", pilotMonth: 2 }),
  ];
  const { months } = computePlan(inputs, customers);
  // Slot 1 is used by the override, so the window is spent after the second.
  assert.deepEqual(months.slice(0, 3).map((r) => r.revPilot), [42, 9, 18]);
});

/* Acceptance criterion 5. */
test("a named customer lands in exactly its month for exactly its amount", () => {
  const customers = [direct({ name: "Kammer", pilotMonth: 4, pilotRevenue: 27.5 })];
  const { months } = computePlan({ ...QUIET }, customers);
  assert.equal(months[4].revPilot, 27.5);
  assert.equal(months[4].newPilots, 1);
  assert.equal(months[4].newPilotsNamed, 1);
  assert.ok(months[4].events.includes("Kammer"));
  assert.equal(months.filter((r) => r.revPilot !== 0).length, 1);
});

/* ── Funnel lags ─────────────────────────────────────────────── */

test("demo→pilot conversion arrives after the lag, not before", () => {
  const inputs = { ...QUIET, bootDemos: 4, cvDemoToPilot: 0.5, lagDemoToPilot: 2 };
  const { months } = computePlan(inputs, []);
  // 4 demos × 0.5 = 2 pilots, first visible two months after the demos.
  assert.equal(months[0].newPilots, 0);
  assert.equal(months[1].newPilots, 0);
  assert.equal(months[2].newPilots, 2);
  assert.equal(months[3].newPilots, 2);
});

test("fractional funnel demand accumulates instead of being lost", () => {
  const inputs = { ...QUIET, bootDemos: 1, cvDemoToPilot: 0.5, lagDemoToPilot: 0 };
  const { months } = computePlan(inputs, []);
  // 0.5 per month: a whole customer every second month, none dropped.
  assert.deepEqual(months.slice(0, 4).map((r) => r.newPilots), [0, 1, 0, 1]);
});

test("pilot→subscription conversion arrives after its own lag", () => {
  const inputs = {
    ...QUIET,
    bootDemos: 4,
    cvDemoToPilot: 0.5,
    lagDemoToPilot: 0,
    cvPilotToSub: 0.5,
    lagPilotToSub: 3,
    subACV: 24,
    expandActive: true,
  };
  const { months } = computePlan(inputs, []);
  assert.equal(months[0].newPilots, 2);
  assert.equal(months[2].newSubs, 0);
  assert.equal(months[3].newSubs, 1); // 2 pilots × 0.5, three months later
  assert.equal(months[3].revSub, 2); // 24 k€ ACV / 12
});

/* ── Delivery capacity ───────────────────────────────────────── */

test("delivery capacity caps the funnel", () => {
  const inputs = { ...QUIET, bootDemos: 20, cvDemoToPilot: 1, lagDemoToPilot: 0, founderCapacity: 3 };
  const { months } = computePlan(inputs, []);
  assert.equal(months[0].capacity, 3);
  assert.equal(months[0].newPilots, 3);
  // The overflow is not thrown away — it is still in the pipeline.
  assert.equal(months[1].newPilots, 3);
});

test("named accounts land even when they exceed capacity", () => {
  const inputs = { ...QUIET, founderCapacity: 1 };
  const customers = [0, 0, 0].map((m, i) => direct({ name: `N${i}`, pilotMonth: m }));
  const { months } = computePlan(inputs, customers);
  assert.equal(months[0].newPilots, 3);
  assert.equal(months[0].newPilotsNamed, 3);
});

test("the funnel only fills the capacity the named accounts leave", () => {
  const inputs = { ...QUIET, bootDemos: 10, cvDemoToPilot: 1, lagDemoToPilot: 0, founderCapacity: 4 };
  const customers = [direct({ name: "A", pilotMonth: 0 }), direct({ name: "B", pilotMonth: 0 })];
  const { months } = computePlan(inputs, customers);
  // 4 capacity − 2 named = 2 from the funnel, so nothing double-counts.
  assert.equal(months[0].newPilots, 4);
  assert.equal(months[0].newPilotsNamed, 2);
});

/* ── Channel ─────────────────────────────────────────────────── */

test("the partner ramp is linear and saturates at one", () => {
  assert.equal(partnerRamp(0, 4), 0.25);
  assert.equal(partnerRamp(3, 4), 1);
  assert.equal(partnerRamp(9, 4), 1);
  assert.equal(partnerRamp(0, 1), 1);
});

test("channel revenue ramps and referrals feed the direct funnel", () => {
  const inputs = {
    ...QUIET,
    channelActive: true,
    partnerLicense: 12, // → 1 k€/month
    interviewsPerPartner: 10,
    wholesalePerInterview: 100, // → 1 k€ per month at full ramp
    partnerRampMonths: 2,
    referralDemosPerPartner: 4,
    cvDemoToPilot: 1,
    lagDemoToPilot: 0,
  };
  const { months } = computePlan(inputs, [channel({ name: "Kammer", pilotMonth: 0 })]);
  assert.equal(months[0].partnersActive, 1);
  assert.equal(months[0].revChannel, 1 + 0.5); // licence + half-ramped wholesale
  assert.equal(months[1].revChannel, 1 + 1);
  // Referral demos are the multiplier: they become direct pilots.
  assert.equal(months[0].referralDemos, 2);
  assert.equal(months[0].newPilots, 2);
  assert.equal(months[1].referralDemos, 4);
});

test("a partner's one-off fee is booked once, in its start month", () => {
  const inputs = { ...QUIET, channelActive: true, partnerLicense: 0, interviewsPerPartner: 0, referralDemosPerPartner: 0 };
  const { months } = computePlan(inputs, [channel({ name: "Partner", pilotMonth: 2, pilotRevenue: 15 })]);
  assert.equal(months[2].revChannel, 15);
  assert.equal(months[3].revChannel, 0);
  // A channel partner is not a pilot customer.
  assert.equal(months[2].newPilots, 0);
});

/* ── Toggles (acceptance criterion 4) ────────────────────────── */

test("expand off zeroes subscription revenue only", () => {
  const base = { ...DEFAULT_INPUTS, months: 17 };
  const on = computePlan(base, [direct({ name: "A", pilotMonth: 0, subMonth: 3 })]);
  const off = computePlan({ ...base, expandActive: false }, [direct({ name: "A", pilotMonth: 0, subMonth: 3 })]);
  assert.ok(on.months[6].revSub > 0);
  assert.equal(off.months.reduce((a, r) => a + r.revSub, 0), 0);
  assert.ok(off.months.reduce((a, r) => a + r.revPilot, 0) > 0);
});

test("channel off zeroes licence, wholesale and the referral demos", () => {
  const base = { ...DEFAULT_INPUTS, months: 12 };
  const cs = [channel({ name: "Kammer", pilotMonth: 0 })];
  const on = computePlan(base, cs);
  const off = computePlan({ ...base, channelActive: false }, cs);
  assert.ok(on.months[5].revChannel > 0);
  assert.ok(on.months[5].referralDemos > 0);
  assert.equal(off.months.reduce((a, r) => a + r.revChannel, 0), 0);
  assert.equal(off.months.reduce((a, r) => a + r.referralDemos, 0), 0);
  assert.equal(off.months[5].partnersActive, 0);
});

/* ── Expansion ───────────────────────────────────────────────── */

test("the installed base grows at the expansion rate", () => {
  const inputs = { ...QUIET, expandActive: true, expansionRate: 0.1, subACV: 120 };
  const { months } = computePlan(inputs, [direct({ name: "A", pilotMonth: 0, subMonth: 0, expand: true })]);
  assert.equal(months[0].revSub, 10); // 120 / 12
  assert.equal(round2(months[1].revSub), 11); // +10 %
  assert.equal(round2(months[2].revSub), 12.1);
});

test("an account with expand off keeps a flat subscription", () => {
  const inputs = { ...QUIET, expandActive: true, expansionRate: 0.1, subACV: 120 };
  const { months } = computePlan(inputs, [direct({ name: "A", pilotMonth: 0, subMonth: 0, expand: false })]);
  assert.equal(months[0].revSub, 10);
  assert.equal(months[3].revSub, 10);
});

test("a named ACV overrides the default", () => {
  const inputs = { ...QUIET, expandActive: true, subACV: 36 };
  const { months } = computePlan(inputs, [direct({ name: "A", pilotMonth: 0, subMonth: 0, subACV: 60, expand: false })]);
  assert.equal(months[0].revSub, 5); // 60 / 12, not 3
});

/* ── Phase switch at the round ───────────────────────────────── */

test("nothing is staffed or salaried before the financing month", () => {
  const inputs: PlanInputs = {
    ...QUIET,
    fundingMonth: 4,
    roundSize: 1000,
    bootFixed: 2,
    postFixed: 6,
    hiringRate: 1,
    maxTeam: 3,
    employerCost: 8,
    founderSalary: 5,
    founders: 2,
    stipendPerFounder: 3,
  };
  const { months } = computePlan(inputs, []);

  assert.equal(months[3].employees, 0);
  assert.equal(months[3].costPeople, 0); // the stipend never loads the company
  assert.equal(months[3].cost, 2);
  assert.equal(months[3].phase, "bootstrap");

  assert.equal(months[4].phase, "funded");
  assert.equal(months[4].employees, 0); // the money lands before anyone starts
  assert.equal(months[4].costPeople, 10); // two founders on salary
  assert.equal(months[4].inflow, 1000);

  assert.equal(months[5].employees, 1);
  assert.equal(months[5].costPeople, 8 + 10);
  assert.equal(months[8].employees, 3); // capped at maxTeam
  assert.equal(months[9].employees, 3);
});

test("capacity grows with the team after the round", () => {
  const inputs = { ...QUIET, fundingMonth: 0, founderCapacity: 2, campaignsPerEmployee: 3, hiringRate: 1, maxTeam: 2 };
  const { months } = computePlan(inputs, []);
  assert.equal(months[0].capacity, 2);
  assert.equal(months[1].capacity, 5);
  assert.equal(months[2].capacity, 8);
  assert.equal(months[3].capacity, 8);
});

test("the round lands in cash exactly once", () => {
  const inputs = { ...QUIET, fundingMonth: 2, roundSize: 500, startCash: 30, founderSalary: 0 };
  const { months } = computePlan(inputs, []);
  assert.equal(months[1].cash, 30);
  assert.equal(months[2].cash, 530);
  assert.equal(months[3].cash, 530);
});

/* ── Unit costs and summary ──────────────────────────────────── */

test("interview costs follow pilots, subscriptions and partners", () => {
  const inputs = {
    ...QUIET,
    expandActive: true,
    interviewsPerCampaign: 10,
    interviewsPerSubMonth: 2,
    costPerInterview: 50,
    channelActive: true,
    interviewsPerPartner: 4,
    partnerRampMonths: 1,
    referralDemosPerPartner: 0,
    partnerLicense: 0,
    wholesalePerInterview: 0,
  };
  const cs = [direct({ name: "A", pilotMonth: 0, subMonth: 0 }), channel({ name: "P", pilotMonth: 0 })];
  const { months } = computePlan(inputs, cs);
  // 10 pilot + 2 subscription + 4 partner = 16 interviews at 50 € = 0.8 k€
  assert.equal(months[0].interviews, 16);
  assert.equal(round2(months[0].costVariable), 0.8);
  assert.equal(months[1].interviews, 6); // no new pilot, subscription + partner only
});

/* Acceptance criterion 6. */
test("the summary agrees with the monthly rows", () => {
  const { months, summary } = computePlan(DEFAULT_INPUTS, [
    direct({ name: "A", pilotMonth: 0, subMonth: 3 }),
    channel({ name: "P", pilotMonth: 1 }),
  ]);
  const last = months[months.length - 1];
  assert.equal(round2(summary.revenueTotal), round2(months.reduce((a, r) => a + r.revenue, 0)));
  assert.equal(round2(summary.costTotal), round2(months.reduce((a, r) => a + r.cost, 0)));
  assert.equal(summary.endCash, last.cash);
  assert.equal(summary.customersTotal, last.pilotsTotal);
  assert.equal(summary.subsTotal, last.subsTotal);
  assert.equal(summary.partners, last.partnersActive);
  assert.equal(round2(summary.arr), round2((last.revSub + last.revChannel) * 12));
  assert.equal(round2(summary.runRate), round2(last.revenue * 12));
  // Every month's revenue is the sum of its three motions.
  for (const r of months) assert.equal(round2(r.revenue), round2(r.revPilot + r.revSub + r.revChannel));
});

test("break-even ignores a profitable blip and reports the sustained turn", () => {
  // Month 0 is profitable on one pilot fee, then the round brings salaries and
  // it goes negative before recovering for good in month 4.
  const inputs = { ...QUIET, months: 6, fundingMonth: 1, founderSalary: 20, founders: 1, bootFixed: 1 };
  const cs = [
    direct({ name: "Blip", pilotMonth: 0, pilotRevenue: 50 }),
    direct({ name: "Late1", pilotMonth: 4, pilotRevenue: 50 }),
    direct({ name: "Late2", pilotMonth: 5, pilotRevenue: 50 }),
  ];
  const { months, summary } = computePlan(inputs, cs);
  assert.ok(months[0].result > 0, "month 0 is the blip");
  assert.ok(months[1].result < 0, "month 1 dips");
  assert.equal(summary.breakEvenMonth, 4);
});

test("break-even is null when the last month is still negative", () => {
  const inputs = { ...QUIET, months: 4, fundingMonth: 0, founderSalary: 20, founders: 1 };
  const { summary } = computePlan(inputs, [direct({ name: "A", pilotMonth: 0, pilotRevenue: 50 })]);
  assert.equal(summary.breakEvenMonth, null);
});

test("named coverage is the share of planned pilots that have a name", () => {
  const inputs = { ...QUIET, bootDemos: 2, cvDemoToPilot: 1, lagDemoToPilot: 0, months: 2, founderCapacity: 10 };
  const { summary } = computePlan(inputs, [direct({ name: "A", pilotMonth: 0 })]);
  // Month 0: 1 named + 2 funnel, month 1: 2 funnel → 1 of 5.
  assert.equal(summary.pilotsNamed, 1);
  assert.equal(summary.pilotsPlanned, 5);
  assert.equal(summary.namedCoverage, 0.2);
});

test("full coverage when every pilot is named", () => {
  const { summary } = computePlan({ ...QUIET }, [direct({ name: "A", pilotMonth: 0 })]);
  assert.equal(summary.namedCoverage, 1);
});

/* ── Leverage ────────────────────────────────────────────────── */

test("pilots alone keep revenue per head flat; the abo base lifts it", () => {
  // No discount window, so the only thing that could move the ratio is a
  // motion rather than the price stepping up off the design-partner rate.
  const pilotsOnly = {
    ...QUIET,
    bootDemos: 4,
    cvDemoToPilot: 0.5,
    lagDemoToPilot: 0,
    months: 18,
    designPartners: 0,
  };
  const flat = computePlan(pilotsOnly, []);
  assert.equal(flat.summary.leverageStart, flat.summary.leverageEnd);

  const withAbo = computePlan(
    { ...pilotsOnly, expandActive: true, cvPilotToSub: 1, lagPilotToSub: 1, subACV: 60 },
    [],
  );
  assert.ok(
    withAbo.summary.leverageEnd > withAbo.summary.leverageStart * 2,
    `expected the base to lift revenue per head, got ${withAbo.summary.leverageStart} → ${withAbo.summary.leverageEnd}`,
  );
});

test("abo and channel revenue count as capacity-free, pilot revenue does not", () => {
  const onlyPilots = computePlan({ ...QUIET, bootDemos: 4, cvDemoToPilot: 0.5, lagDemoToPilot: 0 }, []);
  assert.equal(onlyPilots.summary.capacityFreeShare, 0);

  const withBoth = computePlan(
    { ...QUIET, expandActive: true, channelActive: true, partnerLicense: 120, interviewsPerPartner: 0 },
    [direct({ name: "A", pilotMonth: 0, subMonth: 0 }), channel({ name: "P", pilotMonth: 0 })],
  );
  assert.equal(withBoth.summary.capacityFreeShare, 1); // no new pilots in the last month
});

test("partner campaigns are counted in the same unit as our own", () => {
  const inputs = {
    ...QUIET,
    channelActive: true,
    interviewsPerPartner: 24,
    interviewsPerCampaign: 12,
    partnerRampMonths: 1,
    partnerLicense: 0,
    wholesalePerInterview: 0,
    referralDemosPerPartner: 0,
  };
  const { months } = computePlan(inputs, [channel({ name: "P", pilotMonth: 0 })]);
  // 24 interviews a month at 12 per campaign is two campaigns we never ran.
  assert.equal(months[0].partnerCampaigns, 2);
});

/* ── The reverse question ────────────────────────────────────── */

test("the conversion rate needed for a target ARR is found, or reported unreachable", () => {
  const inputs = { ...DEFAULT_INPUTS, months: 17 };
  const reachable = conversionForTargetARR(inputs, [], 300);
  assert.ok(reachable !== null && reachable > 0 && reachable <= 1);
  const got = computePlan({ ...inputs, cvDemoToPilot: reachable! }, []).summary.arr;
  assert.ok(got >= 300 - 1, `expected ≥300, got ${got}`);
  assert.equal(conversionForTargetARR(inputs, [], 1e9), null);
});

const round2 = (n: number) => Math.round(n * 100) / 100;
