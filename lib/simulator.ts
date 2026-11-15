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

/**
 * Wer was kann.
 *
 * „Zwei Köpfe“ war gelogen. Eine Firma besteht aus Leuten mit einem
 * Fach, und genau daran hängt die Spannung zwischen zwei Gründern:
 * Jonas kann verkaufen und nicht bauen, Lena kann bauen und nicht
 * verkaufen. Wer fünf Monate baut, verkauft in diesen fünf Monaten
 * nichts — und wer verkauft, was es noch nicht gibt, hat es hinterher
 * versprochen.
 */
export type Rolle = "entwicklung" | "vertrieb" | "marketing" | "operations";

export const ROLLE_LABEL: Record<Rolle, string> = {
  entwicklung: "Entwicklung",
  vertrieb: "Vertrieb",
  marketing: "Marketing",
  operations: "Operations",
};

/** Kurz, für die Leiste links. */
export const ROLLE_KURZ: Record<Rolle, string> = {
  entwicklung: "baut",
  vertrieb: "verkauft",
  marketing: "macht sichtbar",
  operations: "hält am Laufen",
};

export type Person = {
  id: string;
  name: string;
  rolle: Rolle;
  /** Gründer zahlen sich nichts. Sie leben vom Ersparten. */
  gruender?: boolean;
  /** Was diese Person im Monat kostet, inklusive Arbeitgeberanteil. */
  kosten: number;
};

/** Was eine Maßnahme an Leuten mitbringt. */
export type Einstellung = { name: string; rolle: Rolle; kosten: number };

export type Effects = {
  cash?: number;
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
  /** Sonstige Fixkosten pro Monat, € — Server, Büro, Buchhaltung.
      Gehälter stehen nicht hier, die hängen an den Leuten. */
  burn?: number;
  /** Wer dazukommt. */
  einstellen?: Einstellung[];
  /** Wer geht: die erste angestellte Person dieser Rolle. */
  verlassen?: Rolle;
  /** Agreement with Jonas about the path. */
  alignment?: number;
};

/** Wie stark eine Maßnahme worauf einzahlt — als Balken, nicht als Zahl.
    Fünf Stufen, weil fünf Punkte man auf einen Blick zählt. */
export type Impact = Partial<Record<"produkt" | "umsatz" | "geld" | "team" | "investoren", 1 | 2 | 3 | 4 | 5>>;

/** Ein Fachwort, das auf der Karte steht und das niemand erklärt bekommt. */
export type Begriff = { wort: string; erklaerung: string; quelle?: { text: string; href: string } };

