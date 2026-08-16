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
   Steigung: Land krümmt sich, weil die Neukundenrate selbst wächst,
   Expand wächst auf dem Bestand, den Land schon bezahlt hat, und
   Channel bringt je Abschluss gleich eine ganze Mandantenliste.

   Und wenn ein Ziel im gegebenen Zeitraum nicht aufgeht, ist die
   Antwort nicht „nicht erreichbar", sondern die Steigung, die es
   bräuchte — samt dem, was diese Steigung an Neukunden und Budget
   bedeutet. Erst daran lässt sich beurteilen, ob das Ziel realistisch
   ist oder das Preismodell nicht trägt.

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

  /* ── Akquise ──
     Nicht eine feste Zahl Neukunden im Monat, sondern eine Rate, die selbst
     wächst: im ersten Monat einer, ein halbes Jahr später vielleicht drei.
     Genau deshalb ist die Land-Kurve gekrümmt und keine Gerade — eine
     konstante Neukundenrate wäre die Annahme, dass sich in der Akquise nie
     etwas verbessert. */
  startNewCustomers: number;
  /** Monatliches Wachstum der Neukundenrate. */
  acquisitionGrowth: number;
  /** Einzelne Monate von Hand gesetzt — schlägt die Wachstumsformel.
      Damit ist die Kurve kein Modellartefakt mehr: wo du weißt, was
      kommt, trägst du es ein, und nur der Rest wird fortgeschrieben. */
  newCustomerOverrides: Record<number, number>;

  /* ── Vertriebstrichter ──
     Was „zwei Neukunden im Monat" an Terminen bedeutet. Die Kette bricht
     bis auf Calls pro Woche herunter, weil das die Einheit ist, in der
     man merkt, ob ein Plan an der Wirklichkeit vorbeigeht. */
  /** Anteil der Erstgespräche, aus denen ein Abschluss wird. */
  conversionRate: number;
  /** Calls, die ein gewonnener Abschluss insgesamt braucht. */
  callsToClose: number;
  /** Länge eines Calls in Minuten. */
  callMinutes: number;

  /** Was ein Neukunde kosten darf, k€. */
  cac: number;
  /** Vollkosten je Interview, €. */
  costPerInterview: number;
  /** Anteil der Kunden, die im Jahr abspringen. */
  churnPerYear: number;

  /* ── Expand ──
     Zwei Zahlen statt einer Wachstumsrate: wie viele Bestandskunden wir im
     Jahr hochstufen, und um welchen Satz. Beides ist etwas, worüber man eine
     Aussage treffen kann — „25 % des Bestands, im Schnitt um 60 %" —, während
     eine pauschale Bestandswachstumsrate nur ein Gefühl ist. */
  expandOn: boolean;
  /** Anteil des Bestands, der im Jahr hochgestuft wird. */
  upgradeSharePerYear: number;
  /** Um welchen Satz der Umsatz eines hochgestuften Kunden steigt. */
  upgradeUplift: number;

  /* ── Channel ── */
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
  /** Umsatz eines hochgestuften Kunden, k€ im Jahr. */
  upgradedArpa: number;
  /** Lieferkosten je Kunde und Jahr, k€. */
  deliveryCost: number;
  contribution: number;
  grossMargin: number;
  /** Kunden, die das Ziel bei diesem Preismodell braucht — ohne Expand. */
  customersNeeded: number;
  cac: number;
  ltv: number;
  ltvCac: number;
  paybackMonths: number;
  lifetimeYears: number;
  /** Gesamtes Akquisebudget bis zum Ziel, k€. */
  acquisitionBudget: number;
  interviewsPerYear: number;
};

export type LayerKey = "land" | "expand" | "channel";

