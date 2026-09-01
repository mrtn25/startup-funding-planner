/* Tests für den Co-Founder-Split.  node --test lib/equity-split.test.ts */

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_SPLIT,
  DEFAULT_VESTING,
  FACTORS,
  PRESETS,
  computeSplit,
  newFounder,
  vestedFraction,
  type FactorKey,
  type SplitInputs,
} from "./equity-split.ts";

const round2 = (n: number) => Math.round(n * 100) / 100;
const flat = (v: number): Record<FactorKey, number> =>
  Object.fromEntries(FACTORS.map((f) => [f.key, v])) as Record<FactorKey, number>;

const twoEqual: SplitInputs = {
  founders: [
    newFounder("A", { scores: flat(5) }),
    newFounder("B", { scores: flat(5) }),
  ],
  weights: flat(5),
  vesting: { years: 4, cliffMonths: 12, creditMonths: 0 },
  departureMonth: 48,
};

/* ── Der Split ── */

test("gleiche Bewertungen ergeben einen gleichen Split", () => {
  const r = computeSplit(twoEqual);
  assert.equal(round2(r.founders[0].share), 0.5);
  assert.equal(round2(r.founders[1].share), 0.5);
  assert.equal(r.spread, 0);
  assert.equal(r.isEssentiallyEqual, true);
});

test("die Anteile summieren sich immer auf eins", () => {
  for (const inputs of [twoEqual, DEFAULT_SPLIT]) {
    const sum = computeSplit(inputs).founders.reduce((a, f) => a + f.share, 0);
    assert.equal(round2(sum), 1);
  }
});

test("doppelte Punktzahl heißt doppelter Anteil", () => {
  const r = computeSplit({
    ...twoEqual,
    founders: [newFounder("A", { scores: flat(8) }), newFounder("B", { scores: flat(4) })],
  });
  assert.equal(round2(r.founders[0].share), round2(2 / 3));
  assert.equal(round2(r.founders[1].share), round2(1 / 3));
});

test("die Gewichtung entscheidet, welcher Beitrag zählt", () => {
  const founders = [
    newFounder("Ideengeber", { scores: { idea: 10, plan: 10, expertise: 2, commitment: 2, responsibility: 2 } }),
    newFounder("Macher", { scores: { idea: 2, plan: 2, expertise: 8, commitment: 10, responsibility: 10 } }),
  ];
  const ideaLed = computeSplit({ ...twoEqual, founders, weights: PRESETS[2].weights });
  const executionLed = computeSplit({ ...twoEqual, founders, weights: PRESETS[0].weights });
  assert.ok(ideaLed.founders[0].share > executionLed.founders[0].share);
  assert.ok(executionLed.founders[1].share > ideaLed.founders[1].share);
});

test("ein Gewicht von null blendet einen Faktor komplett aus", () => {
  const founders = [
    newFounder("A", { scores: { idea: 10, plan: 5, expertise: 5, commitment: 5, responsibility: 5 } }),
    newFounder("B", { scores: { idea: 0, plan: 5, expertise: 5, commitment: 5, responsibility: 5 } }),
  ];
  const r = computeSplit({ ...twoEqual, founders, weights: { ...flat(5), idea: 0 } });
  assert.equal(round2(r.founders[0].share), 0.5);
});

test("ohne Gewichte oder Punkte wird gleich geteilt statt durch null", () => {
  const r = computeSplit({ ...twoEqual, weights: flat(0) });
  assert.equal(round2(r.founders[0].share), 0.5);
  const noScores = computeSplit({
    ...twoEqual,
    founders: [newFounder("A", { scores: flat(0) }), newFounder("B", { scores: flat(0) })],
  });
  assert.equal(round2(noScores.founders[0].share), 0.5);
});

test("der Abstand zum gleichen Split wird ausgewiesen", () => {
  const r = computeSplit({
    ...twoEqual,
    founders: [newFounder("A", { scores: flat(8) }), newFounder("B", { scores: flat(4) })],
  });
  assert.equal(round2(r.founders[0].vsEqual), round2((2 / 3 - 0.5) * 100));
  assert.equal(round2(r.founders[1].vsEqual), round2((1 / 3 - 0.5) * 100));
  assert.equal(r.isEssentiallyEqual, false);
});

/* ── Vesting ── */

test("vor dem Cliff ist nichts gevestet, danach springt es", () => {
  const t = DEFAULT_VESTING;
  assert.equal(vestedFraction(t, 11), 0);
  assert.equal(round2(vestedFraction(t, 12)), 0.25);
  assert.equal(round2(vestedFraction(t, 24)), 0.5);
  assert.equal(vestedFraction(t, 48), 1);
  assert.equal(vestedFraction(t, 60), 1);
});

