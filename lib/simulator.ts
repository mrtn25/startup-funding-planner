/* ══════════════════════════════════════════════════════════════
   Palettio — the engine.

   Rebuilt after actually playing GermanZero's Klimakanzler:in to the
   end of a term rather than reading the first screen. Three things
   make that game work, and none of them is the illustrations:

   1. The clock never stops. Popularity drains while you read the
      description of the law you are considering, which turns reading
      into a cost and makes the pause button a real decision.
   2. The meter jitters. It does not slide down a ramp — it moves a
      point up, two down, one up, every second or so, so the thing
      feels alive rather than scripted.
   3. Consequences arrive as cards in two beats: what happened, then
      what it cost, with the number on a badge. The second beat almost
      always lands on a different meter than the one you aimed at.
      Coal exit buys you climate and costs you popularity.

   So: the clock runs here too, months tick past in real time, events
   fire on their own, and every card carries its delta. Nothing in
   this file knows about the company — that is simulator-scenes.ts.

   Randomness is seeded, because a game that cannot be replayed cannot
   be tested, and the tests are the only reason to trust the balance.

   Pure functions, no DOM — see simulator.test.ts.
   ══════════════════════════════════════════════════════════════ */

export type MeterKey = "cash" | "investors" | "customers" | "equity";

export const METERS: { key: MeterKey; label: string; short: string }[] = [
  { key: "cash", label: "Runway", short: "Cash" },
  { key: "investors", label: "Investors", short: "Inv" },
  { key: "customers", label: "Customers", short: "Cust" },
  { key: "equity", label: "Yours", short: "Eq" },
];

export type Effects = Partial<Record<MeterKey, number>> & { burn?: number };

/** A beat of narration with the number it carries. Two of these make a
    consequence: what happened, then what it did. */
export type Beat = { text: string; effects?: Effects };

export type GameEvent = {
  id: string;
  /** Only fires in this chapter, or any chapter when absent. */
  chapter?: number;
  /** Higher goes first among everything eligible. The grant has to beat
      the noise, or it arrives after the company it was meant to save. */
  priority?: number;
  /** Only fires once this is true of the state. */
  when?: (s: GameState) => boolean;
  beats: Beat[];
};

export type Choice = {
  id: string;
  label: string;
  detail?: string;
  /** The whole mechanical result. Applied once, by the engine. */
  effects: Effects;
  /** Months the clock jumps forward when you pick this. */
  months?: number;
  /** Two beats of narration: what happened, then what it cost. The
      badges on the second one are rendered from `effects`, so the
      text never has to agree with a number by hand. */
  beats: [string, string];
  next: string;
};

export type Scene = {
  id: string;
  chapter: number;
  place: string;
  title: string;
  text: string;
  speaker?: string;
  image: string;
  choices: Choice[];
};

export type Chapter = {
  number: number;
  title: string;
  /** One line on the chapter card — what this stage is for. */
  blurb: string;
  image: string;
  /** Months on the clock for this chapter. */
  months: number;
  firstScene: string;
};

export type Ending = {
  id: string;
  title: string;
  text: string;
  image: string;
  tone: "win" | "mixed" | "loss";
  payout?: (s: GameState) => string;
};

export type GameState = {
  cash: number;
  investors: number;
  customers: number;
  equity: number;
  burn: number;
  /** Total months since the first scene. */
  month: number;
  /** Months left on this chapter's clock. */
  left: number;
  chapter: number;
  sceneId: string;
  /** Events already fired, so none repeats. */
  fired: string[];
  /** The month the last one fired, so they do not arrive in a clump. */
  lastEvent: number;
  endingId: string | null;
  /** Seeded, so a run can be replayed exactly. */
  seed: number;
};

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

/** Mulberry32 — small, fast, and good enough to make a meter twitch. */
function rng(seed: number): [number, number] {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, t | 0];
}

