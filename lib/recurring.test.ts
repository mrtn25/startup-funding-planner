/* Tests für ARR/MRR.  node --test lib/recurring.test.ts */

import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_RECURRING, computeRecurring, newPlan, planMrr, type RecurringInputs } from "./recurring.ts";

const round2 = (n: number) => Math.round(n * 100) / 100;

const QUIET: RecurringInputs = {
  plans: [],
  newMrr: 0,
  expansionMrr: 0,
  contractionMrr: 0,
  churnedMrr: 0,
  setupFees: 0,
  servicesRevenue: 0,
  overageRevenue: 0,
  horizonMonths: 12,
};

/* ── Abrechnungsrhythmus ── */

test("jeder Abrechnungsrhythmus wird auf einen Monat normalisiert", () => {
  assert.equal(planMrr(newPlan({ price: 100, term: "monthly", customers: 1 })), 100);
  assert.equal(planMrr(newPlan({ price: 300, term: "quarterly", customers: 1 })), 100);
  assert.equal(planMrr(newPlan({ price: 1200, term: "annual", customers: 1 })), 100);
});

test("ARR ist MRR mal zwölf, über alle Pläne", () => {
  const r = computeRecurring({
    ...QUIET,
    plans: [
      newPlan({ price: 100, term: "monthly", customers: 10 }),
      newPlan({ price: 6000, term: "annual", customers: 2 }),
    ],
  });
  assert.equal(r.mrr, 1000 + 1000);
  assert.equal(r.arr, 24000);
});

test("der Anteil je Plan summiert sich auf eins", () => {
  const r = computeRecurring(DEFAULT_RECURRING);
  assert.equal(round2(r.lines.reduce((a, l) => a + l.shareOfArr, 0)), 1);
});

test("ohne Pläne gibt es kein ARR und keine Division durch null", () => {
  const r = computeRecurring(QUIET);
  assert.equal(r.arr, 0);
  assert.equal(r.nrr, 1);
  assert.equal(r.monthlyGrowth, 0);
});

/* ── Was kein ARR ist ── */

test("einmalige Erlöse zählen zum Umsatz, nicht zum ARR", () => {
  const r = computeRecurring({
    ...QUIET,
    plans: [newPlan({ price: 1000, term: "monthly", customers: 1 })],
    setupFees: 500,
    servicesRevenue: 400,
    overageRevenue: 100,
  });
  assert.equal(r.mrr, 1000);
  assert.equal(r.arr, 12000);
  assert.equal(r.nonRecurring, 1000);
  assert.equal(r.totalMonthly, 2000);
});

test("die Lücke zeigt, was Hochrechnen des Gesamtumsatzes behaupten würde", () => {
  const r = computeRecurring({
    ...QUIET,
    plans: [newPlan({ price: 1000, term: "monthly", customers: 1 })],
    servicesRevenue: 1000,
  });
  assert.equal(r.inflatedArr, 24000);
  assert.equal(r.inflationGap, 12000);
});

test("ein hoher Anteil nicht wiederkehrender Erlöse wird angesprochen", () => {
  const mixed = computeRecurring({
    ...QUIET,
    plans: [newPlan({ price: 1000, term: "monthly", customers: 1 })],
    servicesRevenue: 900,
  });
  assert.ok(mixed.verdicts.some((v) => v.key === "mixed"));
  const clean = computeRecurring({ ...QUIET, plans: [newPlan({ price: 1000, term: "monthly", customers: 1 })] });
  assert.ok(!clean.verdicts.some((v) => v.key === "mixed"));
});

/* ── Die Brücke ── */

test("die Brücke geht auf: Start + neu + Expansion − Contraction − Churn", () => {
  const r = computeRecurring({
    ...QUIET,
    plans: [newPlan({ price: 10000, term: "monthly", customers: 1 })],
    newMrr: 2000,
    expansionMrr: 1000,
    contractionMrr: 300,
    churnedMrr: 700,
  });
  const b = r.bridge;
  assert.equal(b.startMrr, 10000);
  assert.equal(b.endMrr, 10000 + 2000 + 1000 - 300 - 700);
  assert.equal(b.grossNew, 3000);
  assert.equal(b.netNew, 2000);
});

