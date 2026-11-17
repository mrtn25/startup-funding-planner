/* ══════════════════════════════════════════════════════════════
   Balance harness.

       node --experimental-strip-types scripts/simulator-balance.ts

   Plays the whole chain under several card-picking strategies and
   prints where each run ended, how long it took and what Retoura was
   doing by then. Content changes move these numbers; reading the
   content does not show you that one ending swallows every run, or
   that a milestone is unreachable with its own deck.
   ══════════════════════════════════════════════════════════════ */

import { applyEffects, canStart, deckFor, annehmen, drawAngebot, erloes, drawEntscheidung, drawEvent, entscheiden, eventDue, finishTactic, fluss, forcedEnding, initialState, startTactic, tickBoard, type GameState } from "../lib/simulator.ts";
import { ANGEBOTE, ENTSCHEIDUNGEN, EVENTS, MILESTONE_BY_ID, TACTICS, pickEnding } from "../lib/simulator-scenes.ts";

/** `pick` wählt eine Karte; `idle` sind Monate Zögern vor jedem Start. */
function play(pick: (n: number, step: number) => number, idle: number, seed: number, nimmtAngebot: (nr: number, kommtAn: number) => boolean = () => false, wartet = false) {
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
    /* Entscheidungen vor Ereignissen, wie auf dem Brett. Gewählt wird
       mit derselben Strategie wie bei den Maßnahmen — sonst bliebe der
       Lauf blind für Wege, die Geld oder Anteile kosten. */
    /* Ein Angebot hat Vorrang und kann die Partie beenden. Jede
       zweite Strategie nimmt das erste, das kommt — das ist die
       Falle, und sie muss im Lauf sichtbar werden. */
    const a = drawAngebot(s, ANGEBOTE);
    if (a) {
      /* annehmen setzt endingId — die Schleife unten liest das und
         beendet die Partie. Hier zurückzuspringen würde nur den Monat
         abbrechen, nicht das Spiel. */
      const preis = a.preis(s);
      const kommtAn = erloes(Math.round(preis * (a.bar ?? 1)), s).gruender;
      s = nimmtAngebot(s.gesehen.length, kommtAn)
        ? annehmen(s, a, preis)
        : { ...s, gesehen: [...s.gesehen, a.id] };
    }
    const wahl = drawEntscheidung(s, ENTSCHEIDUNGEN);
    if (wahl) s = entscheiden(s, wahl, wahl.wege[pick(wahl.wege.length, step) % wahl.wege.length]);
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
    if (s.endingId) return { ending: s.endingId, ...snapshot(s) };
    const tot = forcedEnding(s);
    if (tot) return { ending: tot, ...snapshot(s) };

    const alle = deckFor(s, m, TACTICS).filter((t) => canStart(s, t));
    /* Dauerkarten sind Lückenfüller. Eine Strategie, die immer sie
       zieht, misst nichts über das Spiel. */
    const echte = alle.filter((t) => !t.repeatable);
    const deck = echte.length ? echte : alle;
    /* Der geduldige Spieler lässt die Runden liegen, die ihm beim
       Verkauf den Erlös wegnehmen würden. */
    const gefiltert = wartet ? deck.filter((t) => (t.effects.runde?.faktor ?? 1) < 2) : deck;
    if (gefiltert.length && s.running.length < Math.max(1, s.leute.length)) {
      for (let i = 0; i < idle; i++) monat();
      const t = gefiltert[pick(gefiltert.length, step)];
      s = startTactic(s, t);
      step++;
    } else if (s.running.length) {
      monat();
    } else {
      /* Nichts läuft und nichts ist bezahlbar. Im Spiel vergeht
         trotzdem Zeit — bis das Geld alle ist oder wieder etwas
         geht. Hier abzubrechen hat Partien als "stehen" gezählt, die
         in Wahrheit in die Insolvenz liefen. */
      monat();
    }
  }
  return { ending: pickEnding(s), ...snapshot(s) };
}

const snapshot = (s: GameState) => ({
  months: s.month,
  raus: Math.round(fluss(s).raus),
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

const styles: [string, (n: number, i: number) => number, boolean?, boolean?][] = [
  ["first card", () => 0],
  ["second card", (n) => Math.min(1, n - 1)],
  ["last card", (n) => n - 1],
  ["alternating", (n, i) => i % n],
  ["cheapest-looking", (n, i) => (i % 2 ? 0 : Math.min(2, n - 1))],
  ["nimmt das erste Angebot", () => 0, true],
  ["wartet, ohne sich wegzuverwässern", (n, i) => i % n, false, true],
];

for (const [name, pick, kauft, wartet] of styles) {
  for (const idle of [0, 2]) {
    /* „wartet“ lehnt das erste Angebot ab und nimmt jedes spätere. */
    const haltung = wartet ? (nr: number, kommtAn: number) => nr > 0 && kommtAn > 500_000 : () => !!kauft;
    const runs = [1, 2, 7, 42].map((seed) => play(pick, idle, seed, haltung, !!wartet));
    const endings = runs.map((r) => r.ending).join(", ");
    const r = runs[0];
    console.log(
      `${name.padEnd(27)} idle ${idle} → ${endings.padEnd(46)} | m${String(r.months).padStart(2)} raus ${String(r.raus).padStart(6)} ` +
        `cash ${String(r.cash).padStart(7)} mrr ${String(r.mrr).padStart(5)} cust ${r.customers} ` +
        `inv ${r.inv} team ${r.team} eq ${r.eq}% align ${r.align} retoura ${r.rival}%`,
    );
  }
}