export type Tactic = {
  id: string;
  label: string;
  /** Gruppe in der Liste: Produkt, Vertrieb, Team, Geld. */
  group: string;
  /** Ein Satz auf der Detailkarte. */
  flavour: string;
  /** Was sie bewegt, grob und sichtbar vor dem Start. */
  impact: Impact;
  /** Wer das macht. Ohne Angabe: irgendwer, der frei ist. */
  braucht?: Rolle;
  /**
   * Warum sie wehtut, in einem Satz.
   *
   * Die Balken sagen „Team −2 Punkte“ und erklären nichts. Dass sechs
   * Wochen Handarbeit bis elf Uhr abends an die Stimmung gehen, muss
   * dastehen, sonst ist der Abzug eine Zahl, die vom Himmel fällt.
   */
  preis?: string;
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
  /** Was das Fachwort auf der Karte bedeutet. */
  begriffe?: Begriff[];
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

/** Eine laufende Maßnahme auf dem Brett — und wer daran sitzt. */
export type Running = { id: string; left: number; total: number; wer: string };

export type GameState = {
  cash: number;
  /** Sonstige Fixkosten: Server, Büro, Buchhaltung. Ohne Gehälter. */
  burn: number;
  mrr: number;
  customers: number;
  investors: number;
  team: number;
  /** Wer an Bord ist, mit Namen und Fach. */
  leute: Person[];
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
  /** Schon gefeierte Erfolge — jeder Moment kommt genau einmal. */
  gefeiert: string[];
  /** Schon getroffene Entscheidungen. Jede Frage wird einmal gestellt. */
  entschieden: string[];
  /** Monat der letzten Entscheidung — zwei an einem Abend sind keine. */
  lastChoice: number;
  seed: number;
};

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

/* ── The clock ───────────────────────────────────────────────── */

/**
 * Was im Monat netto rausgeht.
 *
 * Ihr habt gekündigt, bevor das Spiel anfängt — es gibt kein Gehalt,
 * das die Uhr anhält. Raus gehen Lebenshaltung und Firma, rein kommt,
 * was Speditionen zahlen, abzüglich dessen, was ihre Betreuung kostet.
 */
export function netBurn(s: GameState): number {
  const f = fluss(s);
  return f.raus - f.rein;
}

/** Was ein Gründer im Monat zum Leben braucht: Miete, Essen, Versicherung. */
export const LEBEN_PRO_KOPF = 1_100;

/**
 * Wofür das Ersparte draufgeht, Zeile für Zeile.
 *
 * Eine Zahl beantwortet nicht, wohin das Geld geht. Vier Posten tun
 * es: ihr müsst wohnen und essen, Angestellte bekommen Gehalt, jeder
 * Kunde kostet Betreuung, und der Rest sind Server, Büro und
 * Buchhaltung. Erst damit ist klar, warum die Zahl fällt — und warum
 * die erste Einstellung sie viel schneller fallen lässt.
 */
export function fluss(s: GameState): {
  leben: number;
  gehaelter: number;
  betreuung: number;
  sonstiges: number;
  raus: number;
  rein: number;
} {
  const leben = s.leute.filter((p) => p.gruender).length * LEBEN_PRO_KOPF;
  const gehaelter = s.leute.filter((p) => !p.gruender).reduce((n, p) => n + p.kosten, 0);
  const betreuung = Math.round(s.customers * 120);
  return { leben, gehaelter, betreuung, sonstiges: s.burn, raus: leben + gehaelter + betreuung + s.burn, rein: s.mrr };
}

/**
 * Was am Monatsende übrig bleibt — positiv heißt: es kommt mehr rein,
 * als rausgeht.
 *
 * Dieselbe Zahl wie netBurn, nur andersherum, und das ist der Punkt:
 * „Runway 9 Monate“ sagt nicht, ob er gerade steigt oder fällt. Ein
 * Spiel, in dem der erste zahlende Kunde sich nicht anfühlt, hat den
 * wichtigsten Moment verschenkt.
 */
export function saldo(s: GameState): number {
  return -netBurn(s);
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

/** Über dieser Grenze zeigt die Uhr „36+“ und rechnet nicht weiter. */
export const UHR_MAX = 36;

/**
 * Was auf der Uhr steht.
 *
 * Unendlich stand da vorher, und das war schlicht falsch: wer sich
 * gerade trägt, hat trotzdem Gehälter zu zahlen und einen Kunden, der
 * morgen kündigen kann. Also eine Zahl mit Deckel, und daneben die
 * ehrlichere: wie lange das Geld reichen würde, wenn der Umsatz heute
 * wegbricht. Das ist der Satz, den jeder Gründer kennt.
 */
export function uhrMonate(s: GameState): { monate: number; gedeckelt: boolean } {
  const r = runway(s);
  if (!isFinite(r) || r > UHR_MAX) return { monate: UHR_MAX, gedeckelt: true };
  return { monate: r, gedeckelt: false };
}

/** Monate, die das Geld ohne jeden Umsatz noch reichen würde. */
export function monateOhneUmsatz(s: GameState): number {
  const raus = fluss(s).raus;
  if (raus <= 0) return UHR_MAX;
  return Math.max(0, Math.floor(s.cash / raus));
}

/** Wie voll der Tank ist: ein Jahr Luft ist voll, leer ist leer. */
export function runwayFill(s: GameState): number {
  const r = runway(s);
  if (!isFinite(r)) return 1;
  return Math.max(0, Math.min(1, r / 12));
}

/** Die zwei, die gekündigt haben. Eine baut, einer verkauft. */
export const GRUENDER: Person[] = [
  { id: "lena", name: "Lena", rolle: "entwicklung", gruender: true, kosten: 0 },
  { id: "jonas", name: "Jonas", rolle: "vertrieb", gruender: true, kosten: 0 },
];

export function initialState(seed = 1): GameState {
  return {
    cash: 32_000,
    burn: 200,
    mrr: 0,
    customers: 0,
    investors: 0,
    team: 62,
    leute: GRUENDER.map((p) => ({ ...p })),
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
    gefeiert: [],
    entschieden: [],
    lastChoice: 0,
    seed,
  };
}

export function applyEffects(s: GameState, e: Effects | undefined): GameState {
  if (!e) return s;
  let leute = s.leute;
  if (e.verlassen) {
    /* Es geht, wer angestellt ist — Gründer kündigen nicht per Ereignis. */
    const weg = leute.find((p) => !p.gruender && p.rolle === e.verlassen);
    if (weg) leute = leute.filter((p) => p.id !== weg.id);
  }
  if (e.einstellen?.length) {
    leute = [
      ...leute,
      ...e.einstellen.map((n, i) => ({ ...n, id: `${n.rolle}-${leute.length + i}-${n.name.toLowerCase()}` })),
    ];
  }
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
    leute,
    /* Wer geht, nimmt seine laufende Maßnahme mit. */
    running: leute.length === s.leute.length ? s.running : s.running.filter((r) => leute.some((p) => p.id === r.wer)),
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
  return Math.max(1, s.leute.length);
}

/** Wer gerade an nichts sitzt. */
export function frei(s: GameState): Person[] {
  const belegt = new Set(s.running.map((r) => r.wer));
  return s.leute.filter((p) => !belegt.has(p.id));
}

/**
 * Wer diese Maßnahme übernehmen würde.
 *
 * Eine Verkaufsmaßnahme braucht jemanden, der verkauft. Dass Lena
 * nicht nebenbei telefoniert, während sie fünf Monate baut, ist keine
 * Schikane — es ist der Grund, warum zwei Gründer sich streiten.
 */
export function werKann(s: GameState, t: Tactic): Person | null {
  const kandidaten = frei(s).filter((p) => !t.braucht || p.rolle === t.braucht);
  return kandidaten[0] ?? null;
}

/** Was eine laufende Maßnahme gerade blockiert, für die Leiste links. */
export function woranSitzt(s: GameState, p: Person): Running | null {
  return s.running.find((r) => r.wer === p.id) ?? null;
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
  if (!werKann(s, t)) return false;
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
  if (werKann(s, t)) return null;
  if (!t.braucht) return "Niemand frei";
  const imFach = s.leute.filter((p) => p.rolle === t.braucht);
  if (!imFach.length) return `Niemand da, der ${ROLLE_KURZ[t.braucht]}`;
  const laeuft = imFach.map((p) => woranSitzt(s, p)).find((r): r is Running => !!r);
  const wer = imFach.length === 1 ? imFach[0].name : ROLLE_LABEL[t.braucht];
  return laeuft ? `${wer} ist noch ${laeuft.left} ${laeuft.left === 1 ? "Monat" : "Monate"} beschäftigt` : `${wer} ist beschäftigt`;
}

/** Maßnahme starten: Geld ist sofort weg, die Wirkung kommt später. */
export function startTactic(s: GameState, t: Tactic): GameState {
  const wer = werKann(s, t);
  if (!wer) return s;
  return {
    ...s,
    cash: s.cash - (t.cost ?? 0),
    used: [...s.used, t.id],
    running: [...s.running, { id: t.id, left: Math.max(1, t.months), total: Math.max(1, t.months), wer: wer.id }],
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

/* ── Erfolge ─────────────────────────────────────────────────── */

/**
 * Ein Moment, in dem es mal gut läuft.
 *
 * Ein Spiel, das nur Rechnungen stellt, ist eine Tabelle. Die erste
 * bezahlte Rechnung und der erste Monat, der sich selbst trägt, sind
 * die zwei Stellen, an denen die Uhr aufhört, gegen einen zu laufen —
 * und das muss auf dem Bildschirm passieren, nicht im Kopf.
 */
export type Erfolg = {
  id: string;
  title: string;
  beats: [string, string];
  /** Gilt für den Übergang, nicht für den Zustand. */
  when: (vorher: GameState, nachher: GameState) => boolean;
};

export function erfolge(vorher: GameState, nachher: GameState, alle: Erfolg[]): Erfolg[] {
  return alle.filter((e) => !nachher.gefeiert.includes(e.id) && e.when(vorher, nachher));
}

/* ── Entscheidungen ──────────────────────────────────────────── */

/**
 * Eine Frage mit zwei oder drei Antworten, von denen keine gratis ist.
 *
 * Maßnahmen sind eine Liste, aus der man wählt, woran gearbeitet wird.
 * Eine Entscheidung ist das Gegenteil: sie kommt ungefragt, man kann
 * sie nicht einem Kopf zuweisen und nicht auf nächsten Monat schieben.
 * Wer entscheidet, was zugesagt wird; ob man überhaupt fremdes Geld
 * will; wie die Anteile geteilt werden; ob es eine GmbH gibt — das
 * sind nicht Aufgaben, das sind die Abende, an denen eine Firma
 * entweder sortiert wird oder auseinanderfällt. Vorher gab es diese
 * Abende im Spiel nicht, und damit fehlte die Hälfte des Gründens.
 */
export type Weg = {
  id: string;
  label: string;
  /** Ein Satz darunter: was man damit eigentlich tut. */
  hint: string;
  effects: Effects;
  /** Wie überall: erst der Vollzug, dann der Preis. */
  beats: [string, string];
  /** Wo der Preis davon abhängt, was Jonas will. */
  alignmentBy?: Record<Stance, number>;
};

export type Entscheidung = {
  id: string;
  /** Streit, Struktur oder Richtung. Nur für Farbe und Kicker. */
  art: "streit" | "struktur" | "weg";
  kicker: string;
  title: string;
  /** Die Lage, zwei Sätze. Danach kommen die Wege. */
  beats: [string, string];
  /** Fachwörter, ohne die die Frage nicht zu beantworten ist. */
  begriffe?: Begriff[];
  /** Zeigt die Reifegrad-Liste daneben. Nur die Geldfrage braucht sie. */
  reife?: true;
  /**
   * Fragt sofort, ohne auf den Abstand zu warten.
   *
   * Für die Fragen, die zu einem Moment gehören und nicht zu einem
   * Takt: wie ihr an die ersten Kunden kommt, gehört vor den ersten
   * Kunden und nicht drei Monate danach.
   */
  sofort?: true;
  wege: Weg[];
  /** Erst, wenn das hier gilt. */
  when?: (s: GameState) => boolean;
};

/**
 * Die erste Frage kommt früh, jede weitere mit drei Monaten Abstand.
 *
 * Früh, weil die Anteilsfrage am Anfang gehört und nicht in Monat
 * sechs. Danach mit Abstand, weil zwei Grundsatzgespräche an einem
 * Abend keine Entscheidungen sind, sondern ein Fragebogen.
 */
export function entscheidungDue(s: GameState): boolean {
  if (s.lastChoice === 0) return s.month >= 2;
  return s.month - s.lastChoice >= 3;
}

/**
 * Die nächste offene Frage — in der Reihenfolge, in der sie im Inhalt
 * steht, nicht gewürfelt. Der Anteilsschlüssel muss vor der Rechtsform
 * kommen und die Rechtsform vor der Holding; andersherum ergibt keine
 * der drei Fragen einen Sinn.
 */
export function drawEntscheidung(s: GameState, alle: Entscheidung[]): Entscheidung | null {
  const offen = alle.filter(
    (e) => !s.entschieden.includes(e.id) && (!e.when || e.when(s)) && (e.sofort || entscheidungDue(s)),
  );
  return offen.length ? offen[0] : null;
}

export function alignmentOfWeg(w: Weg, stance: Stance): number {
  if (w.alignmentBy) return w.alignmentBy[stance];
  return w.effects.alignment ?? 0;
}

/** Einen Weg nehmen. Wirkt sofort, und die Frage kommt nicht wieder. */
export function entscheiden(s: GameState, e: Entscheidung, w: Weg): GameState {
  const nach = applyEffects(s, { ...w.effects, alignment: 0 });
  return {
    ...nach,
    alignment: clamp(nach.alignment + alignmentOfWeg(w, s.stance)),
    entschieden: [...s.entschieden, e.id],
    lastChoice: s.month,
  };
}

/**
 * „Sind wir investor-ready?“
 *
 * In Wahrheit sind das fünf Fragen, und keine davon beantwortet man im
 * Gefühl. Also stehen sie auf der Karte, als Haken oder eben nicht,
 * und daneben entscheidet man. Abhaken ist keine Pflicht: man darf mit
 * zwei von fünf losgehen, man weiß dann nur, was man tut.
 */
export type Reifepunkt = { label: string; ok: boolean };

export function reifegrad(s: GameState): Reifepunkt[] {
  return [
    { label: "Etwas, das ohne euch läuft", ok: s.product >= 45 },
    { label: "Zwei zahlende Speditionen", ok: s.customers >= 2 },
    { label: "1.500 € Umsatz im Monat", ok: s.mrr >= 1_500 },
    { label: "Noch sechs Monate Geld", ok: runway(s) >= 6 },
    { label: "Ihr zwei seid euch einig", ok: s.alignment >= 50 },
  ];
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

/**
 * Die Anzeigen.
 *
 * Prozente waren hier falsch: „Investoren 12 %“ beantwortet nicht, was
 * 100 % wären, und am Anfang hat man gar keine Investoren — dann muss
 * da null stehen und nicht zwölf. Also Dinge, die man benennen kann:
 * Geld in Euro, Kunden in Speditionen, und alles Weiche als fünf Punkte
 * mit einem Wort darunter.
 */
export type MeterView = {
  key: string;
  label: string;
  value: string;
  /** Null bis fünf gefüllte Punkte, wo eine Zahl nichts sagen würde. */
  punkte?: number;
  note?: string;
  tone: "ok" | "warn" | "bad";
};

const WORTE = {
  produkt: ["Idee", "Skizze", "Prototyp", "benutzbar", "stabil", "rund"],
  stimmung: ["am Ende", "angespannt", "okay", "gut", "stark", "eingeschworen"],
  investoren: ["niemand", "ein Kontakt", "erste Gespräche", "warm", "sie fragen nach", "Term Sheets"],
};

const stufe = (v: number) => Math.max(0, Math.min(5, Math.round(v / 20)));

export function meterViews(s: GameState): MeterView[] {
  const produkt = stufe(s.product);
  const stimmung = stufe(s.team);
  const investoren = stufe(s.investors);
  return [
    { key: "mrr", label: "Umsatz", value: s.mrr > 0 ? `${fmtEuro(s.mrr)}` : "—", note: s.mrr > 0 ? "pro Monat" : "noch keiner", tone: s.mrr > 0 ? "ok" : "warn" },
    {
      key: "kunden",
      label: "Kunden",
      value: String(s.customers),
      note: s.customers === 1 ? "Spedition" : "Speditionen",
      tone: s.customers > 0 ? "ok" : "warn",
    },
    { key: "produkt", label: "Produkt", value: WORTE.produkt[produkt], punkte: produkt, tone: produkt >= 3 ? "ok" : produkt >= 2 ? "warn" : "bad" },
    {
      key: "team",
      label: "Stimmung",
      value: WORTE.stimmung[stimmung],
      punkte: stimmung,
      tone: stimmung >= 3 ? "ok" : stimmung >= 2 ? "warn" : "bad",
    },
    {
      key: "investoren",
      label: "Investoren",
      value: WORTE.investoren[investoren],
      punkte: investoren,
      tone: investoren >= 3 ? "ok" : investoren >= 1 ? "warn" : "bad",
    },
    { key: "equity", label: "Euch gehören", value: `${Math.round(s.equity)} %`, tone: s.equity >= 50 ? "ok" : "warn" },
  ];
}

/**
 * Der Maßstab für den Geldbalken.
 *
 * Eine Stufenleiter statt des eigenen Höchststands: halb voll heißt
 * dann immer dieselben 25.000 €, und eine Runde springt sichtbar eine
 * Stufe hoch, statt den Maßstab heimlich zu dehnen und so zu tun, als
 * wäre nichts passiert.
 */
export function geldSkala(cash: number): number {
  for (const s of [50_000, 150_000, 500_000, 1_500_000, 5_000_000]) if (cash <= s) return s;
  /* Über der höchsten Sprosse ist der Balken voll, statt überzulaufen. */
  return Math.max(15_000_000, cash);
}

/**
 * Für die Zahl, die in Echtzeit läuft: jeder Euro, mit Punkten.
 *
 * Von Hand gruppiert und nicht über `toLocaleString`, weil die Zahl
 * auf Server und Client zeichengleich sein muss.
 */
export function fmtEuroExakt(v: number): string {
  if (!isFinite(v)) return "–";
  const n = Math.round(v);
  const ziffern = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${n < 0 ? "−" : ""}${ziffern} €`;
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
  push(e.team, (n) => `${(e.team ?? 0) > 0 ? "+" : "−"}${n} Stimmung`);
  for (const n of e.einstellen ?? []) out.push({ label: `+ ${n.name} · ${fmtEuro(n.kosten)}/Monat`, up: true });
  if (e.verlassen) out.push({ label: `− eine Person aus der ${ROLLE_LABEL[e.verlassen]}`, up: false });
  push(e.burn, (n) => `${(e.burn ?? 0) > 0 ? "+" : "−"}${fmtEuro(n)}/Monat Fixkosten`, false);
  push(e.equity, (n) => `−${n} % der Firma`, false);
  return out;
}