export type GoalMonth = {
  index: number;
  key: string;
  label: string;
  /** Neukunden in diesem Monat — wächst über die Zeit. */
  newCustomers: number;
  /** Ob dieser Monat von Hand gesetzt ist. */
  overridden: boolean;
  customers: number;
  /** Davon bereits hochgestuft. */
  upgraded: number;
  endCustomers: number;
  partners: number;
  land: number;
  expand: number;
  channel: number;
  total: number;
  /** Vertriebsbudget dieses Monats, k€. */
  salesSpend: number;

  /* ── Was das an Terminen heißt ── */
  /** Erstgespräche, die es für die Neukunden dieses Monats braucht. */
  firstCalls: number;
  /** Alle Calls, Nachfassen eingerechnet. */
  totalCalls: number;
  callsPerWeek: number;
  hoursPerWeek: number;
};

export type GoalResult = {
  unit: Unit;
  months: GoalMonth[];
  reach: Record<"land" | "landExpand" | "all", number | null>;
  contribution: Record<LayerKey, number>;
  /** ARR am Ende des Zeitraums. */
  endARR: number;
  /** Anteil des Ziels, der erreicht wird. */
  targetShare: number;
  alternatives: { key: PricingModel; arpa: number; customersNeeded: number; ltvCac: number; grossMargin: number }[];
};

/* ── Preismodell → Umsatz je Kunde ───────────────────────────── */

export function interviewsPerYear(i: GoalInputs): number {
  return i.interviewsPerCampaign * i.campaignsPerYear;
}

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
  // Auch bei der Jahreslizenz liefern wir dieselbe Menge, sie ist nur nicht
  // der Abrechnungsmaßstab — die Kosten fallen trotzdem an.
  const deliveryCost = (ivPerYear * i.costPerInterview) / 1000;
  const contribution = arpa - deliveryCost;
  const grossMargin = arpa > 0 ? contribution / arpa : 0;

  const customersNeeded = arpa > 0 ? i.targetARR / arpa : Infinity;
  const lifetimeYears = i.churnPerYear > 0 ? 1 / i.churnPerYear : Infinity;
  const ltv = contribution * lifetimeYears;
  const ltvCac = i.cac > 0 ? ltv / i.cac : Infinity;
  const paybackMonths = contribution > 0 ? i.cac / (contribution / 12) : Infinity;

  return {
    arpa,
    upgradedArpa: arpa * (1 + i.upgradeUplift),
    deliveryCost,
    contribution,
    grossMargin,
    customersNeeded,
    cac: i.cac,
    ltv,
    ltvCac,
    paybackMonths,
    lifetimeYears,
    acquisitionBudget: isFinite(customersNeeded) ? customersNeeded * i.cac : Infinity,
    interviewsPerYear: ivPerYear,
  };
}

const ramp = (monthsActive: number, rampMonths: number) =>
  rampMonths <= 1 ? 1 : Math.min(1, (monthsActive + 1) / rampMonths);

/** Neukunden im Monat m: der von Hand gesetzte Wert, sonst fortgeschrieben. */
export function newCustomersAt(i: GoalInputs, m: number): number {
  const override = i.newCustomerOverrides[m];
  if (override != null && isFinite(override)) return Math.max(0, override);
  return i.startNewCustomers * Math.pow(1 + i.acquisitionGrowth, m);
}

const WEEKS_PER_MONTH = 52 / 12;

/**
 * Was eine Zahl Neukunden an Gesprächen kostet.
 *
 * Erstgespräche folgen aus der Conversion — für zwei Abschlüsse bei 20 %
 * braucht es zehn. Dazu kommt das Nachfassen, das nur die Abschlüsse
 * verursachen, die auch weiterkommen; die verlorenen Gespräche stecken
 * bereits in der Conversion.
 */
export function callLoad(i: GoalInputs, newCustomers: number) {
  const firstCalls = i.conversionRate > 0 ? newCustomers / i.conversionRate : 0;
  const followUps = newCustomers * Math.max(0, i.callsToClose - 1);
  const totalCalls = firstCalls + followUps;
  const callsPerWeek = totalCalls / WEEKS_PER_MONTH;
  return {
    firstCalls,
    totalCalls,
    callsPerWeek,
    hoursPerWeek: (callsPerWeek * i.callMinutes) / 60,
  };
}

