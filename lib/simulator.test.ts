/* Tests für Palettio.  node --test lib/simulator.test.ts */

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  advance,
  eventDue,
  applyChoice,
  applyEffects,
  badges,
  brokeNow,
  drawEvent,
  initialState,
  meterViews,
  runway,
  tick,
  type Choice,
  type GameEvent,
  type GameState,
} from "./simulator.ts";
import { CHAPTERS, ENDING_BY_ID, ENDINGS, EVENTS, INTRO, SCENES, SCENE_BY_ID, pickEnding } from "./simulator-scenes.ts";

const S = (patch: Partial<GameState> = {}): GameState => ({ ...initialState(CHAPTERS[0]), ...patch });
const C = (patch: Partial<Choice> = {}): Choice => ({
  id: "x",
  label: "x",
  effects: {},
  beats: ["a", "b"],
  next: "c1-jonas",
  ...patch,
});

/* ── Die Uhr ── */

test("ein Monat bringt Umsatz, kostet Burn, Zeit und etwas Vertrauen", () => {
  const a = S({ cash: 20_000, burn: 1_250, left: 14, investors: 40, customers: 12 });
  const b = tick(a);
  // 12 Punkte: 1.500 € Umsatz, 180 € Servicekosten, 1.250 € Fixkosten.
  assert.equal(b.cash, 20_000 + 1_500 - 180 - 1_250);
  assert.equal(b.left, 13);
  assert.equal(b.month, 1);
  assert.ok(b.investors <= 41 && b.investors >= 38, `Vertrauen sprang auf ${b.investors}`);
});

test("vor der ersten Rechnung verfällt kein Vertrauen", () => {
  // Kapitel 1 bis 3: es gibt niemanden, der einen vergessen könnte.
  let fruh = S({ investors: 30, chapter: 1 });
  for (let i = 0; i < 12; i++) fruh = tick(fruh);
  assert.ok(fruh.investors >= 27, `in Kapitel 1 auf ${fruh.investors} gefallen`);

  let spaet = S({ investors: 30, chapter: 5 });
  for (let i = 0; i < 12; i++) spaet = tick(spaet);
  assert.ok(spaet.investors < 28, `in Kapitel 5 nur auf ${spaet.investors} gefallen`);
});

test("das Vertrauen zappelt, statt gleichmäßig zu fallen", () => {
  let s = S({ investors: 60, chapter: 5 });
  const folge: number[] = [];
  for (let i = 0; i < 12; i++) {
    s = tick(s);
    folge.push(s.investors);
  }
  const schritte = folge.slice(1).map((v, i) => v - folge[i]);
  assert.ok(new Set(schritte).size > 1, "immer derselbe Schritt — das ist eine Rampe, kein Spiel");
  assert.ok(s.investors < 60, "über zwölf Monate muss es netto fallen");
});

test("derselbe Seed spielt dieselbe Partie", () => {
  const a = advance(S({ seed: 42 }), 10);
  const b = advance(S({ seed: 42 }), 10);
  assert.deepEqual(a, b);
});

test("die Kapiteluhr bleibt bei null stehen", () => {
  const s = advance(S({ left: 3 }), 8);
  assert.equal(s.left, 0);
  assert.equal(s.month, 8);
});

test("leere Kasse ist leer, nicht negativ erzählt", () => {
  assert.equal(brokeNow(S({ cash: 1 })), false);
  assert.equal(brokeNow(S({ cash: 0 })), true);
  assert.equal(brokeNow(S({ cash: -200 })), true);
});

/* ── Entscheidungen ── */

test("eine Entscheidung kostet Monate und wirkt danach", () => {
  const s = applyChoice(S({ cash: 30_000, burn: 1_000, customers: 0 }), C({ months: 3, effects: { cash: 12_000, customers: 10 } }));
  assert.equal(s.cash, 30_000 - 3_000 + 12_000);
  assert.equal(s.month, 3);
  assert.equal(s.sceneId, "c1-jonas");
});

test("Anteile gehen nur runter", () => {
  assert.equal(applyEffects(S({ equity: 100 }), { equity: -40 }).equity, 60);
  assert.equal(applyEffects(S({ equity: 60 }), { equity: 25 }).equity, 60);
});

