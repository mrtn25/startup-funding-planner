/* Tests für das Ziel-Modell.
     node --test lib/inplicit/goal.test.ts
*/

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_GOAL,
  arpaFor,
  computeGoal,
  callLoad,
  growthForTarget,
  interviewsPerYear,
  newCustomersAt,
  routesToTarget,
  ltvCacVerdict,
  startForTarget,
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
  startNewCustomers: 1,
  acquisitionGrowth: 0,
  newCustomerOverrides: {},
  conversionRate: 0.2,
  callsToClose: 3,
  callMinutes: 30,
  cac: 5,
  costPerInterview: 0,
  churnPerYear: 0,
  expandOn: false,
  upgradeSharePerYear: 0,
  upgradeUplift: 0,
  channelOn: false,
};

/* ── Preismodell → ARPA ──────────────────────────────────────── */

test("jedes Preismodell rechnet den Jahresumsatz je Kunde anders aus", () => {
  assert.equal(interviewsPerYear(BASE), 48);
  assert.equal(arpaFor(BASE, "perInterview"), 24);
  assert.equal(arpaFor(BASE, "perCampaign"), 20);
  assert.equal(arpaFor(BASE, "subscription"), 40);
});

test("dasselbe Ziel bedeutet je nach Abrechnung eine andere Kundenzahl", () => {
  const need = (m: Parameters<typeof arpaFor>[1]) => unitEconomics(BASE, m).customersNeeded;
  assert.equal(need("perInterview"), 100 / 24);
  assert.equal(need("perCampaign"), 5);
  assert.equal(need("subscription"), 2.5);
  assert.ok(need("perInterview") > need("subscription"));
});

test("mehr Kampagnen je Kunde heben nutzungsabhängige Preise, nicht die Lizenz", () => {
  const busy = { ...BASE, campaignsPerYear: 8 };
  assert.equal(arpaFor(busy, "perCampaign"), 40);
  assert.equal(arpaFor(busy, "perInterview"), 48);
  assert.equal(arpaFor(busy, "subscription"), 40);
});

/* ── Unit Economics ──────────────────────────────────────────── */

test("Lieferkosten schlagen auf den Deckungsbeitrag durch, nicht auf den Umsatz", () => {
  const u = unitEconomics({ ...BASE, costPerInterview: 100 }); // 48 × 100 € = 4,8 k€
  assert.equal(u.arpa, 20);
  assert.equal(round2(u.deliveryCost), 4.8);
  assert.equal(round2(u.contribution), 15.2);
  assert.equal(round2(u.grossMargin), 0.76);
});

test("LTV ist der Deckungsbeitrag über die erwartete Lebensdauer", () => {
  const u = unitEconomics({ ...BASE, churnPerYear: 0.2 }); // 5 Jahre, DB 20 k€
  assert.equal(u.lifetimeYears, 5);
  assert.equal(u.ltv, 100);
  assert.equal(u.ltvCac, 20); // 100 / CAC 5
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
  assert.equal(u.acquisitionBudget, 25);
});

test("das LTV:CAC-Urteil trennt verbrennen, tragen und skalieren", () => {
  assert.equal(ltvCacVerdict(0.6).tone, "bad");
  assert.equal(ltvCacVerdict(2).tone, "warn");
  assert.equal(ltvCacVerdict(4).tone, "ok");
});

/* ── Akquise wächst, die Kurve krümmt sich ───────────────────── */

test("ohne Wachstum ist die Neukundenrate konstant und Land eine Gerade", () => {
  const { months } = computeGoal({ ...BASE, acquisitionGrowth: 0, startNewCustomers: 2 });
  assert.equal(months[0].newCustomers, 2);
  assert.equal(months[11].newCustomers, 2);
  // Gleiche Zuwächse heißt konstante Steigung.
  const d1 = months[5].land - months[4].land;
  const d2 = months[20].land - months[19].land;
  assert.equal(round2(d1), round2(d2));
});

test("mit Wachstum kommen später mehr Kunden pro Monat dazu als am Anfang", () => {
  const { months } = computeGoal({ ...BASE, startNewCustomers: 1, acquisitionGrowth: 0.1 });
  assert.equal(months[0].newCustomers, 1);
  assert.equal(round2(months[1].newCustomers), 1.1);
  assert.equal(round2(months[12].newCustomers), round2(Math.pow(1.1, 12)));
  // 1, 2 oder 10 Neukunden im Monat — genau das soll möglich sein.
  assert.ok(months[24].newCustomers > 9);
});

test("wachsende Akquise krümmt die Land-Kurve nach oben", () => {
  const { months } = computeGoal({ ...BASE, startNewCustomers: 1, acquisitionGrowth: 0.1 });
  const early = months[5].land - months[4].land;
  const late = months[25].land - months[24].land;
  assert.ok(late > early * 3, `Steigung muss zunehmen: ${round2(early)} → ${round2(late)}`);
});

