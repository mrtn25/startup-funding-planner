/* Tests für Land & Expand in ACV.  node --test lib/land-expand.test.ts */

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_LAND_EXPAND,
  computeLandExpand,
  projectsStartedAt,
  type LandExpandInputs,
} from "./land-expand.ts";

const near = (a: number, b: number, eps = 1e-6) =>
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b} erwartet`);

/** Ein Pilot im Monat 0, keine Wiederholung, kein Wachstum, kein Churn. */
const ONE: LandExpandInputs = {
  ...DEFAULT_LAND_EXPAND,
  horizonMonths: 24,
  projectsMonth1: 1,
  projectGrowth: 0,
  projectFee: 10000,
  projectMonths: 2,
  pilotMode: "oneOff",
  upgradeShare: 1,
  upgradeLagMonths: 3,
  platformAcv: 50000,
  billing: "annual",
  contractYears: 1,
  annualUplift: 0,
  annualChurn: 0,
  directWinsPerMonth: 0,
};

/* ── Land ── */

test("die Gewinnrate wächst geometrisch, vor Monat 0 gibt es nichts", () => {
  const i = { ...ONE, projectsMonth1: 2, projectGrowth: 0.1 };
  assert.equal(projectsStartedAt(i, -1), 0);
  assert.equal(projectsStartedAt(i, 0), 2);
  near(projectsStartedAt(i, 2), 2 * 1.1 * 1.1);
});

test("Projektgebühren werden über die Lieferdauer verdient, nicht auf einmal", () => {
  const r = computeLandExpand({ ...ONE, projectGrowth: 0 });
  // Ein Projekt in jedem Monat (Rate 1, kein Wachstum), Dauer 2 → ab M1 laufen zwei.
  near(r.months[0].projectRevenue, 5000);
  near(r.months[1].projectRevenue, 10000);
  near(r.months[5].projectRevenue, 10000);
});

test("eine Projektgebühr ist niemals ARR", () => {
  const r = computeLandExpand({ ...ONE, upgradeShare: 0 });
  for (const m of r.months) assert.equal(m.arr, 0);
  assert.ok(r.months[4].projectRevenue > 0);
});

/* ── Expand ── */

test("hochgestuft wird kohortenweise nach dem Lag, nicht als Rinnsal", () => {
  const r = computeLandExpand({ ...ONE, projectsMonth1: 1, projectGrowth: 0, upgradeShare: 0.5 });
  for (let m = 0; m < 3; m++) assert.equal(r.months[m].upgrades, 0);
  near(r.months[3].upgrades, 0.5);
  near(r.months[4].upgrades, 0.5);
});

test("ARR ist die Summe der laufenden ACVs", () => {
  const r = computeLandExpand(ONE);
  // Ab M3 kommt jeden Monat ein Kunde à 50k dazu.
  near(r.months[3].arr, 50000);
  near(r.months[5].arr, 150000);
  near(r.months[3].acvAvg, 50000);
});

test("der Durchschnitts-ACV zählt nur Verträge — ein Einmalprojekt ist keiner", () => {
  // Im Projektmodus laufen in M3 drei Piloten neben einem Lizenzkunden.
  const off = computeLandExpand(ONE);
  assert.ok(off.months[3].pilotCustomers > 0);
  near(off.months[3].acvAvg, 50000);

  // Im Abomodus sind die Piloten Verträge und zählen mit.
  const sub = computeLandExpand({ ...ONE, pilotMode: "subscription", pilotAcv: 10000 });
  near(sub.months[3].acvAvg, (50000 + 3 * 10000) / 4);
});

test("im Projektmodus ist das Upgrade neues ARR, kein Expansion-ARR", () => {
  const r = computeLandExpand(ONE);
  near(r.months[3].newArr, 50000);
  assert.equal(r.months[3].expansionArr, 0);
});

test("im Abomodus ist nur der Aufschlag Expansion, der Rest churnt", () => {
  const r = computeLandExpand({
    ...ONE,
    pilotMode: "subscription",
    pilotAcv: 10000,
    upgradeShare: 0.5,
  });
  // Kohorte 1 Kunde: 0,5 stufen hoch (+40k Aufschlag), 0,5 gehen (−10k · 0,5).
  near(r.months[3].expansionArr, 0.5 * 40000);
  near(r.months[3].churnedArr, 0.5 * 10000);
  assert.equal(r.months[3].newArr, 0);
});

test("derselbe Plan, anders gebucht, ergibt eine andere NRR", () => {
  const oneOff = computeLandExpand({ ...DEFAULT_LAND_EXPAND, pilotMode: "oneOff" });
  const sub = computeLandExpand({ ...DEFAULT_LAND_EXPAND, pilotMode: "subscription" });
  assert.ok(sub.nrr > oneOff.nrr, "das Abo-Framing schmeichelt der Retention");
  // Jede Rechnung kennt die jeweils andere.
  near(oneOff.nrrIfOther, sub.nrr, 1e-9);
  near(sub.nrrIfOther, oneOff.nrr, 1e-9);
});

/* ── Verlängerung ── */

test("ein Jahresvertrag churnt nicht mitten in der Laufzeit, nur zur Verlängerung", () => {
  const r = computeLandExpand({ ...ONE, annualChurn: 0.2, horizonMonths: 30 });
  for (let m = 4; m < 15; m++) assert.equal(r.months[m].churnedArr, 0);
  assert.ok(r.months[15].churnedArr > 0, "M15 ist die erste Verlängerung der M3-Kohorte");
});

test("Churn und Uplift verzinsen sich über eine mehrjährige Laufzeit", () => {
  const r = computeLandExpand({ ...ONE, contractYears: 2, annualChurn: 0.1, annualUplift: 0.1, horizonMonths: 40 });
  // Erste Verlängerung der M3-Kohorte erst nach 24 Monaten.
  for (let m = 4; m < 27; m++) assert.equal(r.months[m].churnedArr, 0);
  const ev = r.months[27];
  near(ev.churnedArr, 50000 * (1 - 0.9 * 0.9));
  const survivors = 0.9 * 0.9;
  near(ev.expansionArr, survivors * 50000 * (1.1 * 1.1 - 1));
});

test("TCV ist die Laufzeit mal ACV und wird nicht zu ARR", () => {
  const r = computeLandExpand({ ...ONE, contractYears: 3 });
  assert.equal(r.acv, 50000);
  assert.equal(r.tcv, 150000);
  near(r.months[3].arr, 50000);
});

/* ── Rechnungsstellung ── */

test("jährlich im Voraus stellt zwölf Monate auf einmal, monatlich nicht", () => {
  const yearly = computeLandExpand({ ...ONE, billing: "annual" });
  const monthly = computeLandExpand({ ...ONE, billing: "monthly" });
  // Der Projektanteil ist in beiden gleich; die Differenz ist die Lizenz.
  near(yearly.months[3].billings - monthly.months[3].billings, 50000 - 50000 / 12);
  assert.ok(yearly.peakDeferred > monthly.peakDeferred);
});

test("quartalsweise stellt ein Viertel alle drei Monate", () => {
  const r = computeLandExpand({ ...ONE, billing: "quarterly", projectFee: 0 });
  near(r.months[3].billings, 12500);
  near(r.months[4].billings, 12500); // die M4-Kohorte, nicht die M3-Kohorte
  near(r.months[6].billings, 12500 * 2); // M6-Kohorte plus zweite Rate der M3-Kohorte
});

test("abgegrenzt ist, was gestellt und noch nicht verdient ist", () => {
  const r = computeLandExpand({ ...ONE, billing: "annual", projectFee: 0, upgradeShare: 1 });
  // Ein Kunde ab M3: 50k gestellt, ein Zwölftel verdient.
  near(r.months[3].deferred, 50000 - 50000 / 12);
  near(r.months[4].deferred, 100000 - 50000 / 12 - 100000 / 12);
});

test("bei monatlicher Zahlung entsteht fast keine Abgrenzung", () => {
  const r = computeLandExpand({ ...ONE, billing: "monthly", projectFee: 0 });
  for (const m of r.months) assert.ok(m.deferred < 1e-6);
});

/* ── Randfälle ── */

test("ohne Upgrades bleibt das ARR null, auch bei vollem Projektgeschäft", () => {
  const r = computeLandExpand({ ...DEFAULT_LAND_EXPAND, upgradeShare: 0, directWinsPerMonth: 0 });
  assert.equal(r.final.arr, 0);
  assert.ok(r.final.projectRevenue > 0);
  assert.equal(r.nonRecurringShare, 1);
});

test("Direktabschlüsse überspringen den Piloten und zählen als neues ARR", () => {
  const r = computeLandExpand({ ...ONE, projectsMonth1: 0, directWinsPerMonth: 1, pilotMode: "subscription" });
  near(r.months[0].newArr, 50000);
  assert.equal(r.months[0].expansionArr, 0);
});

test("die Voreinstellung rechnet und wächst", () => {
  const r = computeLandExpand(DEFAULT_LAND_EXPAND);
  assert.equal(r.months.length, 37);
  assert.ok(r.final.arr > 0);
  assert.ok(r.final.arr > r.months[12].arr);
  assert.ok(r.verdicts.length > 0);
  for (const m of r.months) {
    assert.ok(Number.isFinite(m.arr) && m.arr >= 0);
    assert.ok(Number.isFinite(m.deferred) && m.deferred >= 0);
  }
});
