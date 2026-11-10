/* ══════════════════════════════════════════════════════════════
   Palettio — the engine.

   The loop is: you stand on a milestone, you pick one measure out of
   a deck, months pass, and you find out what it did. You do not find
   out before. Cost and duration are on the card because they are
   planning inputs; the effect is not, because learning what a trade
   fair actually buys you is the thing the game is for. The effects
   are fixed rather than rolled — unknown is not the same as random,
   and on the second run you know what the fair does, which is the
   reason to play it again.

   Two kinds of pressure, because the market has two.

   A clock. Your runway, in months, counted down in real time and
   jumped forward by every measure you start. Four months at a trade
   fair are four months. It is the number founders actually watch and
   it is the big thing on the screen.

   And a rival. Retoura in Rotterdam is doing the same thing, moves on
   its own, and moves faster once it has raised. A countdown is a
   number going down; a competitor passing you takes the trade fair
   stand, the 90-truck account and your investor's attention, which is
   what being late actually feels like.

   Underneath both: Jonas, who has an opinion about how this company
   should be funded and does not announce it. Every large decision
   quietly agrees or disagrees with him, and a run can end in the
   first chapter because the two of you never had the conversation.

   Pure functions, no DOM — see simulator.test.ts.
   ══════════════════════════════════════════════════════════════ */

export type MeterKey = "runway" | "mrr" | "customers" | "investors" | "team" | "equity";

/** What Jonas thinks this company should be. He will not volunteer it. */
export type Stance = "bootstrap" | "venture";

export type Effects = {
  cash?: number;
  /** Your own salary, while you still have one. Set to 0 by quitting. */
  salary?: number;
  /** Replaces rather than adds — quitting sets it to nothing. */
  salaryTo?: number;
  /** Monthly recurring revenue, €. */
  mrr?: number;
  /** Paying forwarders, counted in whole companies. */
  customers?: number;
  investors?: number;
  /** Cohesion, not headcount. */
  team?: number;
  /** How finished the thing is, 0–100. Gates what sales can close. */
  product?: number;
  equity?: number;
  /** Fixed costs per month, €. */
  burn?: number;
  headcount?: number;
  /** Agreement with Jonas about the path. */
  alignment?: number;
};

/** Wie stark eine Maßnahme worauf einzahlt — als Balken, nicht als Zahl.
    Fünf Stufen, weil fünf Punkte man auf einen Blick zählt. */
export type Impact = Partial<Record<"produkt" | "umsatz" | "geld" | "team" | "investoren", 1 | 2 | 3 | 4 | 5>>;

export type Tactic = {
  id: string;
  label: string;
  /** Gruppe in der Liste: Produkt, Vertrieb, Team, Geld. */
  group: string;
  /** Ein Satz auf der Detailkarte. */
  flavour: string;
  /** Was sie bewegt, grob und sichtbar vor dem Start. */
  impact: Impact;
  /** € out of the bank the moment you commit. */
  cost?: number;
  months: number;
  /** Hidden until it resolves. */
  effects: Effects;
  /** Where alignment depends on what Jonas wants. */
  alignmentBy?: Record<Stance, number>;
  /** Two beats, like everything else: what happened, then what it did. */
  beats: [string, string];
  /** Where the story depends on what Jonas turns out to want. */
  beatsBy?: Record<Stance, [string, string]>;
  /** Only offered when this holds. */
  when?: (s: GameState) => boolean;
  /** Offered once per run. Most are. */
  repeatable?: boolean;
};

export type Milestone = {
  id: string;
  title: string;
  /** The question this stage answers. */
  blurb: string;
  image: string;
  /** What has to be true to move on. */
  gate: (s: GameState) => boolean;
  /** What the gate reads as, for the player. */
  gateLabel: string;
  tactics: string[];
  /** Fires on arrival, when its condition holds. The stage itself can
      do something to you — reaching the first invoice while still
      employed is not a state anybody's employer tolerates. */
  onEnter?: { title: string; beats: [string, string]; effects: Effects; when?: (s: GameState) => boolean };
  next: string | null;
};

/** Eine Ereigniskarte. Kommt ungefragt, trifft meist etwas anderes als
    das, woran man gerade arbeitet. */
export type GameEvent = {
  id: string;
  title: string;
  beats: [string, string];
  effects: Effects;
  /** Nur in dieser Phase, oder in jeder. */
  milestone?: string;
  when?: (s: GameState) => boolean;
};

export type RivalStep = {
  /** Fires when Retoura's own progress passes this. */
  at: number;
  label: string;
  beats: [string, string];
  effects: Effects;
};

export type Ending = {
  id: string;
  title: string;
  text: string;
  image: string;
  tone: "win" | "mixed" | "loss";
  payout?: (s: GameState) => string;
};

