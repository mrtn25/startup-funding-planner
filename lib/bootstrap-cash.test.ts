/* Tests für das Cash-Modell.  node --test lib/bootstrap-cash.test.ts */

import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_CASH, computeCash, type CashInputs } from "./bootstrap-cash.ts";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Runde Zahlen, keine Reibung: ein Segment, kein Churn, keine Kosten. */
const FLAT: CashInputs = {
  ...DEFAULT_CASH,
  months: 24,
  startCash: 1000,
  fixedCosts: 0,
  founders: 1,
  founderDraw: 0,
  startNewCustomers: 1,
  acquisitionGrowth: 0,
  revenuePerCustomer: 12,
  recurringShare: 1,
  churnPerYear: 0,
  costToServe: 0,
  cac: 0,
  customersPerPerson: 100,
  hiringRate: 0,
  maxTeam: 0,
  hireOnlyFromCash: false,
  minCashBuffer: 0,
};

test("wiederkehrender Umsatz wächst mit dem Bestand", () => {
  const { months } = computeCash(FLAT);
  assert.equal(months[0].customers, 1);
  assert.equal(months[0].revenue, 1); // 12 k€ / 12
  assert.equal(months[11].customers, 12);
  assert.equal(months[11].revenue, 12);
});

test("einmaliger Umsatz zählt nur im Monat des Abschlusses", () => {
  const { months } = computeCash({ ...FLAT, recurringShare: 0 });
  assert.equal(months[0].revenue, 12); // ein Kunde, ganzer Jahresbetrag einmal
  assert.equal(months[5].revenue, 12); // jeden Monat ein neuer, nie mehr
  assert.equal(months[5].customers, 6);
});

test("eine Mischung liegt zwischen beiden", () => {
  const half = computeCash({ ...FLAT, recurringShare: 0.5 }).months[5];
  assert.equal(round2(half.revenue), round2(6 * 0.5 + 12 * 0.5));
});

test("Churn bremst den Bestand", () => {
  const leaky = computeCash({ ...FLAT, churnPerYear: 0.6 }).months[11].customers;
  assert.ok(leaky < computeCash(FLAT).months[11].customers);
});

/* ── Kapazität ── */

test("die Lieferkapazität deckelt den Bestand, nicht die Absicht", () => {
  const { months } = computeCash({ ...FLAT, startNewCustomers: 99, customersPerPerson: 3 });
  assert.equal(months[0].newCustomers, 3);
  assert.equal(months[0].customers, 3);
  assert.equal(months[5].customers, 3);
});

test("mehr Leute heben die Kapazität", () => {
  const { months } = computeCash({ ...FLAT, founders: 2, customersPerPerson: 3, startNewCustomers: 99 });
  assert.equal(months[0].capacity, 6);
});

/* ── Einstellen ── */

test("niemand wird eingestellt, solange Kapazität frei ist", () => {
  const idle = { ...FLAT, startCash: 100000, startNewCustomers: 1, customersPerPerson: 50, hiringRate: 1, maxTeam: 5 };
  assert.equal(computeCash(idle).months[23].employees, 0);
});

test("eingestellt wird, sobald die Nachfrage an der Kapazität hängt", () => {
  const blocked = { ...FLAT, startCash: 100000, startNewCustomers: 99, customersPerPerson: 2, hiringRate: 1, maxTeam: 4 };
  const { months } = computeCash(blocked);
  assert.equal(months[0].employees, 1);
  assert.equal(months[3].employees, 4);
  assert.equal(months[9].employees, 4);
});

test("die Bootstrap-Regel wartet, bis das Geld da ist", () => {
  const poor: CashInputs = {
    ...FLAT,
    startCash: 0,
    revenuePerCustomer: 0,
    startNewCustomers: 99,
    customersPerPerson: 1,
    hiringRate: 1,
    maxTeam: 3,
    costPerEmployee: 10,
    hireBuffer: 6,
    hireOnlyFromCash: true,
  };
  assert.equal(computeCash(poor).months[10].employees, 0);
  assert.ok(computeCash({ ...poor, startCash: 500 }).months[3].employees > 0);
});

test("ohne die Regel wird auf leerem Konto eingestellt", () => {
  const inputs: CashInputs = {
    ...FLAT,
    startCash: 0,
    revenuePerCustomer: 0,
    startNewCustomers: 99,
    customersPerPerson: 1,
    hiringRate: 1,
    maxTeam: 3,
    costPerEmployee: 10,
    hireOnlyFromCash: false,
  };
  const { months } = computeCash(inputs);
  assert.equal(months[3].employees, 3);
  assert.ok(months[3].cash < 0);
});

/* ── Das Kapital-Urteil ── */

test("ein Plan, der nie leerläuft, heißt bootstrappable", () => {
  const r = computeCash({ ...FLAT, startCash: 500, fixedCosts: 1 });
  assert.equal(r.capital.bootstrappable, true);
  assert.equal(r.capital.breachMonth, null);
  assert.equal(r.capital.capitalNeeded, 0);
});

test("ein Plan, der leerläuft, nennt Betrag und Zeitpunkt", () => {
  const r = computeCash({ ...FLAT, startCash: 30, fixedCosts: 10, revenuePerCustomer: 0, fundraiseLeadMonths: 5 });
  assert.equal(r.capital.bootstrappable, false);
  assert.equal(r.capital.breachMonth, 3);
  assert.equal(r.capital.capitalNeeded, -r.capital.minCash);
});

test("wer zu spät dran ist, erfährt das auch", () => {
  const late = computeCash({ ...FLAT, startCash: 30, fixedCosts: 10, revenuePerCustomer: 0, fundraiseLeadMonths: 5 });
  assert.equal(late.capital.startRaisingMonth, -2);
  assert.equal(late.capital.tooLate, true);

  const timely = computeCash({ ...FLAT, startCash: 120, fixedCosts: 10, revenuePerCustomer: 0, fundraiseLeadMonths: 5 });
  assert.equal(timely.capital.breachMonth, 12);
  assert.equal(timely.capital.startRaisingMonth, 7);
  assert.equal(timely.capital.tooLate, false);
});

test("der Cash-Puffer gilt als Boden, nicht die Null", () => {
  const r = computeCash({ ...FLAT, startCash: 100, fixedCosts: 10, revenuePerCustomer: 0, minCashBuffer: 50 });
  assert.equal(r.capital.breachMonth, 5);
});

test("Break-even ignoriert einen einzelnen guten Monat", () => {
  const r = computeCash({ ...FLAT, startCash: 500, fixedCosts: 6, months: 24 });
  // Der Umsatz wächst mit dem Bestand, also kippt es einmal und bleibt dann.
  assert.ok(r.breakEvenMonth !== null);
  for (let m = r.breakEvenMonth!; m < r.months.length; m++) assert.ok(r.months[m].result > 0);
});

test("die Zeilen addieren sich zur Summe", () => {
  const r = computeCash(DEFAULT_CASH);
  assert.equal(round2(r.revenueTotal), round2(r.months.reduce((a, m) => a + m.revenue, 0)));
  assert.equal(round2(r.endRevenue), round2(r.months[r.months.length - 1].revenue));
  for (const m of r.months) assert.equal(round2(m.result), round2(m.revenue - m.cost));
});
