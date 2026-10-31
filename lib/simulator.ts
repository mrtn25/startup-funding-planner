/* ══════════════════════════════════════════════════════════════
   The founder simulator — the engine, with no content in it.

   Modelled on GermanZero's Klimakanzler:in game, which works
   because two numbers pull against each other the whole way: the
   thermometer only moves if you spend popularity, and popularity
   falls by itself while you decide. Transposed, that is the founder's
   actual position. The exit only gets closer if you spend something —
   cash, ownership, the goodwill of people who backed you — and the
   cash falls by itself while you think about it.

   Four meters, because that is the fewest that still produce an
   argument:

   - Cash, in euros, the only one that can end the game outright.
   - Investors, the confidence of the people whose money you want
     next. Slides on its own between milestones: an investor who
     hasn't heard from you in a quarter is not where you left them.
   - Customers, how much the people paying you actually like it.
     Feeds cash with a lag, which is why neglecting it is so cheap
     in the short run and so expensive by the next round.
   - Equity, what the founders still hold. The only meter that never
     goes back up, and the one the endings are scored on.

   Scenes are data, not code (see simulator-scenes.ts). A scene shows
   a situation and two to four choices; a choice moves the meters,
   costs months, and names the next scene. Where a choice has a real
   answer the site can compute, it carries a pointer to the tool that
   computes it — the game is the hook, the tool is the thing that
   actually helps.

   Pure functions, no DOM — see simulator.test.ts.
   ══════════════════════════════════════════════════════════════ */

export type MeterKey = "cash" | "investors" | "customers" | "equity";

export const METERS: { key: MeterKey; label: string; help: string; unit: "eur" | "pct" }[] = [
  { key: "cash", label: "Cash", help: "What is in the bank. At zero the game is over.", unit: "eur" },
  { key: "investors", label: "Investors", help: "How much the people with the next cheque believe you.", unit: "pct" },
  { key: "customers", label: "Customers", help: "How much the people paying you like it.", unit: "pct" },
  { key: "equity", label: "Your equity", help: "What the founders still hold. It only goes down.", unit: "pct" },
];

/** Tools on the site a scene can hand off to. Kept as strings so the
    engine does not depend on the tool registry. */
export type ToolRef = { id: string; label: string };

/** Meter deltas, plus the one number that is not a meter: a decision
    that puts someone on payroll changes every month after it. */
export type Effects = Partial<Record<MeterKey, number>> & { burn?: number };

export type Choice = {
  id: string;
  label: string;
  /** The second line on the button — what you are actually deciding. */
  detail?: string;
  effects: Effects;
  /** Months this takes. Burn is applied for each of them. */
  months?: number;
  /** Shown after the choice: what this does in reality, not in the game. */
  reality: string;
  tool?: ToolRef;
  next: string;
};

export type Scene = {
  id: string;
  chapter: number;
  /** Where you are, in two or three words. Sits above the title. */
  place: string;
  title: string;
  /** The situation. Two or three sentences, present tense. */
  text: string;
  /** Who is talking, when someone is. */
  speaker?: string;
  /** File in /public/game, without the extension. */
  image: string;
  choices: Choice[];
};

export type Ending = {
  id: string;
  title: string;
  text: string;
  image: string;
  /** Good, survivable, or over. */
  tone: "win" | "mixed" | "loss";
  /** Shown as the final line — what the ending is worth to the founders. */
  payout?: (s: GameState) => string;
};

export type Chapter = { number: number; title: string; subtitle: string; firstScene: string };

export type GameState = {
  cash: number;
  investors: number;
  customers: number;
  equity: number;
  /** Months since the first scene. */
  month: number;
  /** Cash out per month, before anything a scene does to it. */
  burn: number;
  sceneId: string;
  /** Scene ids already played, oldest first. */
  history: string[];
  /** Set once the run is over. */
  endingId: string | null;
};

export const START: GameState = {
  cash: 12_000,
  investors: 20,
  customers: 10,
  equity: 100,
  month: 0,
  burn: 1_200,
  sceneId: "",
  history: [],
  endingId: null,
};

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