/** Eine laufende Maßnahme auf dem Brett. */
export type Running = { id: string; left: number; total: number };

export type GameState = {
  cash: number;
  burn: number;
  /** Income from the job you have not quit yet, €/month. */
  salary: number;
  mrr: number;
  customers: number;
  investors: number;
  team: number;
  headcount: number;
  product: number;
  equity: number;
  alignment: number;
  /** Jonas's leaning. Discoverable, never printed. */
  stance: Stance;
  month: number;
  milestoneId: string;
  /** Schon benutzt — jede Karte nur einmal. */
  used: string[];
  /** Läuft gerade, mit Restmonaten. */
  running: Running[];
  /** Gerade fertig geworden — wird von der Oberfläche abgeräumt. */
  justDone: string[];
  /** Retoura's progress, 0–100. */
  rival: number;
  rivalSeen: number[];
  endingId: string | null;
  /** Gezogene Ereigniskarten, damit keine zweimal kommt. */
  drawn: string[];
  /** Monat der letzten Ereigniskarte — sie sollen nicht im Rudel kommen. */
  lastEvent: number;
  /** Liquidationspräferenz aus der Runde, die man genommen hat. */
  pref: "1x" | "2x" | null;
  seed: number;
};

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

/* ── The clock ───────────────────────────────────────────────── */

/**
 * What actually leaves the account in a month.
 *
 * The salary matters more than anything else in the first year, and
 * leaving it out was why every simulated run died in month eight: Lena
 * is still employed at the start, so there is no countdown yet. The
 * clock becomes real the month she hands in her notice, which is the
 * point — that decision should be visible as the runway dropping from
 * nothing-to-worry-about to a number of months.
 */
export function netBurn(s: GameState): number {
  const serving = Math.round(s.customers * 180);
  return s.burn + serving - s.mrr - s.salary;
}

/**
 * The big number. Months of cash at the current net burn, or Infinity
 * once the month pays for itself — which is the only way to stop the
 * clock without raising.
 */
export function runway(s: GameState): number {
  const net = netBurn(s);
  if (net <= 0) return Infinity;
  return Math.max(0, Math.floor(s.cash / net));
}

export function initialState(seed = 1): GameState {
  return {
    cash: 18_000,
    burn: 1_900,
    salary: 2_300,
    mrr: 0,
    customers: 0,
    investors: 12,
    team: 70,
    headcount: 2,
    product: 12,
    equity: 100,
    alignment: 60,
    stance: seed % 2 === 0 ? "bootstrap" : "venture",
    month: 0,
    milestoneId: "mvp",
    used: [],
    running: [],
    justDone: [],
    rival: 8,
    rivalSeen: [],
    endingId: null,
    drawn: [],
    lastEvent: 0,
    pref: null,
    seed,
  };
}

export function applyEffects(s: GameState, e: Effects | undefined): GameState {
  if (!e) return s;
  return {
    ...s,
    cash: s.cash + (e.cash ?? 0),
    mrr: Math.max(0, s.mrr + (e.mrr ?? 0)),
    customers: Math.max(0, s.customers + (e.customers ?? 0)),
    investors: clamp(s.investors + (e.investors ?? 0)),
    team: clamp(s.team + (e.team ?? 0)),
    product: clamp(s.product + (e.product ?? 0)),
    /* Equity only ever goes down. There is no scene that gives it back. */
    equity: clamp(s.equity + Math.min(0, e.equity ?? 0)),
    burn: Math.max(0, s.burn + (e.burn ?? 0)),
    salary: Math.max(0, e.salaryTo !== undefined ? e.salaryTo : s.salary + (e.salary ?? 0)),
    headcount: Math.max(1, s.headcount + (e.headcount ?? 0)),
    alignment: clamp(s.alignment + (e.alignment ?? 0)),
  };
}

/**
 * One month.
 *
 * Cash leaves, Retoura gets on with it, and investor attention decays
 * once there is any to lose. Retoura moves faster the better funded it
 * is, which is why being overtaken compounds.
 */
export function tick(s: GameState): GameState {
  /* Fast enough that the race is a race: at this pace Retoura passes
     two or three of its own milestones inside a normal run, instead of
     being a bar that creeps. */
  const rivalSpeed = 1.4 + s.rival / 55;
  return {
    ...s,
    month: s.month + 1,
    cash: s.cash - netBurn(s),
    rival: clamp(s.rival + rivalSpeed),
    investors: clamp(s.investors - (s.investors > 25 && s.month % 3 === 0 ? 1 : 0)),
  };
}

export function advance(s: GameState, months: number): GameState {
  let out = s;
  for (let i = 0; i < Math.max(0, months); i++) out = tick(out);
  return out;
}

/* ── Measures ────────────────────────────────────────────────── */

