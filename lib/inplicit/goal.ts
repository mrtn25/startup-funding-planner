/* ══════════════════════════════════════════════════════════════
   Vom Ziel rückwärts: was 100k ARR eigentlich bedeuten.

   Alles hier ist Arithmetik, kein Modellraten. Die Kette ist kurz
   und in beide Richtungen prüfbar:

     Preismodell  →  Umsatz je Kunde und Jahr (ARPA)
     Ziel-ARR     ÷  ARPA                      →  Kunden
     Kunden       ×  CAC                       →  Akquisebudget
     ARPA − Kosten ÷ Churn                     →  LTV

   Das Preismodell ist der Hebel, den man am leichtesten unterschätzt:
   dieselben 100k ARR sind je nach Abrechnung eine völlig andere Firma.
   Pro Interview abgerechnet braucht es viele Kunden mit kleinem Ticket,
   als Jahreslizenz wenige mit großem — bei gleichem Umsatz völlig
   andere Vertriebs- und Lieferorganisation.

   Und die Motions unterscheiden sich nicht im Umsatz, sondern in der
   Steigung: Land ist linear in der Lieferkapazität, Expand wächst auf
   dem Bestand, den Land schon bezahlt hat, und Channel bringt je
   Abschluss gleich eine ganze Mandantenliste.

   Rein funktional, kein DOM — siehe goal.test.ts.
   ══════════════════════════════════════════════════════════════ */

import { addMonths, monthLabel } from "../months.ts";

export type PricingModel = "perInterview" | "perCampaign" | "subscription";

export const PRICING: { key: PricingModel; label: string; blurb: string }[] = [
  {
    key: "perInterview",
    label: "Pro Interview",
    blurb:
      "Kleinste Einheit, niedrigste Einstiegshürde, aber der Umsatz je Kunde hängt an der Nutzung — und Nutzung schwankt. Am ehesten planbar, wenn du weißt, wie viele Interviews ein Kunde im Jahr wirklich fährt.",
  },
  {
    key: "perCampaign",
    label: "Pro Kampagne",
    blurb:
      "Die Einheit, in der Kunden denken: eine Frage, ein Projekt, ein Ergebnis. Größeres Ticket als je Interview, und der Deckungsbeitrag steigt, sobald eine Kampagne mit weniger Interviews auskommt.",
  },
  {
    key: "subscription",
    label: "Jahreslizenz",
    blurb:
      "Umsatz ist von der Nutzung entkoppelt — planbar und am ehesten das, was in ARR-Multiples bewertet wird. Verlangt aber, dass der Kunde den Wert vor dem ersten Ergebnis glaubt.",
  },
];

export type GoalInputs = {
  /** Was am Ende stehen soll, k€ ARR. */
  targetARR: number;
  startMonth: string;
  horizonMonths: number;

  /* ── Preis ── */
  pricing: PricingModel;
  pricePerInterview: number; // €
  pricePerCampaign: number; // k€
  subscriptionACV: number; // k€ / Jahr
  interviewsPerCampaign: number;
  /** Wie oft ein Kunde im Jahr eine Kampagne fährt. */
  campaignsPerYear: number;

  /* ── Akquise ── */
  newCustomersPerMonth: number;
  /** Alles, was in einem Monat in Vertrieb und Marketing fließt, k€. */
  salesSpendPerMonth: number;
  /** Vollkosten je Interview, €. */
  costPerInterview: number;
  /** Anteil der Kunden, die im Jahr abspringen. */
  churnPerYear: number;

  /* ── Motions ── */
  expandOn: boolean;
  /** Jährliches Wachstum auf dem Bestand — mehr Abteilungen, mehr Standorte. */
  expandPerYear: number;
  channelOn: boolean;
  partnersPerYear: number;
  endCustomersPerPartner: number;
  /** Anteil des Endkundenumsatzes, der bei uns bleibt. */
  partnerShare: number;
  partnerRampMonths: number;
};

export type Unit = {
  /** Umsatz je Kunde und Jahr, k€. */
  arpa: number;
  /** Lieferkosten je Kunde und Jahr, k€. */
  deliveryCost: number;
  /** Deckungsbeitrag je Kunde und Jahr, k€. */
  contribution: number;
  grossMargin: number;
  /** Kunden, die das Ziel bei diesem Preismodell braucht. */
  customersNeeded: number;
  cac: number;
  ltv: number;
  ltvCac: number;
  /** Monate, bis ein Kunde seine Akquisekosten eingespielt hat. */
  paybackMonths: number;
  /** Erwartete Kundenlebensdauer in Jahren. */
  lifetimeYears: number;
  /** Gesamtes Akquisebudget bis zum Ziel, k€. */
  acquisitionBudget: number;
  /** Interviews im Jahr je Kunde. */
  interviewsPerYear: number;
};