test("Churn bremst den Bestand, nicht die Neukundenrate", () => {
  const a = computeGoal({ ...BASE, churnPerYear: 0.6 });
  const b = computeGoal({ ...BASE, churnPerYear: 0 });
  assert.equal(a.months[11].newCustomers, b.months[11].newCustomers);
  assert.ok(a.months[11].customers < b.months[11].customers);
});

test("das Vertriebsbudget wächst mit der Neukundenrate mit", () => {
  const { months } = computeGoal({ ...BASE, startNewCustomers: 2, acquisitionGrowth: 0.1, cac: 5 });
  assert.equal(months[0].salesSpend, 10);
  assert.equal(round2(months[1].salesSpend), 11);
});

/* ── Expand: Anteil × Satz ───────────────────────────────────── */

test("Expand stuft einen Anteil des Bestands hoch, nicht den ganzen", () => {
  const r = computeGoal({
    ...BASE,
    expandOn: true,
    upgradeSharePerYear: 1.2, // 10 % im Monat
    upgradeUplift: 0.5,
    startNewCustomers: 10,
  });
  // Nach dem ersten Monat sind 10 % der zehn Kunden hochgestuft.
  assert.equal(round2(r.months[0].upgraded), 1);
  assert.ok(r.months[0].upgraded < r.months[0].customers);
  // Und der Anteil wächst, ohne die Kundenzahl je zu überholen.
  for (const m of r.months) assert.ok(m.upgraded <= m.customers + 1e-9);
});

test("nur der Aufschlag zählt zu Expand — der Grundumsatz steckt in Land", () => {
  const r = computeGoal({
    ...BASE,
    expandOn: true,
    upgradeSharePerYear: 12, // sofort alle
    upgradeUplift: 0.5,
    startNewCustomers: 1,
  });
  const m = r.months[0];
  assert.equal(round2(m.upgraded), 1);
  assert.equal(round2(m.land), 20); // 1 Kunde × 20 k€
  assert.equal(round2(m.expand), 10); // 50 % Aufschlag auf 20 k€
  assert.equal(round2(m.total), 30);
});

test("der Satz skaliert den Aufschlag linear", () => {
  const at = (uplift: number) =>
    computeGoal({ ...BASE, expandOn: true, upgradeSharePerYear: 12, upgradeUplift: uplift, startNewCustomers: 1 })
      .months[0].expand;
  assert.equal(round2(at(0.5)), 10);
  assert.equal(round2(at(1)), 20);
  assert.equal(at(0), 0);
});

test("ein größerer hochgestufter Anteil bringt mehr, ohne einen Kunden mehr", () => {
  const few = computeGoal({ ...BASE, expandOn: true, upgradeSharePerYear: 0.2, upgradeUplift: 0.6 });
  const many = computeGoal({ ...BASE, expandOn: true, upgradeSharePerYear: 0.8, upgradeUplift: 0.6 });
  assert.equal(round2(few.months[23].customers), round2(many.months[23].customers));
  assert.ok(many.months[23].expand > few.months[23].expand);
});

test("Expand aus heißt Aufschlag null", () => {
  const r = computeGoal({ ...BASE, expandOn: false, upgradeSharePerYear: 1, upgradeUplift: 1 });
  assert.equal(r.contribution.expand, 0);
  assert.equal(r.months.reduce((a, m) => a + m.upgraded, 0), 0);
});

/* ── Channel ─────────────────────────────────────────────────── */

test("ein Partner bringt Endkunden, an die wir nie verkauft haben", () => {
  const r = computeGoal({
    ...BASE,
    channelOn: true,
    partnersPerYear: 12,
    endCustomersPerPartner: 10,
    partnerRampMonths: 1,
    partnerShare: 0.5,
  });
  assert.equal(r.months[0].partners, 1);
  assert.equal(r.months[0].endCustomers, 10);
  assert.equal(r.months[0].channel, 10 * 20 * 0.5);
});

test("die Partner-Hochlaufkurve staffelt die Reichweite", () => {
  const r = computeGoal({ ...BASE, channelOn: true, partnersPerYear: 12, endCustomersPerPartner: 8, partnerRampMonths: 4 });
  assert.equal(r.months[0].endCustomers, 2);
  assert.equal(r.months[3].endCustomers, 8 + 6 + 4 + 2);
});