test("Retention zählt nur den Bestand, nicht das Neugeschäft", () => {
  const r = computeRecurring({
    ...QUIET,
    plans: [newPlan({ price: 10000, term: "monthly", customers: 1 })],
    newMrr: 99999, // darf die Retention nicht schönen
    churnedMrr: 1000,
    contractionMrr: 500,
    expansionMrr: 2000,
  });
  assert.equal(round2(r.grr), 0.85); // (10000 − 1500) / 10000
  assert.equal(round2(r.nrr), 1.05); // plus 2000 Expansion
});

test("Expansion über dem Verlust hebt NRR über hundert Prozent", () => {
  const r = computeRecurring({
    ...QUIET,
    plans: [newPlan({ price: 10000, term: "monthly", customers: 1 })],
    expansionMrr: 2500,
    churnedMrr: 500,
  });
  assert.equal(round2(r.nrr), 1.2);
  assert.ok(r.verdicts.some((v) => v.key === "nrr-strong"));
});

test("ein schrumpfender Bestand wird als solcher benannt", () => {
  const r = computeRecurring({
    ...QUIET,
    plans: [newPlan({ price: 10000, term: "monthly", customers: 1 })],
    churnedMrr: 800,
    expansionMrr: 200,
  });
  assert.ok(r.nrr < 1);
  assert.ok(r.verdicts.some((v) => v.key === "nrr-leak"));
});

test("Bruttoretention lässt sich nicht durch Upgrades kaschieren", () => {
  const r = computeRecurring({
    ...QUIET,
    plans: [newPlan({ price: 10000, term: "monthly", customers: 1 })],
    churnedMrr: 2000,
    expansionMrr: 3000,
  });
  assert.ok(r.nrr > 1, "netto sieht gut aus");
  assert.equal(round2(r.grr), 0.8);
  assert.ok(r.verdicts.some((v) => v.key === "grr"), "brutto muss trotzdem auffallen");
});

/* ── Projektion ── */

test("die Projektion startet beim heutigen MRR und wächst mit der Netto-Rate", () => {
  const r = computeRecurring({
    ...QUIET,
    plans: [newPlan({ price: 1000, term: "monthly", customers: 1 })],
    newMrr: 100,
    horizonMonths: 3,
  });
  assert.equal(r.monthlyGrowth, 0.1);
  assert.equal(r.projection[0].mrr, 1000);
  assert.equal(round2(r.projection[1].mrr), 1100);
  assert.equal(round2(r.projection[3].mrr), round2(1000 * 1.1 ** 3));
  assert.equal(r.projection.length, 4);
});

test("ein schrumpfender Bestand projiziert nach unten", () => {
  const r = computeRecurring({
    ...QUIET,
    plans: [newPlan({ price: 1000, term: "monthly", customers: 1 })],
    churnedMrr: 50,
    horizonMonths: 6,
  });
  assert.ok(r.monthlyGrowth < 0);
  assert.ok(r.projection[6].mrr < r.projection[0].mrr);
});

test("ARR in der Projektion ist immer das Zwölffache des MRR", () => {
  const r = computeRecurring(DEFAULT_RECURRING);
  for (const p of r.projection) assert.equal(round2(p.arr), round2(p.mrr * 12));
});

test("die Ausgangswerte ergeben ein plausibles, nicht geschöntes Bild", () => {
  const r = computeRecurring(DEFAULT_RECURRING);
  assert.ok(r.arr > 0);
  assert.ok(r.nonRecurring > 0, "die Startwerte sollen den Unterschied zeigen");
  assert.ok(r.inflationGap > 0);
  assert.ok(r.nrr > 0.5 && r.nrr < 1.5);
});