export type LayerKey = "land" | "expand" | "channel";

export type GoalMonth = {
  index: number;
  key: string;
  label: string;
  customers: number;
  endCustomers: number;
  partners: number;
  /** ARR aus direkt verkauften Kunden. */
  land: number;
  /** Zusätzliche ARR aus dem Wachstum auf dem Bestand. */
  expand: number;
  /** Zusätzliche ARR über Partner. */
  channel: number;
  /** Land + Expand + Channel, also die Linie, die zählt. */
  total: number;
};

export type GoalResult = {
  unit: Unit;
  months: GoalMonth[];
  /** Monat, in dem die jeweilige Ausbaustufe das Ziel erreicht — oder null. */
  reach: Record<"land" | "landExpand" | "all", number | null>;
  /** Was jede Motion am Ende beisteuert, k€ ARR. */
  contribution: Record<LayerKey, number>;
  /** Dieselbe Rechnung für die beiden anderen Preismodelle. */
  alternatives: { key: PricingModel; arpa: number; customersNeeded: number; ltvCac: number; grossMargin: number }[];
};

/* ── Preismodell → Umsatz je Kunde ───────────────────────────── */

export function interviewsPerYear(i: GoalInputs): number {
  return i.interviewsPerCampaign * i.campaignsPerYear;
}

/** Was ein Kunde im Jahr zahlt, in k€ — die einzige Stelle, an der sich die
    Preismodelle unterscheiden. */
export function arpaFor(i: GoalInputs, model: PricingModel = i.pricing): number {
  switch (model) {
    case "perInterview":
      return (interviewsPerYear(i) * i.pricePerInterview) / 1000;
    case "perCampaign":
      return i.campaignsPerYear * i.pricePerCampaign;
    case "subscription":
      return i.subscriptionACV;
  }
}

/* ── Unit Economics ──────────────────────────────────────────── */

export function unitEconomics(i: GoalInputs, model: PricingModel = i.pricing): Unit {
  const arpa = arpaFor(i, model);
  const ivPerYear = interviewsPerYear(i);
  // Bei der Jahreslizenz liefern wir dieselbe Menge, sie ist nur nicht der
  // Abrechnungsmaßstab — die Kosten fallen trotzdem an.
  const deliveryCost = (ivPerYear * i.costPerInterview) / 1000;
  const contribution = arpa - deliveryCost;
  const grossMargin = arpa > 0 ? contribution / arpa : 0;

  const customersNeeded = arpa > 0 ? i.targetARR / arpa : Infinity;
  const cac = i.newCustomersPerMonth > 0 ? i.salesSpendPerMonth / i.newCustomersPerMonth : Infinity;

  const lifetimeYears = i.churnPerYear > 0 ? 1 / i.churnPerYear : Infinity;
  const ltv = contribution * lifetimeYears;
  const ltvCac = cac > 0 ? ltv / cac : Infinity;
  const paybackMonths = contribution > 0 ? cac / (contribution / 12) : Infinity;

  return {
    arpa,
    deliveryCost,
    contribution,
    grossMargin,
    customersNeeded,
    cac,
    ltv,
    ltvCac,
    paybackMonths,
    lifetimeYears,
    acquisitionBudget: isFinite(customersNeeded) && isFinite(cac) ? customersNeeded * cac : Infinity,
    interviewsPerYear: ivPerYear,
  };
}

const ramp = (monthsActive: number, rampMonths: number) =>
  rampMonths <= 1 ? 1 : Math.min(1, (monthsActive + 1) / rampMonths);

/* ── Der Verlauf ─────────────────────────────────────────────── */

