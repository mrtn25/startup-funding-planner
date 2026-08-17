/* Tests für das Ziel-Modell.
     node --test lib/inplicit/goal.test.ts
*/

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_GOAL,
  arpaFor,
  baseArpaFor,
  computeGoal,
  callLoad,
  callSummary,
  growthForTarget,
  interviewsPerYear,
  newCustomersAt,
  routesToTarget,
  ltvCacVerdict,
  startForTarget,
  segmentFactor,
  unitEconomics,
  upgradeUpliftFor,
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
  enterpriseShare: 0,      // ein Segment, damit die Zahlen rund bleiben
  enterpriseMultiple: 1,
  expandOn: false,
  upgradeSharePerYear: 0,
  upgradeLagMonths: 0,
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

/* ── Expand: auf die Lizenz, sobald der Kunde so weit ist ───── */

test("der Aufschlag folgt aus dem Lizenzpreis statt geraten zu werden", () => {
  // Pro Kampagne 20 k€, Lizenz 40 k€ → ein Upgrade bringt 20 k€ im Jahr.
  assert.equal(upgradeUpliftFor(BASE), 20);
  // Und der Lizenzpreis wirkt, obwohl nach Kampagne abgerechnet wird.
  assert.equal(upgradeUpliftFor({ ...BASE, subscriptionACV: 60 }), 40);
  // Liegt die Lizenz unter dem laufenden Umsatz, bringt ein Upgrade nichts.
  assert.equal(upgradeUpliftFor({ ...BASE, subscriptionACV: 10 }), 0);
});

test("wer schon auf der Lizenz sitzt, geht eine Segmentstufe höher", () => {
  const onLicence = { ...BASE, pricing: "subscription" as const, enterpriseMultiple: 3 };
  // 40 k€ Lizenz, nächste Stufe das Dreifache → 80 k€ Aufschlag.
  assert.equal(upgradeUpliftFor(onLicence), 80);
});

test("hochstufbar ist erst, wer lange genug dabei ist", () => {
  const i = { ...BASE, expandOn: true, upgradeSharePerYear: 12, upgradeLagMonths: 2, startNewCustomers: 1 };
  const { months } = computeGoal(i);
  // Der erste Kunde landet in Monat 0 und ist ab Monat 2 so weit.
  assert.equal(months[0].upgraded, 0);
  assert.equal(months[1].upgraded, 0);
  assert.ok(months[2].upgraded > 0);
});

test("ohne Wartezeit stuft ein Pilot sofort hoch", () => {
  const i = { ...BASE, expandOn: true, upgradeSharePerYear: 12, upgradeLagMonths: 0, startNewCustomers: 1 };
  const { months } = computeGoal(i);
  assert.equal(round2(months[0].upgraded), 1);
  assert.equal(round2(months[0].land), 20);
  assert.equal(round2(months[0].expand), 20); // Aufschlag auf die Lizenz
  assert.equal(round2(months[0].total), 40);
});

test("eine kürzere Wartezeit bringt Expand früher in Gang", () => {
  const fast = computeGoal({ ...BASE, expandOn: true, upgradeSharePerYear: 1, upgradeLagMonths: 1 });
  const slow = computeGoal({ ...BASE, expandOn: true, upgradeSharePerYear: 1, upgradeLagMonths: 9 });
  assert.ok(fast.months[6].expand > slow.months[6].expand);
});

test("nur der Aufschlag zählt zu Expand — der Grundumsatz steckt in Land", () => {
  const r = computeGoal({ ...BASE, expandOn: true, upgradeSharePerYear: 12, upgradeLagMonths: 0, startNewCustomers: 1 });
  const m = r.months[0];
  assert.equal(round2(m.land), 20);
  assert.equal(round2(m.expand), 20);
  assert.equal(round2(m.total), round2(m.land + m.expand));
});

test("die Hochgestuften überholen nie die Kundenzahl", () => {
  const r = computeGoal({ ...BASE, expandOn: true, upgradeSharePerYear: 12, upgradeLagMonths: 0, startNewCustomers: 10 });
  for (const m of r.months) assert.ok(m.upgraded <= m.customers + 1e-9);
});

test("ein größerer hochgestufter Anteil bringt mehr, ohne einen Kunden mehr", () => {
  const few = computeGoal({ ...BASE, expandOn: true, upgradeSharePerYear: 0.2 });
  const many = computeGoal({ ...BASE, expandOn: true, upgradeSharePerYear: 0.8 });
  assert.equal(round2(few.months[23].customers), round2(many.months[23].customers));
  assert.ok(many.months[23].expand > few.months[23].expand);
});

test("Expand aus heißt Aufschlag null", () => {
  const r = computeGoal({ ...BASE, expandOn: false, upgradeSharePerYear: 1 });
  assert.equal(r.contribution.expand, 0);
  assert.equal(r.months.reduce((a, m) => a + m.upgraded, 0), 0);
});

/* ── Kundengrößen ────────────────────────────────────────────── */

test("große Kunden heben den Schnitt, statt ihn zu verschweigen", () => {
  const mixed = { ...BASE, enterpriseShare: 0.5, enterpriseMultiple: 3 };
  assert.equal(segmentFactor(mixed), 2); // 50 % zahlen das Dreifache
  assert.equal(baseArpaFor(mixed), 20); // kleiner Kunde unverändert
  assert.equal(arpaFor(mixed), 40); // im Schnitt das Doppelte
});