test("eine Motion verändert nur ihre eigene Schicht, nicht die darunter", () => {
  const base = { ...BASE, expandOn: true, upgradeSharePerYear: 0.4, upgradeUplift: 0.5 };
  const off = computeGoal({ ...base, channelOn: false });
  const on = computeGoal({ ...base, channelOn: true, partnersPerYear: 6, endCustomersPerPartner: 10 });

  assert.equal(off.reach.land, on.reach.land);
  assert.equal(off.reach.landExpand, on.reach.landExpand);
  for (let m = 0; m < off.months.length; m++) {
    assert.equal(round2(on.months[m].land), round2(off.months[m].land));
    assert.equal(round2(on.months[m].expand), round2(off.months[m].expand));
  }
  const noExpand = computeGoal({ ...BASE, expandOn: false });
  assert.equal(noExpand.reach.land, off.reach.land);
});

test("die Monatszeilen addieren sich zur Gesamtlinie", () => {
  const r = computeGoal({ ...BASE, expandOn: true, upgradeSharePerYear: 0.3, upgradeUplift: 0.5, channelOn: true });
  for (const m of r.months) assert.equal(round2(m.total), round2(m.land + m.expand + m.channel));
});

/* ── Auf das Ziel rechnen ────────────────────────────────────── */

test("ein ehrgeiziges Ziel liefert die nötige Wachstumsrate statt einer Fehlanzeige", () => {
  // 1 Mio. in sechs Monaten: mit den Ausgangswerten unerreichbar.
  const steep: GoalInputs = { ...BASE, targetARR: 1000, horizonMonths: 6, acquisitionGrowth: 0.05 };
  assert.ok(computeGoal(steep).endARR < 1000);

  const g = growthForTarget(steep);
  assert.ok(g !== null && g > 0, "eine Rate muss gefunden werden");

  // Und mit dieser Rate steht das Ziel am Ende des Zeitraums tatsächlich.
  const solved = computeGoal({ ...steep, acquisitionGrowth: g! });
  assert.ok(solved.endARR >= 1000 - 1, `erreicht ${round2(solved.endARR)}`);
  assert.ok(solved.reach.all != null && solved.reach.all <= 5);
  // Die Rate ist knapp, nicht großzügig: etwas weniger reicht nicht mehr.
  assert.ok(computeGoal({ ...steep, acquisitionGrowth: g! * 0.9 }).endARR < 1000);
});

test("wenn schon die Ausgangswerte reichen, ist kein Wachstum nötig", () => {
  const easy = { ...BASE, targetARR: 20, horizonMonths: 12, startNewCustomers: 5 };
  assert.equal(growthForTarget(easy), 0);
});

test("ein physikalisch unmögliches Ziel liefert null statt einer Fantasiezahl", () => {
  assert.equal(growthForTarget({ ...BASE, targetARR: 1e12, horizonMonths: 2 }), null);
  assert.equal(growthForTarget({ ...BASE, targetARR: 100, pricePerCampaign: 0, horizonMonths: 6 }), null);
});

test("größer anfangen ist die Alternative zu schneller wachsen", () => {
  const steep: GoalInputs = { ...BASE, targetARR: 1000, horizonMonths: 6, acquisitionGrowth: 0.05 };
  const s = startForTarget(steep);
  assert.ok(s !== null && s > BASE.startNewCustomers);
  const solved = computeGoal({ ...steep, startNewCustomers: s! });
  assert.ok(solved.endARR >= 1000 - 1);
});

test("mehr Motions senken die nötige Akquise-Steigung", () => {
  const bare: GoalInputs = { ...BASE, targetARR: 600, horizonMonths: 18 };
  const withMotions: GoalInputs = {
    ...bare,
    expandOn: true,
    upgradeSharePerYear: 0.5,
    upgradeUplift: 0.6,
    channelOn: true,
    partnersPerYear: 6,
    endCustomersPerPartner: 8,
  };
  const a = growthForTarget(bare);
  const b = growthForTarget(withMotions);
  assert.ok(a !== null && b !== null);
  assert.ok(b! < a!, `Motions müssen entlasten: ${round2(b!)} gegen ${round2(a!)}`);
});

test("der Zielanteil sagt, wie weit man kommt, wenn es nicht reicht", () => {
  const r = computeGoal({ ...BASE, targetARR: 1000, horizonMonths: 6, acquisitionGrowth: 0 });
  assert.ok(r.targetShare > 0 && r.targetShare < 1);
  assert.equal(round2(r.targetShare), round2(r.endARR / 1000));
  assert.equal(r.reach.all, null);
});

/* ── Neukunden je Monat: Formel, aber überschreibbar ─────────── */

test("ohne Eintrag schreibt die Wachstumsformel fort", () => {
  const i = { ...BASE, startNewCustomers: 2, acquisitionGrowth: 0.1 };
  assert.equal(newCustomersAt(i, 0), 2);
  assert.equal(round2(newCustomersAt(i, 3)), round2(2 * Math.pow(1.1, 3)));
});

