/* Tests for the growth-motion engine.
     node --test lib/growth-motions.test.ts
*/

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_GROWTH,
  computeGrowth,
  landOnlyBaseline,
  motionContribution,
  type GrowthInputs,
} from "./growth-motions.ts";

/** A fixed team with no hiring, so capacity is a constant and the effect of
    each motion on the effort↔revenue link is visible on its own. */
const FIXED: GrowthInputs = {
  ...DEFAULT_GROWTH,
  months: 24,
  startCash: 1000,
  fixedCosts: 0,
  founders: 1,
  founderDraw: 0,
  deliveryPerPerson: 2,
  hiringRate: 0,
  maxTeam: 0,
  hireOnlyFromCash: false,
  landDeals: 2,
  landPrice: 10,
  landCost: 0,
  expandOn: false,
  licenseOn: false,
  expandCostRate: 0,
  expandGrowth: 0,
  expandEffort: 0,
  partnerEffort: 0,
  endCustomerEffort: 0,
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/* ── Land is linear, and stops where the people stop ─────────── */

test("land revenue is flat when capacity and deal flow are flat", () => {
  const { months } = computeGrowth(FIXED);
  assert.equal(months[0].revenue, 20); // 2 deals × 10 k€
  assert.equal(months[23].revenue, 20);
  // The defining property: revenue per person-month never moves.
  assert.equal(months[0].revenuePerPerson, months[23].revenuePerPerson);
});

test("land is capped by capacity, not by ambition", () => {
  const { months } = computeGrowth({ ...FIXED, landDeals: 99 });
  assert.equal(months[0].newLand, 2); // 1 person × 2 per month
  assert.equal(months[0].capacityUsed, 2);
});

test("more people buy proportionally more land revenue — and nothing else", () => {
  const one = computeGrowth({ ...FIXED, landDeals: 99, founders: 1 }).months[10];
  const two = computeGrowth({ ...FIXED, landDeals: 99, founders: 2 }).months[10];
  assert.equal(two.revenue, one.revenue * 2);
  assert.equal(two.revenuePerPerson, one.revenuePerPerson); // no leverage gained
});

/* ── Expand bends the curve ──────────────────────────────────── */

test("expand raises revenue per person-month over time, land alone does not", () => {
  const flat = computeGrowth(FIXED);
  const bent = computeGrowth({ ...FIXED, expandOn: true, expandRate: 1, expandLag: 1, expandMultiple: 5 });

  assert.equal(flat.summary.leverageStart, flat.summary.leverageEnd);
  assert.ok(
    bent.summary.leverageEnd > bent.summary.leverageStart * 3,
    `expected leverage to climb, got ${bent.summary.leverageStart} → ${bent.summary.leverageEnd}`,
  );
});

test("the upsell multiple is what it says: ACV is the land price times it", () => {
  // One land deal in month 0, converting a month later at 5×.
  const inputs = {
    ...FIXED,
    landDeals: 1,
    landPrice: 10,
    expandOn: true,
    expandRate: 1,
    expandLag: 1,
    expandMultiple: 5,
  };
  const { months } = computeGrowth(inputs);
  // 50 k€ a year of recurring revenue, booked monthly.
  assert.equal(round2(months[1].revExpand), round2(50 / 12));
  assert.equal(months[1].expandCustomers, 1);
});

test("expand revenue costs no capacity slot, so it counts as capacity-free", () => {
  const { months } = computeGrowth({
    ...FIXED,
    expandOn: true,
    expandRate: 1,
    expandLag: 1,
    expandMultiple: 5,
  });
  const r = months[6];
  assert.ok(r.revExpand > 0);
  assert.equal(r.capacityFreeRevenue, r.revExpand);
  assert.ok(r.capacityFreeRevenue / r.revenue > 0.5, "expand should dominate by month 6");
});

test("expand accounts still cost something to serve when effort is non-zero", () => {
  const inputs = { ...FIXED, expandOn: true, expandRate: 1, expandLag: 1, expandEffort: 0.5, landDeals: 99 };
  const { months } = computeGrowth(inputs);
  // Servicing the installed base eats the capacity Land would have used.
  assert.ok(months[10].usedExpand > 0);
  assert.ok(months[10].newLand < months[0].newLand, "the base crowds out new land");
});

/* ── License multiplies reach without multiplying effort ─────── */

test("one partner sale reaches many end customers we never sold to", () => {
  const inputs = {
    ...FIXED,
    licenseOn: true,
    partnersPerMonth: 1,
    partnerReach: 10,
    partnerRamp: 1,
    partnerFee: 12,
    revPerEndCustomer: 6,
  };
  const { months } = computeGrowth(inputs);
  assert.equal(months[0].partners, 1);
  assert.equal(months[0].endCustomers, 10);
  // Licence 12/12 = 1, plus 10 end customers × 6/12 = 5.
  assert.equal(round2(months[0].revLicense), 6);
  // And none of it consumed capacity.
  assert.equal(months[0].usedLicense, 0);
  assert.equal(round2(months[0].capacityFreeRevenue), 5);
});

test("the reach multiple reports serving more people than we sold to", () => {
  const inputs = {
    ...FIXED,
    landDeals: 0,
    licenseOn: true,
    partnersPerMonth: 1,
    partnerReach: 10,
    partnerRamp: 1,
  };
  const { months } = computeGrowth(inputs);
  assert.equal(months[0].reachMultiple, 10); // sold to 1, serving 10
});

test("a partner deal is worth a multiple of a land deal", () => {
  const { summary } = computeGrowth({
    ...FIXED,
    landPrice: 10,
    licenseOn: true,
    partnerFee: 20,
    partnerReach: 10,
    revPerEndCustomer: 6,
  });
  assert.equal(summary.landDealValue, 10);
  assert.equal(summary.licenseDealValue, 80); // 20 + 10 × 6
});

test("end-customer effort is the dial that decides whether licensing scales", () => {
  const base = { ...FIXED, landDeals: 99, licenseOn: true, partnersPerMonth: 1, partnerReach: 10, partnerRamp: 1 };
  const free = computeGrowth({ ...base, endCustomerEffort: 0 }).months[5];
  const costly = computeGrowth({ ...base, endCustomerEffort: 0.5 }).months[5];
  assert.equal(free.usedLicense, 0);
  assert.ok(costly.usedLicense > 0);
  // When we deliver to their customers, licensing crowds out our own land work.
  assert.ok(costly.newLand < free.newLand);
});

test("the partner ramp phases the reach in", () => {
  const inputs = { ...FIXED, licenseOn: true, partnersPerMonth: 1, partnerReach: 10, partnerRamp: 4 };
  const { months } = computeGrowth(inputs);
  assert.equal(months[0].endCustomers, 2.5); // one partner, quarter-ramped
  assert.equal(months[3].endCustomers, 10 + 7.5 + 5 + 2.5); // four partners at staggered ramps
});

/* ── Motions off means off ───────────────────────────────────── */

test("switching a motion off removes its revenue entirely", () => {
  const on = computeGrowth({ ...DEFAULT_GROWTH, licenseOn: true });
  const off = computeGrowth({ ...DEFAULT_GROWTH, licenseOn: false });
  assert.ok(on.summary.byMotion.license > 0);
  assert.equal(off.summary.byMotion.license, 0);
  assert.equal(off.months.reduce((a, r) => a + r.endCustomers, 0), 0);
});

test("the land-only baseline strips both leveraged motions", () => {
  const base = landOnlyBaseline({ ...DEFAULT_GROWTH, licenseOn: true });
  assert.equal(base.summary.byMotion.expand, 0);
  assert.equal(base.summary.byMotion.license, 0);
  assert.ok(base.summary.byMotion.land > 0);
});

test("a motion that costs no capacity contributes exactly what it books", () => {
  // Serving the upsell base is free here, so Expand takes nothing away from
  // Land and the two measures agree.
  const inputs: GrowthInputs = { ...FIXED, expandOn: true, expandRate: 1, expandLag: 1, expandEffort: 0 };
  const contribution = motionContribution(inputs, "expand");
  const booked = computeGrowth(inputs).summary.byMotion.expand;
  assert.ok(contribution > 0);
  assert.equal(round2(contribution), round2(booked));
});

test("when capacity binds, a motion contributes less than it books — it crowds out Land", () => {
  // Deal flow is unlimited, so every capacity slot Expand consumes is a Land
  // deal that never happened. Switching Expand off buys some of that back,
  // which means its true contribution is smaller than its revenue line.
  const inputs: GrowthInputs = {
    ...FIXED,
    landDeals: 999,
    expandOn: true,
    expandRate: 1,
    expandLag: 1,
    expandMultiple: 3,
    expandEffort: 0.8,
  };
  const contribution = motionContribution(inputs, "expand");
  const booked = computeGrowth(inputs).summary.byMotion.expand;
  assert.ok(booked > 0);
  assert.ok(
    contribution < booked,
    `expected crowding-out: contribution ${round2(contribution)} should be under booked ${round2(booked)}`,
  );
});

/* ── The capital verdict ─────────────────────────────────────── */

test("a plan that never runs out of cash is called bootstrappable", () => {
  const { summary } = computeGrowth({ ...FIXED, startCash: 500, fixedCosts: 1 });
  assert.equal(summary.capital.bootstrappable, true);
  assert.equal(summary.capital.breachMonth, null);
  assert.equal(summary.capital.capitalNeeded, 0);
  assert.ok(summary.capital.minCash > 0);
});

test("a plan that runs dry reports how much is missing and when", () => {
  const inputs: GrowthInputs = {
    ...FIXED,
    startCash: 30,
    fixedCosts: 10,
    landDeals: 0, // no revenue at all: pure burn
    minCashBuffer: 0,
    fundraiseLeadMonths: 5,
  };
  const { summary, months } = computeGrowth(inputs);
  assert.equal(summary.capital.bootstrappable, false);
  assert.equal(summary.capital.breachMonth, 3); // 30 k€ at 10 k€/month
  assert.ok(months[3].cash < 0);
  // Deep enough to cover the worst point, not just the first breach.
  assert.equal(summary.capital.capitalNeeded, -summary.capital.minCash);
});

test("the raise has to start before the money runs out, and says so when it cannot", () => {
  const late = computeGrowth({
    ...FIXED,
    startCash: 30,
    fixedCosts: 10,
    landDeals: 0,
    fundraiseLeadMonths: 5,
  });
  // Breach in month 3, five months to close a round — you are already late.
  assert.equal(late.summary.capital.startRaisingMonth, -2);
  assert.equal(late.summary.capital.tooLate, true);

  const timely = computeGrowth({
    ...FIXED,
    startCash: 120,
    fixedCosts: 10,
    landDeals: 0,
    fundraiseLeadMonths: 5,
  });
  assert.equal(timely.summary.capital.breachMonth, 12);
  assert.equal(timely.summary.capital.startRaisingMonth, 7);
  assert.equal(timely.summary.capital.tooLate, false);
});

test("the cash buffer is respected as a floor, not just zero", () => {
  const inputs = { ...FIXED, startCash: 100, fixedCosts: 10, landDeals: 0, minCashBuffer: 50 };
  const { summary } = computeGrowth(inputs);
  assert.equal(summary.capital.breachMonth, 5); // cash 50 at month 4, below at 5
  assert.ok(summary.capital.capitalNeeded > 0);
});

/* ── Bootstrap hiring ────────────────────────────────────────── */

test("nobody is hired while there is spare capacity, however rich you are", () => {
  // Demand of 1 against capacity of 2: the second slot is already idle, so a
  // hire would be someone with nothing to do.
  const idle = {
    ...FIXED,
    startCash: 100000,
    landDeals: 1,
    hiringRate: 1,
    maxTeam: 5,
    hireOnlyFromCash: false,
  };
  const { months } = computeGrowth(idle);
  assert.equal(months[23].employees, 0);
  assert.equal(months[23].people, 1);
});

test("hiring starts as soon as demand outruns the hands", () => {
  const blocked = { ...FIXED, startCash: 100000, landDeals: 99, hiringRate: 1, maxTeam: 4, hireOnlyFromCash: false };
  const { months } = computeGrowth(blocked);
  assert.equal(months[0].employees, 1);
  assert.equal(months[3].employees, 4);
  assert.equal(months[9].employees, 4); // capped
});

test("hiring only from cash waits until the money is actually there", () => {
  const poor = {
    ...FIXED,
    startCash: 0,
    landDeals: 99, // demand is blocked, so the only question is affordability
    landPrice: 0, // and no revenue arrives to change that
    hiringRate: 1,
    maxTeam: 3,
    costPerEmployee: 10,
    hireBuffer: 6,
    hireOnlyFromCash: true,
  };
  assert.equal(computeGrowth(poor).months[10].employees, 0);

  const rich = computeGrowth({ ...poor, startCash: 500 });
  assert.ok(rich.months[3].employees > 0);
});

test("without the bootstrap constraint you hire on an empty balance", () => {
  const inputs = {
    ...FIXED,
    startCash: 0,
    landDeals: 99,
    landPrice: 0,
    hiringRate: 1,
    maxTeam: 3,
    costPerEmployee: 10,
    hireOnlyFromCash: false,
  };
  const { months } = computeGrowth(inputs);
  assert.equal(months[3].employees, 3);
  assert.ok(months[3].cash < 0); // and it shows up as a hole
});

test("capacity follows headcount", () => {
  const inputs = { ...FIXED, startCash: 5000, landDeals: 99, hiringRate: 1, maxTeam: 2, hireOnlyFromCash: false };
  const { months } = computeGrowth(inputs);
  assert.equal(months[0].capacity, 2); // 1 founder × 2
  assert.equal(months[1].capacity, 4); // + 1 employee
  assert.equal(months[2].capacity, 6);
  assert.equal(months[3].capacity, 6); // capped
});

test("a growing installed base eventually forces a hire on its own", () => {
  // Nothing changes on the demand side; the upsell base simply grows until
  // serving it crowds out the land work, and that is what triggers hiring.
  const inputs = {
    ...FIXED,
    startCash: 100000,
    landDeals: 2,
    expandOn: true,
    expandRate: 1,
    expandLag: 1,
    expandEffort: 0.3,
    hiringRate: 1,
    maxTeam: 5,
    hireOnlyFromCash: false,
  };
  const { months } = computeGrowth(inputs);
  assert.equal(months[0].employees, 0);
  assert.ok(months[23].employees > 0, "the base should eventually demand hands");
});

/* ── Internal consistency ────────────────────────────────────── */

test("the monthly rows add up to the summary", () => {
  const { months, summary } = computeGrowth({ ...DEFAULT_GROWTH, licenseOn: true });
  assert.equal(round2(summary.revenueTotal), round2(months.reduce((a, r) => a + r.revenue, 0)));
  assert.equal(round2(summary.endRevenue), round2(months[months.length - 1].revenue));
  for (const r of months) {
    assert.equal(round2(r.revenue), round2(r.revLand + r.revExpand + r.revLicense));
    assert.equal(round2(r.capacityUsed), round2(r.usedLand + r.usedExpand + r.usedLicense));
    assert.ok(r.capacityUsed <= r.capacity + 1e-9, `month ${r.index} overspent capacity`);
  }
});