/* ── Der Verlauf ─────────────────────────────────────────────── */

export function computeGoal(i: GoalInputs): GoalResult {
  const n = Math.max(1, Math.round(i.horizonMonths));
  const unit = unitEconomics(i);
  const arpa = unit.arpa;
  const monthlyChurn = i.churnPerYear / 12;
  const upgradeRate = i.expandOn ? i.upgradeSharePerYear / 12 : 0;

  let customers = 0;
  let upgraded = 0;
  let partners = 0;
  let partnerCredit = 0;
  const partnerStarts: number[] = [];
  const months: GoalMonth[] = [];

  for (let m = 0; m < n; m++) {
    // Die Neukundenrate wächst selbst — das ist die Krümmung der Land-Kurve.
    // Wo ein Monat von Hand gesetzt ist, gilt der Wert statt der Formel.
    const newCustomers = newCustomersAt(i, m);
    const overridden = i.newCustomerOverrides[m] != null;

    customers = customers * (1 - monthlyChurn) + newCustomers;

    /* Expand: ein Teil derer, die noch nicht hochgestuft sind, wird es in
       diesem Monat. Der Bestand an Hochgestuften churnt mit, sonst würde er
       die Kundenzahl irgendwann überholen. */
    if (i.expandOn) {
      upgraded = upgraded * (1 - monthlyChurn);
      upgraded += Math.max(0, customers - upgraded) * upgradeRate;
    } else {
      upgraded = 0;
    }

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

    const land = customers * arpa;
    // Nur der Aufschlag zählt zu Expand — der Grundumsatz steckt schon in Land.
    const expand = i.expandOn ? upgraded * arpa * i.upgradeUplift : 0;
    const channel = endCustomers * arpa * i.partnerShare;

    const key = addMonths(i.startMonth, m);
    months.push({
      index: m,
      key,
      label: monthLabel(key),
      newCustomers,
      overridden,
      customers,
      upgraded,
      endCustomers,
      partners,
      land,
      expand,
      channel,
      total: land + expand + channel,
      salesSpend: newCustomers * i.cac,
      ...callLoad(i, newCustomers),
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
    endARR: last.total,
    targetShare: i.targetARR > 0 ? last.total / i.targetARR : 1,
    alternatives: PRICING.filter((p) => p.key !== i.pricing).map((p) => {
      const u = unitEconomics(i, p.key);
      return { key: p.key, arpa: u.arpa, customersNeeded: u.customersNeeded, ltvCac: u.ltvCac, grossMargin: u.grossMargin };
    }),
  };
}

/* ── Auf das Ziel rechnen ────────────────────────────────────────
   Das ist der eigentliche Zweck: nicht melden, dass ein Ziel verfehlt
   wird, sondern ausrechnen, welches Wachstum es bräuchte. Die End-ARR
   steigt monoton mit der Wachstumsrate, also Bisektion. */

const MAX_GROWTH = 3; // 300 % im Monat — jenseits davon ist die Frage müßig

export function growthForTarget(i: GoalInputs): number | null {
  const endARR = (g: number) => computeGoal({ ...i, acquisitionGrowth: g }).endARR;
  if (endARR(MAX_GROWTH) < i.targetARR) return null;
  if (endARR(0) >= i.targetARR) return 0;
  let lo = 0;
  let hi = MAX_GROWTH;
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (endARR(mid) >= i.targetARR) hi = mid;
    else lo = mid;
  }
  return hi;
}

/* ── Wege zum Ziel ───────────────────────────────────────────────
   Ein Ziel hat nie nur einen Weg. Dieselbe Zahl lässt sich über
   Neukunden erreichen, über mehr Umsatz bei denen, die man schon hat,
   oder über Partner — und in aller Regel über eine Mischung. Die drei
   Wege rechnen jeweils aus, wie stark die Akquise wachsen müsste, wenn
   die jeweiligen Motions mitspielen. Der Abstand zwischen ihnen ist,
   was eine Motion an Vertriebsdruck abnimmt.

   Bewusst mit deinen eigenen Expand- und Channel-Zahlen gerechnet, nicht
   mit erfundenen Musterwerten — sonst wäre der Vorschlag nur eine
   andere Art zu raten. */

export type RouteKey = "land" | "landExpand" | "all";

export type Route = {
  key: RouteKey;
  label: string;
  /** Nötiges Wachstum der Neukundenrate, oder null wenn unerreichbar. */
  growth: number | null;
  /** Neukunden im letzten Monat unter diesem Weg. */
  endRate: number;
  /** Calls pro Woche im letzten Monat — der Realitätstest. */
  callsPerWeek: number;
  hoursPerWeek: number;
  /** Eingaben, die dieser Weg setzt. */
  apply: Partial<GoalInputs>;
};

export function routesToTarget(i: GoalInputs): Route[] {
  const variants: { key: RouteKey; label: string; over: Partial<GoalInputs> }[] = [
    { key: "land", label: "Nur Neukunden", over: { expandOn: false, channelOn: false } },
    { key: "landExpand", label: "Mit Expand", over: { expandOn: true, channelOn: false } },
    { key: "all", label: "Mit Expand und Channel", over: { expandOn: true, channelOn: true } },
  ];

  return variants.map(({ key, label, over }) => {
    const base = { ...i, ...over };
    const growth = growthForTarget(base);
    const solved = computeGoal({ ...base, acquisitionGrowth: growth ?? base.acquisitionGrowth });
    const last = solved.months[solved.months.length - 1];
    return {
      key,
      label,
      growth,
      endRate: last.newCustomers,
      callsPerWeek: last.callsPerWeek,
      hoursPerWeek: last.hoursPerWeek,
      apply: { ...over, ...(growth != null ? { acquisitionGrowth: growth } : {}) },
    };
  });
}

/** Wie viele Neukunden im ersten Monat es bräuchte, bei unveränderter
    Wachstumsrate. Die Alternative zu „schneller wachsen": größer anfangen. */
export function startForTarget(i: GoalInputs): number | null {
  const endARR = (s: number) => computeGoal({ ...i, startNewCustomers: s }).endARR;
  if (endARR(1000) < i.targetARR) return null;
  if (endARR(0) >= i.targetARR) return 0;
  let lo = 0;
  let hi = 1000;
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (endARR(mid) >= i.targetARR) hi = mid;
    else lo = mid;
  }
  return hi;
}

