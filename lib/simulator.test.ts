/* Tests für den Founder-Simulator.  node --test lib/simulator.test.ts */

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  START,
  applyChoice,
  effectLines,
  forcedEnding,
  meterViews,
  runway,
  type Choice,
  type GameState,
} from "./simulator.ts";
import { CHAPTERS, ENDINGS, ENDING_BY_ID, SCENES, SCENE_BY_ID, pickEnding } from "./simulator-scenes.ts";

const S = (patch: Partial<GameState> = {}): GameState => ({ ...START, sceneId: "c1-split", ...patch });
const C = (patch: Partial<Choice> = {}): Choice => ({
  id: "x",
  label: "x",
  effects: {},
  reality: "x",
  next: "c1-job",
  ...patch,
});

/* ── Die Mechanik ── */

test("ein Zug kostet Monate, und Monate kosten Geld", () => {
  const r = applyChoice(S({ cash: 20_000, burn: 2_000 }), C({ months: 3 }));
  assert.equal(r.month, 3);
  assert.equal(r.cash, 14_000);
});

test("Investorenvertrauen sinkt von allein, einen Punkt je Monat", () => {
  const r = applyChoice(S({ investors: 50 }), C({ months: 4 }));
  assert.equal(r.investors, 46);
});

test("Effekte landen nach dem Zeitverbrauch", () => {
  const r = applyChoice(S({ cash: 10_000, burn: 1_000, investors: 30 }), C({ months: 2, effects: { cash: 50_000, investors: 10 } }));
  assert.equal(r.cash, 10_000 - 2_000 + 50_000);
  assert.equal(r.investors, 30 - 2 + 10);
});

test("Anteile gehen nur runter, nie hoch", () => {
  const runter = applyChoice(S({ equity: 100 }), C({ effects: { equity: -40 } }));
  assert.equal(runter.equity, 60);
  const hoch = applyChoice(S({ equity: 60 }), C({ effects: { equity: 25 } }));
  assert.equal(hoch.equity, 60);
});

test("Prozentmeter bleiben zwischen null und hundert", () => {
  const hoch = applyChoice(S({ customers: 95 }), C({ effects: { customers: 40 } }));
  assert.equal(hoch.customers, 100);
  const runter = applyChoice(S({ investors: 3 }), C({ months: 1, effects: { investors: -20 } }));
  assert.equal(runter.investors, 0);
});

test("ein Hire hebt den Burn dauerhaft", () => {
  const r = applyChoice(S({ burn: 1_200 }), C({ effects: { burn: 7_500 } }));
  assert.equal(r.burn, 8_700);
  const danach = applyChoice(r, C({ months: 2 }));
  assert.equal(danach.cash, r.cash - 17_400);
});

test("Runway ist Kasse durch Burn, abgerundet", () => {
  assert.equal(runway(S({ cash: 25_000, burn: 10_000 })), 2);
  assert.equal(runway(S({ cash: 0, burn: 1_000 })), 0);
  assert.equal(runway(S({ burn: 0 })), null);
});

test("nur leere Kasse beendet die Partie von selbst", () => {
  assert.equal(forcedEnding(S({ cash: 1 })), null);
  assert.equal(forcedEnding(S({ cash: 0 })), "insolvent");
  assert.equal(forcedEnding(S({ investors: 0, customers: 0, cash: 50_000 })), null);
});

/* ── Die Anzeige ── */

test("die Kasse wird als Runway angezeigt, nicht als Kontostand", () => {
  const v = meterViews(S({ cash: 24_000, burn: 8_000 }));
  const cash = v.find((x) => x.key === "cash")!;
  assert.equal(cash.value, "3 mo");
  assert.equal(cash.tone, "warn");
  assert.equal(meterViews(S({ cash: 8_000, burn: 8_000 }))[0].tone, "bad");
  assert.equal(meterViews(S({ cash: 80_000, burn: 8_000 }))[0].tone, "ok");
});

test("die Deltas auf der Ergebniskarte lesen sich wie Geld und Punkte", () => {
  const lines = effectLines(C({ effects: { cash: 100_000, equity: -40, burn: 7_500 } }));
  assert.deepEqual(
    lines.map((l) => `${l.label} ${l.delta}`),
    ["Cash +100 k€", "Your equity −40", "Burn +7.5 k€ / mo"],
  );
  // Mehr Burn ist keine gute Nachricht.
  assert.equal(lines[2].up, false);
});