export function computeGoal(i: GoalInputs): GoalResult {
  const n = Math.max(1, Math.round(i.horizonMonths));
  const unit = unitEconomics(i);
  const arpa = unit.arpa;

  const monthlyChurn = i.churnPerYear / 12;
  // Wachstumsraten sind Jahresangaben; monatlich verzinst statt geteilt,
  // sonst kommt über zwölf Monate mehr heraus als angegeben.
  const monthlyExpand = i.expandOn ? Math.pow(1 + i.expandPerYear, 1 / 12) - 1 : 0;

  let customers = 0;
  let expandBase = 0; // k€ ARR, die über dem reinen Land-Umsatz liegen
  let partners = 0;
  let partnerCredit = 0;
  const partnerStarts: number[] = [];

  const months: GoalMonth[] = [];

  for (let m = 0; m < n; m++) {
    // Bestand zuerst altern lassen, dann die Neukunden des Monats dazu.
    customers = customers * (1 - monthlyChurn) + i.newCustomersPerMonth;

    const land = customers * arpa;

    /* Expand wächst auf dem Bestand, den Land bereits bezahlt hat — deshalb
       ist der Term ungefähr das Integral von Land und wird von allein
       steiler, ohne dass ein einziger Kunde dazukommt. */
    if (i.expandOn) {
      expandBase = expandBase * (1 - monthlyChurn) * (1 + monthlyExpand) + land * monthlyExpand;
    }

    /* Channel: ein Abschluss bringt eine ganze Mandantenliste. */
    let endCustomers = 0;
    if (i.channelOn) {
      partnerCredit += i.partnersPerYear / 12;
      const signed = Math.floor(partnerCredit);
      partnerCredit -= signed;
      for (let k = 0; k < signed; k++) partnerStarts.push(m);
      partners += signed;
      for (const s of partnerStarts) {
        endCustomers += i.endCustomersPerPartner * ramp(m - s, i.partnerRampMonths);
      }
    }
    const channel = endCustomers * arpa * i.partnerShare;

    const key = addMonths(i.startMonth, m);
    months.push({
      index: m,
      key,
      label: monthLabel(key),
      customers,
      endCustomers,
      partners,
      land,
      expand: i.expandOn ? expandBase : 0,
      channel,
      total: land + (i.expandOn ? expandBase : 0) + channel,
    });
  }

  const first = (pick: (r: GoalMonth) => number) => {
    const hit = months.find((r) => pick(r) >= i.targetARR);
    return hit ? hit.index : null;
  };

  const last = months[months.length - 1];

  return {
    unit,
    months,
    reach: {
      land: first((r) => r.land),
      landExpand: first((r) => r.land + r.expand),
      all: first((r) => r.total),
    },
    contribution: { land: last.land, expand: last.expand, channel: last.channel },
    alternatives: PRICING.filter((p) => p.key !== i.pricing).map((p) => {
      const u = unitEconomics(i, p.key);
      return {
        key: p.key,
        arpa: u.arpa,
        customersNeeded: u.customersNeeded,
        ltvCac: u.ltvCac,
        grossMargin: u.grossMargin,
      };
    }),
  };
}

/* ── Umkehrfrage ─────────────────────────────────────────────────
   Wie viele Neukunden im Monat es braucht, um das Ziel bis zu einem
   bestimmten Monat zu erreichen. Monoton, also Bisektion. */

export function customersPerMonthFor(i: GoalInputs, byMonth: number): number | null {
  const reaches = (rate: number) => {
    const r = computeGoal({ ...i, newCustomersPerMonth: rate });
    const idx = r.reach.all;
    return idx != null && idx <= byMonth;
  };
  if (!reaches(500)) return null;
  let lo = 0;
  let hi = 500;
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (reaches(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

/* Platzhalter, keine Benchmarks. Bewusst so gewählt, dass das Ziel nicht
   schon nach vier Monaten steht — sonst bleibt keine Zeit, in der Expand
   und Channel überhaupt etwas bewirken könnten, und die Mechanik, um die
   es hier geht, wäre unsichtbar. */
export const DEFAULT_GOAL: GoalInputs = {
  targetARR: 250,
  startMonth: "2026-09",
  horizonMonths: 24,

  pricing: "perCampaign",
  pricePerInterview: 400,
  pricePerCampaign: 6,
  subscriptionACV: 36,
  interviewsPerCampaign: 12,
  campaignsPerYear: 3,

  newCustomersPerMonth: 1,
  // 8 k€ im Monat auf einen Neukunden ist rund die Hälfte des ersten
  // Jahresumsatzes — für B2B-Mittelstand eher optimistisch als großzügig.
  salesSpendPerMonth: 8,
  costPerInterview: 45,
  churnPerYear: 0.25,

  expandOn: true,
  expandPerYear: 0.25,
  channelOn: false,
  partnersPerYear: 3,
  endCustomersPerPartner: 8,
  partnerShare: 0.6,
  partnerRampMonths: 6,
};

/** Ein LTV:CAC unter 1 verbrennt Geld, ab 3 gilt es als tragfähig. */
export function ltvCacVerdict(ratio: number): { tone: "bad" | "warn" | "ok"; text: string } {
  if (!isFinite(ratio)) return { tone: "warn", text: "Ohne Akquisekosten ist das Verhältnis nicht definiert." };
  if (ratio < 1)
    return { tone: "bad", text: "Unter 1: jeder Neukunde kostet mehr, als er über seine Lebensdauer einbringt." };
  if (ratio < 3)
    return { tone: "warn", text: "Zwischen 1 und 3: trägt sich, lässt aber wenig Spielraum für alles andere." };
  return { tone: "ok", text: "Ab 3 gilt eine Akquise gemeinhin als tragfähig genug, um sie hochzufahren." };
}
