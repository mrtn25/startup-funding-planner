/* ══════════════════════════════════════════════════════════════
   Balance harness.

       node --experimental-strip-types scripts/simulator-balance.ts

   Plays the whole chain under several card-picking strategies and
   prints where each run ended, how long it took and what Retoura was
   doing by then. Content changes move these numbers; reading the
   content does not show you that one ending swallows every run, or
   that a milestone is unreachable with its own deck.
   ══════════════════════════════════════════════════════════════ */

import { applyEffects, canStart, deckFor, drawEvent, eventDue, finishTactic, forcedEnding, initialState, startTactic, tickBoard, type GameState } from "../lib/simulator.ts";
import { EVENTS, MILESTONE_BY_ID, TACTICS, pickEnding } from "../lib/simulator-scenes.ts";

/** `pick` wählt eine Karte; `idle` sind Monate Zögern vor jedem Start. */
function play(pick: (n: number, step: number) => number, idle: number, seed: number) {
  let s: GameState = initialState(seed);
  let step = 0;
  let monate = 0;

  const monat = () => {
    const { state, done } = tickBoard(s);
    s = state;
    for (const id of done) {
      const t = TACTICS[id];
      if (t) s = finishTactic(s, t);
    }
    if (eventDue(s)) {
      const e = drawEvent(s, EVENTS);
      if (e) s = applyEffects({ ...s, drawn: [...s.drawn, e.id], lastEvent: s.month }, e.effects);
    }
    monate++;
  };

  while (monate < 140) {
    const m = MILESTONE_BY_ID[s.milestoneId];
    if (!m) break;
    if (m.gate(s)) {
      if (!m.next) break;
      const next = MILESTONE_BY_ID[m.next];
      const enter = next.onEnter;
      s = { ...(enter && (!enter.when || enter.when(s)) ? applyEffects(s, enter.effects) : s), milestoneId: m.next };
      continue;
    }
    const tot = forcedEnding(s);
    if (tot) return { ending: tot, ...snapshot(s) };

    const deck = deckFor(s, m, TACTICS).filter((t) => canStart(s, t));
    if (deck.length && s.running.length < Math.max(1, s.headcount)) {
      for (let i = 0; i < idle; i++) monat();
      const t = deck[pick(deck.length, step)];
      s = startTactic(s, t);
      step++;
    } else if (s.running.length) {
      monat();
    } else {
      break;
    }
  }
  return { ending: pickEnding(s), ...snapshot(s) };
}

const snapshot = (s: GameState) => ({
  months: s.month,
  cash: Math.round(s.cash),
  mrr: s.mrr,
  customers: s.customers,
  inv: Math.round(s.investors),
  team: Math.round(s.team),
  eq: Math.round(s.equity),
  align: Math.round(s.alignment),
  rival: Math.round(s.rival),
  stance: s.stance,
});

const styles: [string, (n: number, i: number) => number][] = [
  ["first card", () => 0],
  ["second card", (n) => Math.min(1, n - 1)],
  ["last card", (n) => n - 1],
  ["alternating", (n, i) => i % n],
  ["cheapest-looking", (n, i) => (i % 2 ? 0 : Math.min(2, n - 1))],
];

for (const [name, pick] of styles) {
  for (const idle of [0, 2]) {
    const runs = [1, 2, 7, 42].map((seed) => play(pick, idle, seed));
    const endings = runs.map((r) => r.ending).join(", ");
    const r = runs[0];
    console.log(
      `${name.padEnd(17)} idle ${idle} → ${endings.padEnd(42)} | m${String(r.months).padStart(2)} ` +
        `cash ${String(r.cash).padStart(7)} mrr ${String(r.mrr).padStart(5)} cust ${r.customers} ` +
        `inv ${r.inv} team ${r.team} eq ${r.eq}% align ${r.align} retoura ${r.rival}%`,
    );
  }
}