/* ── Der Inhalt ── */

test("jede Wahl führt zu einer Szene, die es gibt", () => {
  for (const scene of SCENES) {
    for (const choice of scene.choices) {
      const ok = choice.next === "@finale" || !!SCENE_BY_ID[choice.next];
      assert.ok(ok, `${scene.id} → ${choice.id} zeigt auf ${choice.next}`);
    }
  }
});

test("jede Szene hat Bild, Text und mindestens zwei Optionen", () => {
  for (const s of SCENES) {
    assert.ok(s.image.length > 2, `${s.id} ohne Bild`);
    assert.ok(s.text.length > 80, `${s.id} zu dünn`);
    assert.ok(s.choices.length >= 2, `${s.id} ohne echte Wahl`);
  }
});

test("jede Option erklärt, was in Wirklichkeit passiert", () => {
  for (const s of SCENES) {
    for (const c of s.choices) {
      assert.ok(c.reality.length > 100, `${s.id}/${c.id} ohne Realitätscheck`);
      assert.ok(!/^(Richtig|Falsch|Gut gemacht)/.test(c.reality), `${s.id}/${c.id} bewertet statt zu erklären`);
    }
  }
});

test("keine Option ist umsonst — jede kostet Zeit oder bewegt etwas", () => {
  for (const s of SCENES) {
    for (const c of s.choices) {
      const bewegt = Object.values(c.effects).some((v) => v !== 0);
      assert.ok(bewegt || (c.months ?? 1) > 0, `${s.id}/${c.id} ist folgenlos`);
    }
  }
});

test("beide Kapitel fangen bei einer echten Szene an", () => {
  for (const ch of CHAPTERS) {
    assert.ok(SCENE_BY_ID[ch.firstScene], `Kapitel ${ch.number} startet im Nichts`);
    assert.equal(SCENE_BY_ID[ch.firstScene].chapter, ch.number);
  }
});

test("jedes Ende, das das Modell vergibt, existiert auch", () => {
  const faelle: GameState[] = [
    S({ cash: 0 }),
    S({ cash: 120_000, investors: 70, customers: 60 }),
    S({ cash: 90_000, investors: 20, customers: 70 }),
    S({ cash: 30_000, investors: 40, customers: 20 }),
    S({ cash: 5_000, investors: 10, customers: 10 }),
  ];
  const getroffen = new Set(faelle.map((f) => pickEnding(f)));
  for (const id of getroffen) assert.ok(ENDING_BY_ID[id], `unbekanntes Ende: ${id}`);
  // Die Fälle sind so gewählt, dass sie verschiedene Enden treffen.
  assert.ok(getroffen.size >= 4);
  assert.equal(ENDINGS.length, 5);
});

test("eine leere Kasse schlägt jedes andere Ende", () => {
  assert.equal(pickEnding(S({ cash: 0, investors: 90, customers: 90 })), "insolvent");
});

/* ── Eine ganze Partie ── */

test("wer immer die erste Option nimmt, kommt heil bis zum Ende durch", () => {
  let s = S({ sceneId: CHAPTERS[0].firstScene });
  let schritte = 0;
  while (s.sceneId !== "@finale" && schritte < 20) {
    const scene = SCENE_BY_ID[s.sceneId];
    assert.ok(scene, `Sackgasse bei ${s.sceneId}`);
    s = applyChoice(s, scene.choices[0]);
    schritte++;
  }
  assert.equal(s.sceneId, "@finale");
  assert.ok(schritte >= 7, "die Partie ist zu kurz");
  assert.ok(isFinite(s.cash) && isFinite(s.equity));
  assert.ok(ENDING_BY_ID[pickEnding(s)]);
});

test("wer alles verschenkt, hält am Ende deutlich weniger", () => {
  const gierig = SCENE_BY_ID["c2-angel"].choices.find((c) => c.id === "accept")!;
  const wandel = SCENE_BY_ID["c2-angel"].choices.find((c) => c.id === "convertible")!;
  const a = applyChoice(S(), gierig);
  const b = applyChoice(S(), wandel);
  assert.ok(a.equity < b.equity);
  assert.equal(a.equity, 60);
});