/** The two beats to show, given what Jonas happens to want. */
export function beatsOf(t: Tactic, stance: Stance): [string, string] {
  return t.beatsBy ? t.beatsBy[stance] : t.beats;
}

/** Alignment for this tactic, given what Jonas happens to want. */
export function alignmentOf(t: Tactic, stance: Stance): number {
  if (t.alignmentBy) return t.alignmentBy[stance];
  return t.effects.alignment ?? 0;
}

/**
 * Wie viele Maßnahmen gleichzeitig laufen dürfen.
 *
 * So viele, wie ihr Köpfe seid. Zu zweit zwei — das ist der Grund,
 * warum eine Einstellung sich sofort anders anfühlt, und der Grund,
 * warum man nicht alles gleichzeitig kann.
 */
export function capacity(s: GameState): number {
  return Math.max(1, s.headcount);
}

/**
 * Startbar?
 *
 * Kopf frei, nicht schon benutzt — und bezahlbar. Das Letzte fehlte,
 * und die Simulation hat es sofort gefunden: sie buchte Messestand und
 * Frachtbörse mit 8.000 € auf dem Konto und war im sechsten Monat
 * pleite, ohne dass je eine Entscheidung falsch gewesen wäre.
 */
export function canStart(s: GameState, t: Tactic): boolean {
  if (s.running.length >= capacity(s)) return false;
  if (s.running.some((r) => r.id === t.id) || s.used.includes(t.id)) return false;
  /* Und mit zwei Monaten Puffer: niemand bucht einen Messestand von
     seinem letzten Euro, und ein Spiel, in dem genau das der häufigste
     Tod ist, bestraft Rechnen statt Entscheiden. */
  const puffer = Math.max(0, netBurn(s)) * 2;
  return s.cash - (t.cost ?? 0) >= puffer;
}

/** Warum nicht — für die Beschriftung des Knopfs. */
export function blockedReason(s: GameState, t: Tactic): string | null {
  if (s.used.includes(t.id) || s.running.some((r) => r.id === t.id)) return "Läuft schon";
  if (s.cash - (t.cost ?? 0) < Math.max(0, netBurn(s)) * 2) return "Zu teuer";
  if (s.running.length >= capacity(s)) return "Kein Kopf frei";
  return null;
}

/** Maßnahme starten: Geld ist sofort weg, die Wirkung kommt später. */
export function startTactic(s: GameState, t: Tactic): GameState {
  return {
    ...s,
    cash: s.cash - (t.cost ?? 0),
    used: [...s.used, t.id],
    running: [...s.running, { id: t.id, left: Math.max(1, t.months), total: Math.max(1, t.months) }],
  };
}

/** Auflösen, wenn die Zeit um ist. */
export function finishTactic(s: GameState, t: Tactic): GameState {
  const done = applyEffects(s, t.effects);
  return {
    ...done,
    alignment: clamp(done.alignment + alignmentOf(t, s.stance)),
    running: done.running.filter((r) => r.id !== t.id),
  };
}

/**
 * Ein Monat auf dem Brett.
 *
 * Was fertig wird, landet in `justDone` im Zustand statt in einem
 * Rückgabewert, den die Oberfläche mitten im State-Updater verarbeiten
 * müsste. Genau das war der Fehler: der Updater rief setCards auf, React
 * rechnete ihn mehrfach, die Komponente rendert neu, und das Intervall
 * wurde vor jedem Feuern neu aufgesetzt — die Uhr stand still.
 */
export function tickBoard(s: GameState): { state: GameState; done: string[] } {
  const next = tick(s);
  const running = next.running.map((r) => ({ ...r, left: r.left - 1 }));
  const done = running.filter((r) => r.left <= 0).map((r) => r.id);
  return { state: { ...next, running, justDone: done }, done };
}

/** Nur fürs Testen und den Balance-Lauf: starten, warten, auflösen. */
export function runTactic(s: GameState, t: Tactic): GameState {
  const gestartet = startTactic(s, t);
  const spaeter = advance(gestartet, t.months);
  return finishTactic({ ...spaeter, running: spaeter.running.filter((r) => r.id !== t.id) }, t);
}

/** The deck for this milestone: not used yet, and allowed right now. */
export function deckFor(s: GameState, milestone: Milestone, all: Record<string, Tactic>): Tactic[] {
  return milestone.tactics
    .map((id) => all[id])
    .filter((t): t is Tactic => !!t)
    .filter((t) => (t.repeatable || !s.used.includes(t.id) || s.running.some((r) => r.id === t.id)) && (!t.when || t.when(s)));
}

/* ── Ereigniskarten ──────────────────────────────────────────── */