export function initialState(chapter: Chapter, seed = 1): GameState {
  return {
    cash: 12_400,
    investors: 18,
    customers: 12,
    equity: 100,
    burn: 1_900,
    month: 0,
    left: chapter.months,
    chapter: chapter.number,
    sceneId: chapter.firstScene,
    fired: [],
    lastEvent: 0,
    endingId: null,
    seed,
  };
}

export function applyEffects(state: GameState, e: Effects | undefined): GameState {
  if (!e) return state;
  return {
    ...state,
    cash: state.cash + (e.cash ?? 0),
    investors: clamp(state.investors + (e.investors ?? 0)),
    customers: clamp(state.customers + (e.customers ?? 0)),
    /* Equity never recovers. There is no later scene that gives shares
       back, and pretending otherwise would be the one dishonest thing
       in the model. */
    equity: clamp(state.equity + Math.min(0, e.equity ?? 0)),
    burn: Math.max(0, state.burn + (e.burn ?? 0)),
  };
}

/**
 * What the forwarders pay you this month.
 *
 * The customers meter is not a mood — it is the paying base, so it has
 * to arrive as money every month. Without this the game was a slope
 * with one direction: cash only ever left, one-off contract payments
 * never compounded, and every honest run ended insolvent. Roughly
 * 125 € per point — set against the scale the meter actually moves
 * on, not against a feeling: a run that goes well lands in the fifties,
 * so break-even has to sit in the low forties.
 */
export function revenue(state: GameState): number {
  return Math.round(state.customers * 125);
}

/**
 * What serving them costs — support calls, the nightly matching run,
 * the dispatcher who needs the same thing explained twice.
 *
 * Without this the game went permanently green somewhere in chapter
 * three: every customer was pure margin, so a growing base turned cash
 * into a solved problem and took the tension out of the whole second
 * half. At 110 € net per point, break-even is a number of forwarders
 * rather than a formality.
 */
export function costOfServing(state: GameState): number {
  return Math.round(state.customers * 15);
}

/** Fixed costs plus service, minus what comes in. */
export function netBurn(state: GameState): number {
  return state.burn + costOfServing(state) - revenue(state);
}

/**
 * One month of clock.
 *
 * Cash leaves, the chapter gets shorter, and investor confidence
 * twitches: it drifts down, but never smoothly. The jitter is the
 * single cheapest thing that makes a meter feel like it belongs to a
 * world rather than to a spreadsheet, and it is lifted straight from
 * the game this one is modelled on.
 */
export function tick(state: GameState): GameState {
  const [r, seed] = rng(state.seed);
  const twitch = r < 0.42 ? 1 : r < 0.5 ? 0 : -1;
  /* Confidence only decays once there is somebody to lose it. Before
     the first invoice nobody has met you, so the meter is just how
     this looks on paper and it should move only when you do something
     — playing it showed the alternative: the meter bled out during
     the prototype years and the angel arrived in chapter five to a
     player who had already lost, without ever having met an investor. */
  const drift = state.chapter >= 4 && state.month % 3 === 0 ? -1 : 0;
  /* Churn scales with the base. A dozen forwarders are all people you
     know; ninety are a support load, and some of them leave for
     reasons nobody logged. Without this the customers meter simply
     climbed to the nineties and stayed there. */
  const churn = r > 0.95 - state.customers / 400 ? -1 : 0;
  return {
    ...state,
    seed,
    month: state.month + 1,
    left: Math.max(0, state.left - 1),
    cash: state.cash - netBurn(state),
    investors: clamp(state.investors + twitch + drift),
    customers: clamp(state.customers + churn),
  };
}

/** Jump the clock several months at once, as a decision does. */
export function advance(state: GameState, months: number): GameState {
  let s = state;
  for (let i = 0; i < Math.max(0, months); i++) s = tick(s);
  return s;
}

export function applyChoice(state: GameState, choice: Choice): GameState {
  const moved = advance(state, choice.months ?? 1);
  return { ...applyEffects(moved, choice.effects), sceneId: choice.next };
}

