/* Tests für das Ziel-Modell.
     node --test lib/inplicit/goal.test.ts
*/

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_GOAL,
  arpaFor,
  computeGoal,
  customersPerMonthFor,
  interviewsPerYear,
  ltvCacVerdict,
  unitEconomics,
  type GoalInputs,
} from "./goal.ts";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Runde Zahlen, damit jede Behauptung im Kopf nachrechenbar ist. */
const BASE: GoalInputs = {
  ...DEFAULT_GOAL,
  targetARR: 100,
  horizonMonths: 36,
  pricing: "perCampaign",
  pricePerInterview: 500, // 12 × 4 × 500 € = 24 k€
  pricePerCampaign: 5, // 4 × 5 k€    = 20 k€
  subscriptionACV: 40, //               40 k€
  interviewsPerCampaign: 12,
  campaignsPerYear: 4,
  newCustomersPerMonth: 1,
  salesSpendPerMonth: 5,
  costPerInterview: 0,
  churnPerYear: 0.2,
  expandOn: false,
  channelOn: false,
};

/* ── Preismodell → ARPA ──────────────────────────────────────── */

test("jedes Preismodell rechnet den Jahresumsatz je Kunde anders aus", () => {
  assert.equal(interviewsPerYear(BASE), 48);
  assert.equal(arpaFor(BASE, "perInterview"), 24); // 48 × 500 €
  assert.equal(arpaFor(BASE, "perCampaign"), 20); // 4 × 5 k€
  assert.equal(arpaFor(BASE, "subscription"), 40);
});

test("dasselbe Ziel bedeutet je nach Abrechnung eine andere Kundenzahl", () => {
  const need = (m: Parameters<typeof arpaFor>[1]) => unitEconomics(BASE, m).customersNeeded;
  assert.equal(need("perInterview"), 100 / 24);
  assert.equal(need("perCampaign"), 5); // 100 / 20
  assert.equal(need("subscription"), 2.5); // 100 / 40
  // Der Punkt der ganzen Übung: gleiche ARR, sehr verschiedene Firmen.
  assert.ok(need("perInterview") > need("subscription"));
});

test("mehr Kampagnen je Kunde heben nutzungsabhängige Preise, nicht die Lizenz", () => {
  const busy = { ...BASE, campaignsPerYear: 8 };
  assert.equal(arpaFor(busy, "perCampaign"), 40); // verdoppelt
  assert.equal(arpaFor(busy, "perInterview"), 48); // verdoppelt
  assert.equal(arpaFor(busy, "subscription"), 40); // unverändert
});

/* ── Unit Economics ──────────────────────────────────────────── */

test("Lieferkosten schlagen auf den Deckungsbeitrag durch, nicht auf den Umsatz", () => {
  const u = unitEconomics({ ...BASE, costPerInterview: 100 }); // 48 × 100 € = 4,8 k€
  assert.equal(u.arpa, 20);
  assert.equal(round2(u.deliveryCost), 4.8);
  assert.equal(round2(u.contribution), 15.2);
  assert.equal(round2(u.grossMargin), 0.76);
});

test("CAC ist der Vertriebsaufwand je gewonnenem Kunden", () => {
  const u = unitEconomics(BASE); // 5 k€ im Monat, 1 Kunde im Monat
  assert.equal(u.cac, 5);
  const cheaper = unitEconomics({ ...BASE, newCustomersPerMonth: 5 });
  assert.equal(cheaper.cac, 1);
});

test("LTV ist der Deckungsbeitrag über die erwartete Lebensdauer", () => {
  const u = unitEconomics(BASE); // 20 % Churn → 5 Jahre, DB 20 k€
  assert.equal(u.lifetimeYears, 5);
  assert.equal(u.ltv, 100);
  assert.equal(u.ltvCac, 20); // 100 / 5
});

