/* ══════════════════════════════════════════════════════════════
   Balance harness.

       node --experimental-strip-types scripts/simulator-balance.ts

   Plays the whole chain under several card-picking strategies and
   prints where each run ended, how long it took and what Retoura was
   doing by then. Content changes move these numbers; reading the
   content does not show you that one ending swallows every run, or
   that a milestone is unreachable with its own deck.
   ══════════════════════════════════════════════════════════════ */

import { applyEffects, deckFor, forcedEnding, initialState, runTactic, runway, type GameState } from "../lib/simulator.ts";
import { MILESTONES, MILESTONE_BY_ID, TACTICS, pickEnding } from "../lib/simulator-scenes.ts";

/** `pick` chooses a card; `idle` is months of dithering before each. */
function play(pick: (n: number, step: number) => number, idle: number, seed: number) {
  let s: GameState = initialState(seed);
  let step = 0;
  while (step < 40) {
    const m = MILESTONE_BY_ID[s.milestoneId];
    if (!m) break;
    if (m.gate(s)) {
      if (!m.next) break;
      const next = MILESTONE_BY_ID[m.next];
      /* The stage's own arrival effect counts too — leaving it out here
         is how a harness quietly stops describing the real game. */
      const enter = next.onEnter;
      s = { ...(enter && (!enter.when || enter.when(s)) ? applyEffects(s, enter.effects) : s), milestoneId: m.next };
      continue;
    }
    const deck = deckFor(s, m, TACTICS);
    if (!deck.length) break;
    // Dithering costs months like anything else.
    for (let i = 0; i < idle; i++) s = runTactic(s, { ...deck[0], id: "__idle", months: 1, effects: {}, cost: 0 });
    const dead = forcedEnding(s);
    if (dead) return { ending: dead, ...snapshot(s) };
    s = runTactic(s, deck[pick(deck.length, step)]);
    const after = forcedEnding(s);
    if (after) return { ending: after, ...snapshot(s) };
    step++;
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
  runway: runway(s),
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