test("angerechnete Vorarbeit zählt gegen den Cliff", () => {
  const t = { years: 4, cliffMonths: 12, creditMonths: 12 };
  assert.equal(round2(vestedFraction(t, 0)), 0.25); // Cliff ist schon passiert
  assert.equal(round2(vestedFraction(t, 12)), 0.5);
});

test("ohne Cliff vestet es von Anfang an anteilig", () => {
  assert.equal(round2(vestedFraction({ years: 4, cliffMonths: 0, creditMonths: 0 }, 6)), 0.13);
});

test("wer vor dem Cliff geht, behält nichts und gibt alles zurück", () => {
  const r = computeSplit({ ...twoEqual, departureMonth: 6 });
  const a = r.founders[0];
  assert.equal(a.vestedFraction, 0);
  assert.equal(a.keptShare, 0);
  assert.equal(round2(a.forfeitedShare), 0.5);
});

test("wer durchhält, behält alles", () => {
  const r = computeSplit({ ...twoEqual, departureMonth: 48 });
  assert.equal(r.founders[0].vestedFraction, 1);
  assert.equal(round2(r.founders[0].keptShare), 0.5);
  assert.equal(r.founders[0].forfeitedShare, 0);
});

test("Behaltenes und Verfallenes ergeben zusammen den Anteil", () => {
  const r = computeSplit({ ...DEFAULT_SPLIT, departureMonth: 20 });
  for (const f of r.founders) assert.equal(round2(f.keptShare + f.forfeitedShare), round2(f.share));
});

test("bereits geleistete Monate zählen bei der Abgangsrechnung mit", () => {
  const early = computeSplit({
    ...twoEqual,
    founders: [newFounder("A", { scores: flat(5), monthsServed: 0 }), newFounder("B", { scores: flat(5), monthsServed: 24 })],
    departureMonth: 6,
  });
  assert.equal(early.founders[0].vestedFraction, 0); // noch vor dem Cliff
  assert.ok(early.founders[1].vestedFraction > 0.5); // zwei Jahre plus sechs Monate
});

/* ── Die Warnungen ── */

const keys = (r: ReturnType<typeof computeSplit>) => r.warnings.map((w) => w.key);

test("ein gleicher Split wird eingeordnet, nicht verurteilt", () => {
  const r = computeSplit(twoEqual);
  assert.ok(keys(r).includes("equal"));
  assert.equal(r.warnings.find((w) => w.key === "equal")!.level, "note");
});

test("fehlendes Vesting und fehlender Cliff sind Warnungen", () => {
  const noVest = computeSplit({ ...twoEqual, vesting: { years: 0, cliffMonths: 0, creditMonths: 0 } });
  assert.ok(keys(noVest).includes("no-vesting"));
  assert.equal(noVest.warnings.find((w) => w.key === "no-vesting")!.level, "warn");

  const noCliff = computeSplit({ ...twoEqual, vesting: { years: 4, cliffMonths: 0, creditMonths: 0 } });
  assert.ok(keys(noCliff).includes("no-cliff"));
});

test("vier Jahre lösen keine Warnung aus, zwei schon", () => {
  assert.ok(!keys(computeSplit(twoEqual)).includes("odd-vesting"));
  assert.ok(keys(computeSplit({ ...twoEqual, vesting: { years: 2, cliffMonths: 12, creditMonths: 0 } })).includes("odd-vesting"));
});

test("eine erdrückende Mehrheit wird benannt", () => {
  const r = computeSplit({
    ...twoEqual,
    founders: [newFounder("A", { scores: flat(10) }), newFounder("B", { scores: flat(1) })],
  });
  assert.ok(keys(r).includes("dominant"));
});

test("ein zu schwer gewichteter Ideenanteil wird angesprochen", () => {
  const r = computeSplit({ ...twoEqual, weights: { idea: 10, plan: 2, expertise: 2, commitment: 2, responsibility: 2 } });
  assert.ok(keys(r).includes("idea-heavy"));
  assert.ok(!keys(computeSplit(twoEqual)).includes("idea-heavy"));
});

test("jede Warnung hat Text und, wo sie sich auf Forschung stützt, eine Quelle", () => {
  const r = computeSplit({ ...twoEqual, vesting: { years: 0, cliffMonths: 0, creditMonths: 0 } });
  for (const w of r.warnings) {
    assert.ok(w.text.length > 30, `${w.key} braucht Text`);
    assert.ok(["warn", "note"].includes(w.level));
  }
  assert.ok(r.warnings.find((w) => w.key === "no-vesting")!.sources.length > 0);
});

test("die Ausgangswerte ergeben einen ungleichen, verteidigbaren Split", () => {
  const r = computeSplit(DEFAULT_SPLIT);
  assert.equal(r.founders.length, 2);
  assert.ok(r.spread > 2, "die Startwerte sollen zeigen, dass Faktoren etwas bewirken");
  assert.ok(r.founders.every((f) => f.share > 0.2 && f.share < 0.8));
});