/**
 * Is an event due?
 *
 * Checked against the gap since the last one rather than against the
 * month number. The first version asked whether the month was divisible
 * by three, which is true for as long as the month does not change —
 * and the clock is stopped while a card is open, so closing one event
 * immediately drew the next. Seven of them arrived in a row at a
 * chapter boundary and took 8,000 € with them.
 */
export function eventDue(state: GameState): boolean {
  return state.month >= 3 && state.month - state.lastEvent >= 3;
}

/** The next event that may fire, or null. Each fires at most once. */
export function drawEvent(state: GameState, events: GameEvent[]): GameEvent | null {
  const open = events.filter(
    (e) => !state.fired.includes(e.id) && (e.chapter === undefined || e.chapter === state.chapter) && (!e.when || e.when(state)),
  );
  if (!open.length) return null;
  const top = Math.max(...open.map((e) => e.priority ?? 0));
  const tier = open.filter((e) => (e.priority ?? 0) === top);
  const [r] = rng(state.seed ^ 0x9e3779b9);
  return tier[Math.floor(r * tier.length) % tier.length];
}

/**
 * Months of cash left at the current net burn, or Infinity when the
 * month pays for itself.
 *
 * Infinity rather than a large number: the first version returned 99
 * as a sentinel and then compared `>= 99` to decide whether to print
 * "pays" — so 120,000 € at a small but real burn, a genuinely finite
 * 183 months, claimed the company was profitable.
 */
export function runway(state: GameState): number {
  const net = netBurn(state);
  if (net <= 0) return Infinity;
  return Math.max(0, Math.floor(state.cash / net));
}

export function brokeNow(state: GameState): boolean {
  return state.cash <= 0;
}

export type MeterView = {
  key: MeterKey;
  label: string;
  value: string;
  fill: number;
  tone: "ok" | "warn" | "bad";
};

export function meterViews(state: GameState): MeterView[] {
  return METERS.map((m) => {
    if (m.key === "cash") {
      const r = runway(state);
      return {
        key: m.key,
        label: m.label,
        /* Capped, because "37 mo" off a 330 €/month margin is a true
           number that reads as safety — and it becomes two months the
           day anyone is hired. */
        value: !isFinite(r) ? "pays" : r > 24 ? "24+ mo" : `${r} mo`,
        fill: isFinite(r) ? clamp((r / 12) * 100) : 100,
        tone: r <= 2 ? "bad" : r <= 5 ? "warn" : "ok",
      };
    }
    const v = state[m.key];
    return {
      key: m.key,
      label: m.label,
      value: `${Math.round(v)}%`,
      fill: clamp(v),
      tone: v <= 20 ? "bad" : v <= 40 ? "warn" : "ok",
    };
  });
}

export function fmtEuro(v: number): string {
  if (!isFinite(v)) return "–";
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M €`;
  if (a >= 10_000) return `${Math.round(v / 1000)}k €`;
  if (a >= 1000) return `${(v / 1000).toFixed(1)}k €`;
  return `${Math.round(v)} €`;
}

/** The badge on a card: "−2%", "+6 Kunden", "−1.8k €". */
export function badges(e: Effects | undefined): { label: string; up: boolean }[] {
  if (!e) return [];
  const out: { label: string; up: boolean }[] = [];
  if (e.cash) out.push({ label: `${e.cash > 0 ? "+" : "−"}${fmtEuro(Math.abs(e.cash))}`, up: e.cash > 0 });
  if (e.investors) out.push({ label: `${e.investors > 0 ? "+" : "−"}${Math.abs(e.investors)}% investors`, up: e.investors > 0 });
  if (e.customers) out.push({ label: `${e.customers > 0 ? "+" : "−"}${Math.abs(e.customers)}% customers`, up: e.customers > 0 });
  if (e.equity) out.push({ label: `−${Math.abs(e.equity)}% of the company`, up: false });
  if (e.burn) out.push({ label: `${e.burn > 0 ? "+" : "−"}${fmtEuro(Math.abs(e.burn))}/mo burn`, up: e.burn < 0 });
  return out;
}