test("ein Hire hebt den Burn für jeden weiteren Monat", () => {
  const nach = applyChoice(S({ burn: 1_250, customers: 0 }), C({ months: 1, effects: { burn: 7_500 } }));
  assert.equal(nach.burn, 8_750);
  assert.equal(tick(nach).cash - nach.cash, -8_750);
});

test("Kunden bringen Geld und kosten Geld", () => {
  const knapp = S({ cash: 10_000, burn: 4_000, customers: 30 });
  assert.equal(tick(knapp).cash, 10_000 + 3_750 - 450 - 4_000);
  // Netto 110 € je Punkt: unter ~36 Punkten trägt sich ein 4-k€-Monat nicht.
  assert.ok(tick(S({ cash: 10_000, burn: 4_000, customers: 34 })).cash < 10_000);
  assert.ok(tick(S({ cash: 10_000, burn: 4_000, customers: 40 })).cash > 10_000);
  assert.equal(meterViews(S({ cash: 10_000, burn: 4_000, customers: 40 }))[0].value, "pays");
  assert.equal(runway(S({ cash: 10_000, burn: 4_000, customers: 40 })), Infinity);
});

test("ein sehr langer Runway wird gedeckelt statt präzise gelogen", () => {
  // Die Ausgangslage: 12.400 € bei 580 € Netto-Burn sind 21 Monate — und
  // zwei, sobald jemand eingestellt wird.
  const s = S({ cash: 12_400, burn: 1_900, customers: 12 });
  assert.equal(runway(s), 21);
  assert.equal(meterViews(s)[0].value, "21 mo");
  assert.equal(meterViews(S({ cash: 120_000, burn: 1_900, customers: 12 }))[0].value, "24+ mo");
});

test("Prozentwerte bleiben in ihren Grenzen", () => {
  assert.equal(applyEffects(S({ customers: 96 }), { customers: 20 }).customers, 100);
  assert.equal(applyEffects(S({ investors: 4 }), { investors: -30 }).investors, 0);
});

/* ── Ereignisse ── */

test("Ereignisse kommen mit Abstand, nicht im Rudel", () => {
  // Der Bug: die Bedingung fragte "Monat durch drei teilbar". Die Uhr steht,
  // während eine Karte offen ist — also war sie nach dem Schließen sofort
  // wieder wahr, und sieben Ereignisse kamen am Stück.
  assert.equal(eventDue(S({ month: 0, lastEvent: 0 })), false);
  assert.equal(eventDue(S({ month: 3, lastEvent: 0 })), true);
  assert.equal(eventDue(S({ month: 3, lastEvent: 3 })), false, "zweimal im selben Monat");
  assert.equal(eventDue(S({ month: 5, lastEvent: 3 })), false);
  assert.equal(eventDue(S({ month: 6, lastEvent: 3 })), true);
});

test("jedes Ereignis feuert höchstens einmal", () => {
  const evs: GameEvent[] = [
    { id: "a", beats: [{ text: "a" }] },
    { id: "b", beats: [{ text: "b" }] },
  ];
  const erst = drawEvent(S(), evs);
  assert.ok(erst);
  const zweit = drawEvent(S({ fired: [erst!.id] }), evs);
  assert.ok(zweit && zweit.id !== erst!.id);
  assert.equal(drawEvent(S({ fired: ["a", "b"] }), evs), null);
});

test("Ereignisse respektieren Kapitel und Bedingung", () => {
  const evs: GameEvent[] = [
    { id: "spaet", chapter: 2, beats: [{ text: "x" }] },
    { id: "nurMitKunden", when: (s) => s.customers >= 40, beats: [{ text: "y" }] },
  ];
  assert.equal(drawEvent(S({ chapter: 1, customers: 10 }), evs), null);
  assert.equal(drawEvent(S({ chapter: 2, customers: 10 }), evs)?.id, "spaet");
  assert.equal(drawEvent(S({ chapter: 1, customers: 55 }), evs)?.id, "nurMitKunden");
});