/* Platzhalter, keine Benchmarks. Bewusst so gewählt, dass das Ziel nicht
   schon nach vier Monaten steht — sonst bleibt keine Zeit, in der Expand
   und Channel überhaupt etwas bewirken könnten. */
export const DEFAULT_GOAL: GoalInputs = {
  targetARR: 1000,
  startMonth: "2026-09",
  horizonMonths: 24,

  pricing: "perCampaign",
  pricePerInterview: 400,
  pricePerCampaign: 6,
  subscriptionACV: 36,
  interviewsPerCampaign: 12,
  campaignsPerYear: 3,

  startNewCustomers: 1,
  acquisitionGrowth: 0.08,
  newCustomerOverrides: {},

  // 20 % aus dem Erstgespräch und drei Calls bis zur Unterschrift sind für
  // erklärungsbedürftiges B2B eher zügig als vorsichtig gerechnet.
  conversionRate: 0.2,
  callsToClose: 3,
  callMinutes: 30,
  // Rund die Hälfte des ersten Jahresumsatzes — für B2B-Mittelstand eher
  // optimistisch als großzügig.
  cac: 8,
  costPerInterview: 45,
  churnPerYear: 0.25,

  expandOn: true,
  upgradeSharePerYear: 0.25,
  upgradeUplift: 0.6,

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