/**
 * Apply a choice.
 *
 * Order matters: the months pass first and the burn is taken for them,
 * then the choice's own effects land. A decision that takes half a year
 * should cost half a year of salaries whatever else it does.
 *
 * Investor confidence decays while nothing happens, at a point a month.
 * It is the Klimakanzler mechanic and it is also true: the people who
 * said "keep me posted" meant it, and silence is an answer.
 */
export function applyChoice(state: GameState, choice: Choice): GameState {
  const months = Math.max(0, choice.months ?? 1);
  const next: GameState = {
    ...state,
    month: state.month + months,
    cash: state.cash - state.burn * months,
    investors: clamp(state.investors - months),
    history: [...state.history, state.sceneId],
  };

  const e = choice.effects;
  next.cash = next.cash + (e.cash ?? 0);
  next.investors = clamp(next.investors + (e.investors ?? 0));
  next.customers = clamp(next.customers + (e.customers ?? 0));
  /* Equity never recovers. A choice that hands over shares hands them
     over; there is no scene later that gives them back, and pretending
     otherwise would be the one dishonest thing in here. */
  next.equity = clamp(next.equity + Math.min(0, e.equity ?? 0));

  if (e.burn) next.burn = Math.max(0, next.burn + e.burn);

  next.sceneId = choice.next;
  return next;
}

/** Runway in months at the current burn. Null once the burn is covered. */
export function runway(state: GameState): number | null {
  if (state.burn <= 0) return null;
  return Math.max(0, Math.floor(state.cash / state.burn));
}

/**
 * Has the run ended by itself?
 *
 * Only cash can end it outright — an investor who has lost faith is a
 * harder game, not a finished one, and that distinction is the whole
 * difference between a simulator and a morality tale.
 */
export function forcedEnding(state: GameState): string | null {
  if (state.cash <= 0) return "insolvent";
  return null;
}

export type MeterView = { key: MeterKey; label: string; help: string; value: string; fill: number; tone: "ok" | "warn" | "bad" };

/** The meters as the bar wants them: a width and a tone, per meter. */
export function meterViews(state: GameState): MeterView[] {
  const r = runway(state);
  return METERS.map((m) => {
    if (m.key === "cash") {
      /* Cash is shown as runway rather than as a balance: twelve
         thousand euros means nothing until you know what a month costs. */
      const months = r ?? 99;
      return {
        ...m,
        value: r === null ? "covered" : `${r} mo`,
        fill: clamp((months / 12) * 100),
        tone: months <= 2 ? "bad" : months <= 5 ? "warn" : "ok",
      };
    }
    const v = state[m.key];
    return {
      ...m,
      value: `${Math.round(v)} %`,
      fill: clamp(v),
      tone: v <= 20 ? "bad" : v <= 40 ? "warn" : "ok",
    };
  });
}

export function fmtEuro(v: number): string {
  if (!isFinite(v)) return "–";
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M€`;
  if (a >= 10_000) return `${Math.round(v / 1000)} k€`;
  if (a >= 1000) return `${(v / 1000).toFixed(1)} k€`;
  return `${Math.round(v)} €`;
}

/** A choice's effects, as the short deltas shown on the result card. */
export function effectLines(choice: Choice): { label: string; delta: string; up: boolean }[] {
  const out: { label: string; delta: string; up: boolean }[] = [];
  for (const m of METERS) {
    const v = choice.effects[m.key];
    if (!v) continue;
    const up = v > 0;
    out.push({
      label: m.label,
      delta: m.unit === "eur" ? `${up ? "+" : "−"}${fmtEuro(Math.abs(v))}` : `${up ? "+" : "−"}${Math.abs(v)}`,
      up,
    });
  }
  const b = choice.effects.burn;
  if (b) out.push({ label: "Burn", delta: `${b > 0 ? "+" : "−"}${fmtEuro(Math.abs(b))} / mo`, up: b < 0 });
  return out;
}