test("ein Ereignis wirkt erst, wenn sein Beat gezeigt wird", () => {
  const ev = EVENTS.find((e) => e.id === "rotterdam")!;
  const vorher = S({ investors: 50 });
  const nachBeat1 = applyEffects(vorher, ev.beats[0].effects);
  assert.equal(nachBeat1.investors, 50);
  const nachBeat2 = applyEffects(nachBeat1, ev.beats[1].effects);
  assert.equal(nachBeat2.investors, 43);
});

/* ── Anzeige ── */

test("die Kasse steht als Runway in Monaten da", () => {
  assert.equal(runway(S({ cash: 25_000, burn: 10_000, customers: 0 })), 2);
  const v = meterViews(S({ cash: 25_000, burn: 10_000, customers: 0 }));
  assert.equal(v[0].value, "2 mo");
  assert.equal(v[0].tone, "bad");
  assert.equal(meterViews(S({ cash: 100_000, burn: 10_000, customers: 0 }))[0].tone, "ok");
});

test("Badges lesen sich wie das, was passiert ist", () => {
  assert.deepEqual(
    badges({ cash: 100_000, equity: -40, investors: -10, burn: 7_500 }).map((b) => b.label),
    ["+100k €", "−10% investors", "−40% of the company", "+7.5k €/mo burn"],
  );
  assert.equal(badges({ burn: 7_500 })[0].up, false);
  assert.equal(badges(undefined).length, 0);
});

/* ── Der Inhalt ── */

test("das Intro setzt Person, Problem und Ausgangslage — noch ohne Firmennamen", () => {
  assert.match(INTRO.who, /Lena/);
  const text = INTRO.lines.join(" ");
  // Erst das Problem, dann die Firma: zu diesem Zeitpunkt heißt sie noch nichts.
  assert.match(text, /empty/i, "das Problem muss im Intro stehen");
  assert.match(text, /12,400/, "die Ausgangskasse muss im Intro stehen");
  assert.match(text, /Jonas/);
  assert.ok(!text.includes("Palettio"), "die Firma hat hier noch keinen Namen");
  assert.ok(INTRO.rules.length >= 3);
  assert.match(INTRO.rules.join(" "), /clock runs while you decide/);
});

test("jede Wahl führt irgendwohin und erzählt zwei Beats", () => {
  for (const s of SCENES) {
    for (const c of s.choices) {
      assert.ok(c.next === "@finale" || SCENE_BY_ID[c.next], `${s.id}/${c.id} → ${c.next}`);
      assert.equal(c.beats.length, 2, `${s.id}/${c.id} hat keine zwei Beats`);
      assert.ok(c.beats[0].length > 40 && c.beats[1].length > 40, `${s.id}/${c.id} zu dünn`);
    }
  }
});

test("keine Szene bewertet die Wahl", () => {
  const bewertend = /(right choice|wrong choice|you should have|mistake|well done|good job)/i;
  for (const s of SCENES) {
    for (const c of s.choices) {
      for (const b of c.beats) assert.ok(!bewertend.test(b), `${s.id}/${c.id} benotet: ${b}`);
    }
  }
});

test("Szenentexte bleiben kurz — die Uhr läuft beim Lesen", () => {
  for (const s of SCENES) {
    assert.ok(s.text.length <= 230, `${s.id} ist zu lang (${s.text.length})`);
    assert.ok(s.choices.length >= 3, `${s.id} hat zu wenig Optionen`);
  }
});

test("die Szenen handeln von dieser einen Firma", () => {
  const alles = SCENES.map((s) => `${s.title} ${s.text}`).join(" ");
  for (const name of ["Jonas", "Krämer", "Oltmanns", "Palettio", "Ole"]) {
    assert.ok(alles.includes(name), `${name} kommt nirgends vor`);
  }
});

test("jedes Ereignis trägt eine Zahl, sonst ist es keine Nachricht", () => {
  for (const e of EVENTS) {
    assert.ok(e.beats.length >= 1 && e.beats.length <= 2, `${e.id} hat ${e.beats.length} Beats`);
    const wirkt = e.beats.some((b) => b.effects && Object.keys(b.effects).length > 0);
    assert.ok(wirkt, `${e.id} passiert folgenlos`);
  }
  assert.ok(EVENTS.length >= 10, "zu wenige Ereignisse für zwei Kapitel");
});

