/* ══════════════════════════════════════════════════════════════
   Balance harness for the simulator.

       node --experimental-strip-types scripts/simulator-balance.ts

   Plays the whole story under five fixed strategies and three levels
   of dithering, four seeds each, and prints which ending came out.
   Content changes move these numbers, and the numbers are the only
   way to see things reading cannot: that one ending was swallowing
   three quarters of all games, that the seed ending was arithmetically
   unreachable, that confidence bled out two chapters before anybody
   could spend it.

   Nothing here runs in the browser or in CI — it is a measuring stick
   for whoever next writes a scene.
   ══════════════════════════════════════════════════════════════ */

import {
  advance,
  applyChoice,
  applyEffects,
  brokeNow,
  drawEvent,
  eventDue,
  initialState,
  type GameState,
} from "../lib/simulator.ts";
import { CHAPTERS, EVENTS, SCENE_BY_ID, pickEnding } from "../lib/simulator-scenes.ts";

/** One run: `pick` chooses an index, `idle` = months of deliberation per scene. */
function play(pick: (n: number, step: number) => number, idle: number, seed: number) {
  let s: GameState = { ...initialState(CHAPTERS[0], seed) };
  let step = 0;
  while (s.sceneId !== "@finale" && !brokeNow(s) && step < 30) {
    const scene = SCENE_BY_ID[s.sceneId];
    if (!scene) break;
    s = advance(s, idle);                               // reading the scene
    if (brokeNow(s)) break;
    // events, as the UI fires them
    if (eventDue(s)) {
      const ev = drawEvent(s, EVENTS);
      if (ev) { s = { ...s, fired: [...s.fired, ev.id], lastEvent: s.month };
        for (const b of ev.beats) s = applyEffects(s, b.effects); }
    }
    const c = scene.choices[pick(scene.choices.length, step)];
    s = applyChoice(s, c);
    const nextCh = SCENE_BY_ID[c.next]?.chapter;
    if (nextCh && nextCh > s.chapter) s = { ...s, chapter: nextCh, left: CHAPTERS[nextCh - 1].months };
    step++;
  }
  return { ending: brokeNow(s) ? "insolvent" : pickEnding(s), months: s.month, cash: Math.round(s.cash), eq: Math.round(s.equity), inv: Math.round(s.investors), cust: Math.round(s.customers) };
}

const styles: [string, (n: number, i: number) => number][] = [
  ["always first", () => 0],
  ["always second", (n) => Math.min(1, n - 1)],
  ["always last", (n) => n - 1],
  ["alternating", (n, i) => i % n],
  ["mixed", (n, i) => (i % 2 ? 1 : Math.min(2, n - 1))],
];
for (const [name, pick] of styles) {
  for (const idle of [0, 1, 2]) {
    const runs = [1, 7, 42, 99].map((seed) => play(pick, idle, seed));
    const tally = runs.map((r) => r.ending).join(", ");
    const r = runs[0];
    console.log(`${name.padEnd(15)} idle ${idle} → ${tally.padEnd(46)} | m${r.months} cash ${r.cash} eq ${r.eq}% inv ${r.inv} cust ${r.cust}`);
  }
}