/** Mulberry32 — klein, schnell, reicht zum Ziehen einer Karte. */
function rand(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Alle drei Monate höchstens eine, und jede nur einmal im Spiel. */
export function eventDue(s: GameState): boolean {
  return s.month >= 3 && s.month - s.lastEvent >= 3;
}

export function drawEvent(s: GameState, all: GameEvent[]): GameEvent | null {
  const offen = all.filter(
    (e) => !s.drawn.includes(e.id) && (!e.milestone || e.milestone === s.milestoneId) && (!e.when || e.when(s)),
  );
  if (!offen.length) return null;
  return offen[Math.floor(rand(s.seed + s.month) * offen.length) % offen.length];
}

/* ── The rival ───────────────────────────────────────────────── */

/** Retoura's next move, if it has reached one you have not seen. */
export function rivalMove(s: GameState, steps: RivalStep[]): RivalStep | null {
  const due = steps.filter((st) => s.rival >= st.at && !s.rivalSeen.includes(st.at));
  return due.length ? due[0] : null;
}

/* ── Where a run ends ────────────────────────────────────────── */

export function forcedEnding(s: GameState): string | null {
  if (s.cash <= 0) return "insolvent";
  /* Losing Jonas before there is a company is the end of the company.
     Later it is a bad quarter and a smaller cap table. */
  if (s.alignment <= 0 && s.customers === 0) return "split";
  if (s.rival >= 100 && s.customers < 8) return "outrun";
  return null;
}

/* ── Display ─────────────────────────────────────────────────── */

export type MeterView = { key: MeterKey; label: string; value: string; fill: number; tone: "ok" | "warn" | "bad" };

export function meterViews(s: GameState): MeterView[] {
  const r = runway(s);
  return [
    {
      key: "mrr",
      label: "MRR",
      value: fmtEuro(s.mrr),
      fill: clamp((s.mrr / 12_000) * 100),
      tone: s.mrr > 0 ? "ok" : "warn",
    },
    {
      key: "customers",
      label: "Kunden",
      value: String(s.customers),
      fill: clamp((s.customers / 20) * 100),
      tone: s.customers > 0 ? "ok" : "warn",
    },
    {
      key: "investors",
      label: "Investoren",
      value: `${Math.round(s.investors)}%`,
      fill: s.investors,
      tone: s.investors <= 20 ? "bad" : s.investors <= 40 ? "warn" : "ok",
    },
    {
      key: "team",
      label: "Team",
      value: `${Math.round(s.team)}%`,
      fill: s.team,
      tone: s.team <= 30 ? "bad" : s.team <= 50 ? "warn" : "ok",
    },
    {
      key: "equity",
      label: "Deine Anteile",
      value: `${Math.round(s.equity)}%`,
      fill: s.equity,
      tone: s.equity < 50 ? "warn" : "ok",
    },
  ].map((m) => ({ ...m, fill: clamp(m.fill) })) as MeterView[];
}

export function fmtEuro(v: number): string {
  if (!isFinite(v)) return "–";
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M €`;
  if (a >= 10_000) return `${Math.round(v / 1000)}k €`;
  if (a >= 1000) return `${(v / 1000).toFixed(1)}k €`;
  return `${Math.round(v)} €`;
}

/** The badges on a result card. */
export function badges(e: Effects | undefined): { label: string; up: boolean }[] {
  if (!e) return [];
  const out: { label: string; up: boolean }[] = [];
  const push = (v: number | undefined, fmt: (n: number) => string, goodUp = true) => {
    if (!v) return;
    out.push({ label: fmt(Math.abs(v)), up: goodUp ? v > 0 : v < 0 });
  };
  push(e.cash, (n) => `${(e.cash ?? 0) > 0 ? "+" : "−"}${fmtEuro(n)}`);
  push(e.mrr, (n) => `${(e.mrr ?? 0) > 0 ? "+" : "−"}${fmtEuro(n)} MRR`);
  push(e.customers, (n) => `${(e.customers ?? 0) > 0 ? "+" : "−"}${n} ${n === 1 ? "Kunde" : "Kunden"}`);
  push(e.product, (n) => `${(e.product ?? 0) > 0 ? "+" : "−"}${n} Produkt`);
  push(e.investors, (n) => `${(e.investors ?? 0) > 0 ? "+" : "−"}${n} Investoren`);
  push(e.team, (n) => `${(e.team ?? 0) > 0 ? "+" : "−"}${n} Team`);
  push(e.headcount, (n) => `${(e.headcount ?? 0) > 0 ? "+" : "−"}${n} auf der Gehaltsliste`);
  push(e.burn, (n) => `${(e.burn ?? 0) > 0 ? "+" : "−"}${fmtEuro(n)}/Monat Fixkosten`, false);
  push(e.equity, (n) => `−${n} % der Firma`, false);
  return out;
}