test("höherer Churn verkürzt die Lebensdauer und damit den LTV", () => {
  const sticky = unitEconomics({ ...BASE, churnPerYear: 0.1 });
  const leaky = unitEconomics({ ...BASE, churnPerYear: 0.5 });
  assert.equal(sticky.lifetimeYears, 10);
  assert.equal(leaky.lifetimeYears, 2);
  assert.ok(sticky.ltv > leaky.ltv);
});

test("Payback ist erreicht, wenn der Deckungsbeitrag die Akquise eingespielt hat", () => {
  // CAC 5 k€, DB 20 k€ im Jahr → 1,667 k€ im Monat → drei Monate.
  assert.equal(round2(unitEconomics(BASE).paybackMonths), 3);
});

test("das Akquisebudget bis zum Ziel ist Kundenzahl mal CAC", () => {
  const u = unitEconomics(BASE);
  assert.equal(u.customersNeeded, 5);
  assert.equal(u.acquisitionBudget, 25); // 5 × 5 k€
});

test("das LTV:CAC-Urteil trennt verbrennen, tragen und skalieren", () => {
  assert.equal(ltvCacVerdict(0.6).tone, "bad");
  assert.equal(ltvCacVerdict(2).tone, "warn");
  assert.equal(ltvCacVerdict(4).tone, "ok");
});

/* ── Verlauf und Motions ─────────────────────────────────────── */

test("ohne Churn wächst Land linear mit der Akquise", () => {
  const { months } = computeGoal({ ...BASE, churnPerYear: 0, newCustomersPerMonth: 1 });
  assert.equal(months[0].customers, 1);
  assert.equal(months[4].customers, 5);
  assert.equal(months[4].land, 100); // 5 Kunden × 20 k€
});

test("Churn bremst den Bestand", () => {
  const withChurn = computeGoal({ ...BASE, churnPerYear: 0.6 }).months[11].customers;
  const without = computeGoal({ ...BASE, churnPerYear: 0 }).months[11].customers;
  assert.ok(withChurn < without);
});

test("Expand liegt über Land und wird von allein steiler", () => {
  const flat = computeGoal({ ...BASE, expandOn: false });
  const bent = computeGoal({ ...BASE, expandOn: true, expandPerYear: 0.5 });

  assert.equal(flat.months[23].expand, 0);
  assert.ok(bent.months[23].expand > 0);
  // Kein einziger Kunde mehr, trotzdem mehr ARR.
  assert.equal(round2(bent.months[23].customers), round2(flat.months[23].customers));
  assert.ok(bent.months[23].total > flat.months[23].total);
  // Und der Abstand wächst, statt konstant zu bleiben.
  const gapEarly = bent.months[5].total - flat.months[5].total;
  const gapLate = bent.months[23].total - flat.months[23].total;
  assert.ok(gapLate > gapEarly * 2, `Steigung sollte zunehmen: ${gapEarly} → ${gapLate}`);
});

test("Channel bringt Endkunden, an die wir nie verkauft haben", () => {
  const r = computeGoal({
    ...BASE,
    channelOn: true,
    partnersPerYear: 12, // einer im Monat
    endCustomersPerPartner: 10,
    partnerRampMonths: 1,
    partnerShare: 0.5,
  });
  assert.equal(r.months[0].partners, 1);
  assert.equal(r.months[0].endCustomers, 10);
  assert.equal(r.months[0].channel, 10 * 20 * 0.5); // 100 k€
  assert.equal(r.months[1].endCustomers, 20);
});

test("die Partner-Hochlaufkurve staffelt die Reichweite", () => {
  const r = computeGoal({
    ...BASE,
    channelOn: true,
    partnersPerYear: 12,
    endCustomersPerPartner: 8,
    partnerRampMonths: 4,
  });
  assert.equal(r.months[0].endCustomers, 2); // ein Partner, viertel hochgelaufen
  assert.equal(r.months[3].endCustomers, 8 + 6 + 4 + 2);
});