test("die fünf Kapitel bilden die Reise ab, in dieser Reihenfolge", () => {
  assert.equal(CHAPTERS.length, 5);
  for (let i = 0; i < CHAPTERS.length; i++) {
    assert.equal(CHAPTERS[i].number, i + 1);
    assert.ok(CHAPTERS[i].blurb.length > 30, `Kapitel ${i + 1} ohne Einordnung`);
    assert.ok(CHAPTERS[i].image.length > 2);
  }
  // Problem, Prototyp, Test, erste Kunden, fremdes Geld — jede Phase hat Szenen.
  for (const ch of CHAPTERS) {
    assert.ok(SCENES.some((s) => s.chapter === ch.number), `Kapitel ${ch.number} hat keine Szene`);
  }
});

test("jede Szene führt vorwärts, nie zurück in ein früheres Kapitel", () => {
  for (const s of SCENES) {
    for (const c of s.choices) {
      if (c.next === "@finale") continue;
      assert.ok(SCENE_BY_ID[c.next].chapter >= s.chapter, `${s.id} → ${c.next} springt zurück`);
    }
  }
});

test("die Uhr eines Kapitels reicht für seine eigenen Szenen", () => {
  for (const ch of CHAPTERS) {
    assert.ok(SCENE_BY_ID[ch.firstScene], `Kapitel ${ch.number} startet im Nichts`);
    // Der langsamste Weg durchs Kapitel, plus ein Monat Bedenkzeit je Szene.
    const szenen = SCENES.filter((s) => s.chapter === ch.number);
    const langsamster = szenen.reduce((a, s) => a + Math.max(...s.choices.map((c) => c.months ?? 1)) + 1, 0);
    assert.ok(
      ch.months >= langsamster,
      `Kapitel ${ch.number}: Uhr ${ch.months} Monate, langsamster Weg ${langsamster}`,
    );
  }
});

test("jedes vergebene Ende existiert", () => {
  const faelle = [
    S({ cash: 0 }),
    S({ cash: 150_000, investors: 70, customers: 60 }),
    S({ cash: 90_000, investors: 20, customers: 70 }),
    S({ cash: 30_000, investors: 40, customers: 20 }),
    S({ cash: 4_000, investors: 10, customers: 10 }),
  ];
  const ids = new Set(faelle.map(pickEnding));
  for (const id of ids) assert.ok(ENDING_BY_ID[id], `unbekannt: ${id}`);
  assert.ok(ids.size >= 4);
  assert.equal(ENDINGS.length, 5);
});

/* ── Eine ganze Partie mit laufender Uhr ── */

test("eine Partie läuft bis zum Ende durch, Uhr und Entscheidungen zusammen", () => {
  let s = S({ seed: 7 });
  let schritte = 0;
  while (s.sceneId !== "@finale" && !brokeNow(s) && schritte < 40) {
    const scene = SCENE_BY_ID[s.sceneId];
    assert.ok(scene, `Sackgasse bei ${s.sceneId}`);
    // Zwischen zwei Entscheidungen vergeht Zeit, wie beim echten Spielen.
    s = advance(s, 2);
    if (brokeNow(s)) break;
    s = applyChoice(s, scene.choices[0]);
    const kapitel = SCENE_BY_ID[scene.choices[0].next]?.chapter;
    if (kapitel && kapitel > s.chapter) {
      s = { ...s, chapter: kapitel, left: CHAPTERS[kapitel - 1].months };
    }
    schritte++;
  }
  assert.ok(schritte >= 5, "die Partie ist zu kurz");
  const ende = pickEnding(s);
  assert.ok(ENDING_BY_ID[ende]);
  assert.ok(isFinite(s.cash) && isFinite(s.equity));
});

test("wer das Angebot annimmt, hält danach 60 Prozent", () => {
  const angel = SCENE_BY_ID["c5-angel"];
  const nehmen = angel.choices.find((c) => c.id === "accept")!;
  const wandeln = angel.choices.find((c) => c.id === "convertible")!;
  assert.equal(applyChoice(S(), nehmen).equity, 60);
  assert.ok(applyChoice(S(), wandeln).equity > 60);
});