test("ein größerer Schnitt senkt die nötige Kundenzahl", () => {
  const flat = unitEconomics(BASE);
  const mixed = unitEconomics({ ...BASE, enterpriseShare: 0.5, enterpriseMultiple: 3 });
  assert.equal(flat.customersNeeded, 5);
  assert.equal(mixed.customersNeeded, 2.5);
  assert.equal(mixed.arpaSmall, 20);
  assert.equal(mixed.arpaLarge, 60);
});

test("ohne großes Segment ändert der Multiplikator nichts", () => {
  assert.equal(arpaFor({ ...BASE, enterpriseShare: 0, enterpriseMultiple: 9 }), 20);
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
  const base = { ...BASE, expandOn: true, upgradeSharePerYear: 0.4 };
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
  const r = computeGoal({ ...BASE, expandOn: true, upgradeSharePerYear: 0.3, channelOn: true });
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

/* ── Die Kopfzahl folgt dem Verlauf, nicht nur dem Grundpreis ── */

test("mehr Umsatz je Kunde senkt die Kundenzahl, die das Ziel braucht", () => {
  const i = { ...BASE, targetARR: 200, horizonMonths: 36, startNewCustomers: 1, expandOn: true, upgradeSharePerYear: 1, upgradeLagMonths: 1 };
  const cheap = computeGoal({ ...i, subscriptionACV: 25 }).customersAtGoal;
  const dear = computeGoal({ ...i, subscriptionACV: 80 }).customersAtGoal;
  assert.ok(dear < cheap, `teurere Lizenz muss Köpfe sparen: ${round2(dear)} gegen ${round2(cheap)}`);
});

test("größere Kunden senken die Kundenzahl ebenfalls", () => {
  const i = { ...BASE, targetARR: 200, horizonMonths: 36 };
  const flat = computeGoal({ ...i, enterpriseShare: 0 }).customersAtGoal;
  const mixed = computeGoal({ ...i, enterpriseShare: 0.5, enterpriseMultiple: 3 }).customersAtGoal;
  assert.ok(mixed < flat);
});

test("ohne Motions deckt sich die Kopfzahl mit der reinen Preisrechnung", () => {
  const i = { ...BASE, targetARR: 200, horizonMonths: 60, expandOn: false, channelOn: false };
  const r = computeGoal(i);
  // Beim Erreichen des Ziels steht der Bestand knapp über dem rechnerischen Bedarf.
  assert.ok(r.customersAtGoal >= r.unit.customersNeeded - 1e-9);
  assert.ok(r.customersAtGoal < r.unit.customersNeeded + 1.5);
});

/* ── Was das Ziel an Gesprächen kostet ───────────────────────── */

test("die Call-Rechnung bezieht sich auf den Weg bis zum Ziel", () => {
  const i = { ...BASE, targetARR: 100, horizonMonths: 36, startNewCustomers: 1, conversionRate: 0.2, callsToClose: 3 };
  const r = computeGoal(i);
  const c = callSummary(i, r);
  assert.equal(c.reached, true);
  // Fünf Kunden zu 20 k€ — das Ziel steht im fünften Monat.
  assert.equal(c.monthsToGoal, 5);
  assert.equal(r.reach.all, 4);
});

test("Calls pro Tag sind die Woche auf fünf Arbeitstage verteilt", () => {
  const i = { ...BASE, startNewCustomers: 1, conversionRate: 0.2, callsToClose: 3 };
  const c = callSummary(i, computeGoal(i));
  assert.equal(round2(c.avgCallsPerDay), round2(c.avgCallsPerWeek / 5));
  assert.equal(round2(c.peakCallsPerDay), round2(c.peakCallsPerWeek / 5));
});

test("bei wachsender Akquise liegt die Spitze über dem Schnitt", () => {
  const i = { ...BASE, startNewCustomers: 1, acquisitionGrowth: 0.15, targetARR: 400, horizonMonths: 36 };
  const c = callSummary(i, computeGoal(i));
  assert.ok(c.peakCallsPerWeek > c.avgCallsPerWeek, "eine wachsende Rate muss eine Spitze haben");
});

test("bei konstanter Akquise sind Schnitt und Spitze gleich", () => {
  const i = { ...BASE, startNewCustomers: 2, acquisitionGrowth: 0 };
  const c = callSummary(i, computeGoal(i));
  assert.equal(round2(c.avgCallsPerWeek), round2(c.peakCallsPerWeek));
});

test("eine bessere Conversion senkt die Gespräche bis zum Ziel", () => {
  const mk = (cv: number) => {
    const i = { ...BASE, conversionRate: cv, targetARR: 100, horizonMonths: 36 };
    return callSummary(i, computeGoal(i));
  };
  const bad = mk(0.1);
  const good = mk(0.4);
  assert.equal(bad.firstCallsPerDeal, 10);
  assert.equal(good.firstCallsPerDeal, 2.5);
  assert.ok(good.totalCalls < bad.totalCalls);
  // Die Abschlüsse selbst ändern sich dadurch nicht.
  assert.equal(bad.monthsToGoal, good.monthsToGoal);
});

test("ein unerreichtes Ziel rechnet über den ganzen Zeitraum und sagt es", () => {
  const i = { ...BASE, targetARR: 1e6, horizonMonths: 12 };
  const c = callSummary(i, computeGoal(i));
  assert.equal(c.reached, false);
  assert.equal(c.monthsToGoal, 12);
});