test("ein von Hand gesetzter Monat schlägt die Formel — nur dieser", () => {
  const i = { ...BASE, startNewCustomers: 2, acquisitionGrowth: 0.1, newCustomerOverrides: { 2: 9 } };
  assert.equal(newCustomersAt(i, 2), 9);
  assert.equal(round2(newCustomersAt(i, 3)), round2(2 * Math.pow(1.1, 3)));

  const { months } = computeGoal(i);
  assert.equal(months[2].newCustomers, 9);
  assert.equal(months[2].overridden, true);
  assert.equal(months[3].overridden, false);
});

test("gesetzte Monate wirken sich auf Bestand und Umsatz aus", () => {
  const plain = computeGoal({ ...BASE, startNewCustomers: 1 });
  const spike = computeGoal({ ...BASE, startNewCustomers: 1, newCustomerOverrides: { 0: 11 } });
  assert.equal(round2(spike.months[0].customers - plain.months[0].customers), 10);
  assert.ok(spike.endARR > plain.endARR);
});

/* ── Vom Kunden zum Termin ───────────────────────────────────── */

test("Erstgespräche folgen aus der Conversion", () => {
  // Zwei Abschlüsse bei 20 % brauchen zehn Erstgespräche.
  const l = callLoad({ ...BASE, conversionRate: 0.2, callsToClose: 1 }, 2);
  assert.equal(l.firstCalls, 10);
  assert.equal(l.totalCalls, 10);
});

test("Nachfassen kommt oben drauf, aber nur für die Abschlüsse", () => {
  const l = callLoad({ ...BASE, conversionRate: 0.2, callsToClose: 3 }, 2);
  assert.equal(l.firstCalls, 10);
  assert.equal(l.totalCalls, 10 + 2 * 2); // zwei Abschlüsse, je zwei Nachfass-Calls
});

test("Calls pro Woche und Stunden folgen aus der Call-Länge", () => {
  const l = callLoad({ ...BASE, conversionRate: 0.25, callsToClose: 1, callMinutes: 30 }, 13);
  assert.equal(l.totalCalls, 52); // 13 / 0,25
  assert.equal(round2(l.callsPerWeek), 12); // 52 / (52/12)
  assert.equal(round2(l.hoursPerWeek), 6); // 12 × 30 min
});

test("eine bessere Conversion senkt die Termine, nicht die Abschlüsse", () => {
  const bad = callLoad({ ...BASE, conversionRate: 0.1 }, 5);
  const good = callLoad({ ...BASE, conversionRate: 0.4 }, 5);
  assert.ok(good.firstCalls < bad.firstCalls);
  assert.equal(round2(good.firstCalls * 4), round2(bad.firstCalls));
});

test("die Termine wachsen mit der Neukundenrate mit", () => {
  const { months } = computeGoal({ ...BASE, startNewCustomers: 1, acquisitionGrowth: 0.1 });
  assert.ok(months[23].callsPerWeek > months[0].callsPerWeek * 5);
});

/* ── Wege zum Ziel ───────────────────────────────────────────── */

test("drei Wege zum selben Ziel, und jede Motion nimmt Vertriebsdruck ab", () => {
  const i: GoalInputs = {
    ...BASE,
    targetARR: 800,
    horizonMonths: 18,
    expandOn: true,
    upgradeSharePerYear: 0.5,
    upgradeUplift: 0.6,
    channelOn: true,
    partnersPerYear: 6,
    endCustomersPerPartner: 8,
  };
  const [land, landExpand, all] = routesToTarget(i);

  assert.equal(land.key, "land");
  assert.ok(land.growth !== null && landExpand.growth !== null && all.growth !== null);
  assert.ok(landExpand.growth! < land.growth!, "Expand muss entlasten");
  assert.ok(all.growth! < landExpand.growth!, "Channel muss zusätzlich entlasten");

  // Weniger Akquisedruck heißt auch weniger Termine.
  assert.ok(all.callsPerWeek < land.callsPerWeek);
});

test("jeder Weg lässt sich anwenden und trifft das Ziel dann wirklich", () => {
  const i: GoalInputs = {
    ...BASE,
    targetARR: 800,
    horizonMonths: 18,
    upgradeSharePerYear: 0.5,
    upgradeUplift: 0.6,
    partnersPerYear: 6,
    endCustomersPerPartner: 8,
  };
  for (const route of routesToTarget(i)) {
    if (route.growth == null) continue;
    const applied = computeGoal({ ...i, ...route.apply });
    assert.ok(applied.endARR >= i.targetARR - 1, `${route.key} erreicht nur ${round2(applied.endARR)}`);
  }
});

test("ein Weg, der nicht trägt, meldet das statt zu schummeln", () => {
  const brutal: GoalInputs = { ...BASE, targetARR: 1e9, horizonMonths: 3 };
  for (const route of routesToTarget(brutal)) assert.equal(route.growth, null);
});