test("abgeschaltete Motions steuern exakt nichts bei", () => {
  const r = computeGoal({ ...BASE, expandOn: false, channelOn: false });
  assert.equal(r.contribution.expand, 0);
  assert.equal(r.contribution.channel, 0);
  assert.ok(r.contribution.land > 0);
  assert.equal(r.months.reduce((a, m) => a + m.endCustomers, 0), 0);
});

test("jede zugeschaltete Motion bringt das Ziel näher, nie weiter weg", () => {
  const slow = { ...BASE, newCustomersPerMonth: 0.4, horizonMonths: 60 };
  const land = computeGoal(slow).reach.land;
  const withExpand = computeGoal({ ...slow, expandOn: true, expandPerYear: 0.4 }).reach.landExpand;
  const withBoth = computeGoal({
    ...slow,
    expandOn: true,
    expandPerYear: 0.4,
    channelOn: true,
    partnersPerYear: 2,
    endCustomersPerPartner: 6,
  }).reach.all;

  assert.ok(land != null && withExpand != null && withBoth != null);
  assert.ok(withExpand! <= land!, `Expand sollte nicht bremsen: ${withExpand} vs ${land}`);
  assert.ok(withBoth! <= withExpand!, `Channel sollte nicht bremsen: ${withBoth} vs ${withExpand}`);
});

test("eine Motion verändert nur ihre eigene Schicht, nicht die darunter", () => {
  const base = { ...BASE, expandOn: true, expandPerYear: 0.4 };
  const off = computeGoal({ ...base, channelOn: false });
  const on = computeGoal({
    ...base,
    channelOn: true,
    partnersPerYear: 6,
    endCustomersPerPartner: 10,
  });

  // Channel darf Land und Expand nicht anfassen — sonst wäre der Abstand
  // zwischen den Linien nicht mehr der Beitrag der jeweiligen Motion.
  assert.equal(off.reach.land, on.reach.land);
  assert.equal(off.reach.landExpand, on.reach.landExpand);
  for (let m = 0; m < off.months.length; m++) {
    assert.equal(round2(on.months[m].land), round2(off.months[m].land));
    assert.equal(round2(on.months[m].expand), round2(off.months[m].expand));
  }
  // Und Expand darf Land nicht anfassen.
  const noExpand = computeGoal({ ...BASE, expandOn: false });
  assert.equal(noExpand.reach.land, off.reach.land);
});

test("ein unerreichbares Ziel wird als unerreichbar gemeldet", () => {
  const r = computeGoal({ ...BASE, targetARR: 1e6, horizonMonths: 12 });
  assert.equal(r.reach.land, null);
  assert.equal(r.reach.all, null);
});

test("die Monatszeilen addieren sich zur Gesamtlinie", () => {
  const r = computeGoal({ ...BASE, expandOn: true, channelOn: true });
  for (const m of r.months) {
    assert.equal(round2(m.total), round2(m.land + m.expand + m.channel));
  }
});

/* ── Umkehrfrage ─────────────────────────────────────────────── */

test("die nötige Akquiserate für einen Zieltermin wird gefunden", () => {
  const needed = customersPerMonthFor({ ...BASE, horizonMonths: 36 }, 11);
  assert.ok(needed !== null && needed > 0);
  const r = computeGoal({ ...BASE, newCustomersPerMonth: needed! });
  assert.ok(r.reach.all != null && r.reach.all <= 11);
  // Und knapp darunter reicht es nicht mehr — die Grenze ist scharf.
  const short = computeGoal({ ...BASE, newCustomersPerMonth: needed! * 0.8 });
  assert.ok(short.reach.all == null || short.reach.all > 11);
});

test("ein in der Zeit unmöglicher Termin liefert kein Ergebnis statt einer Fantasiezahl", () => {
  assert.equal(customersPerMonthFor({ ...BASE, targetARR: 1e9 }, 1), null);
});
