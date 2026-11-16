/* Tests für die Bootstrap-Prüfung.  node --test lib/bootstrap.test.ts */

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assess,
  byFundability,
  CONDITIONS,
  EMPTY,
  FACT_TEXT,
  FACT_WEIGHT,
  factScore,
  MODELS,
  MODEL_BY_ID,
  SRC,
  TECHNIQUES,
  type BootstrapState,
  type CondId,
  type Facts,
} from "./bootstrap.ts";

const S = (patch: Partial<BootstrapState> = {}): BootstrapState => ({ ...EMPTY, ...patch });
const ALLE = CONDITIONS.map((c) => c.id);

test("die vier Fakten sind vollständig gewichtet", () => {
  const summe = Object.values(FACT_WEIGHT).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(summe - 1) < 1e-9, `die Gewichte ergeben ${summe}, nicht 1`);
  // Zeit bis zur ersten Rechnung wiegt am schwersten — das ist Bhidés Befund.
  const sortiert = Object.entries(FACT_WEIGHT).sort((a, b) => b[1] - a[1]);
  assert.equal(sortiert[0][0], "firstEuro");
});

test("jedes Geschäftsmodell ist vollständig beschrieben", () => {
  assert.ok(MODELS.length >= 8, "zu wenige Modelle, um eine echte Wahl zu sein");
  for (const m of MODELS) {
    assert.ok(m.what.length > 30, `${m.id}: sagt nicht, was verkauft wird`);
    assert.ok(m.note.length > 50, `${m.id}: ohne ehrliches Urteil`);
    assert.ok(m.lever.length > 30, `${m.id}: ohne Hebel`);
    assert.ok(m.sources.length > 0, `${m.id} ohne Beleg`);
    for (const id of m.sources) assert.ok(SRC[id], `${m.id} zitiert ${id}, das es nicht gibt`);
    for (const k of Object.keys(FACT_WEIGHT) as (keyof Facts)[]) {
      assert.ok(FACT_TEXT[k][m.facts[k]], `${m.id}: ${k} hat keinen Text`);
    }
  }
});

test("Beratung steht oben, Hardware und Deep Tech unten", () => {
  // Der Kern des Werkzeugs: das Modell entscheidet, nicht die Haltung.
  const reihe = byFundability().map((m) => m.id);
  assert.ok(reihe.indexOf("consulting") <= 2, "Dienstleistung muss unter den ersten stehen");
  assert.ok(reihe.indexOf("productized") <= 2);
  assert.ok(reihe.indexOf("hardware") >= reihe.length - 3, "Hardware kann sich nicht selbst finanzieren");
  assert.ok(reihe.indexOf("deeptech") >= reihe.length - 3);
  assert.ok(factScore(MODEL_BY_ID.consulting.facts) > factScore(MODEL_BY_ID.hardware.facts) + 0.5);
});

test("kein Haken, kein Urteil", () => {
  // Ohne eine einzige bezahlte Rechnung darf nirgends „geht“ stehen.
  for (const m of MODELS) {
    const r = assess(S({ model: m.id, ticked: [] }));
    assert.notEqual(r.verdict, "yes", `${m.id} bekommt grünes Licht, ohne dass irgendetwas stimmt`);
    assert.ok(r.blocker, "es muss immer einen nächsten Schritt geben");
  }
});

test("dasselbe Geschäft, alles erfüllt — und es kippt", () => {
  const leer = assess(S({ model: "consulting", ticked: [] }));
  const voll = assess(S({ model: "consulting", ticked: ALLE }));
  assert.equal(voll.verdict, "yes");
  assert.ok(voll.score > leer.score + 0.4);
  assert.equal(voll.blocker, null, "wenn alles stimmt, steht nichts mehr im Weg");
  assert.match(voll.headline, /itself/);
});

test("alle Haken retten das falsche Geschäftsmodell nicht", () => {
  // Eine unterschriebene Rechnung heilt keine Fabrik.
  const hardware = assess(S({ model: "hardware", ticked: ALLE }));
  assert.notEqual(hardware.verdict, "yes", "Hardware mit allen Haken ist trotzdem kein Selbstläufer");
  assert.ok(hardware.weakFact, "das Modell muss seine eigene Grenze nennen");
  const deeptech = assess(S({ model: "deeptech", ticked: ALLE }));
  assert.ok(deeptech.score < assess(S({ model: "consulting", ticked: [] })).score + 0.3);
});

test("die erste bezahlte Rechnung ist der stärkste Haken", () => {
  const ohne = assess(S({ model: "saas-smb", ticked: ALLE.filter((id) => id !== "paid") }));
  const mit = assess(S({ model: "saas-smb", ticked: ALLE }));
  assert.ok(mit.score - ohne.score >= 0.14, "bezahlt worden zu sein muss am schwersten wiegen");
  assert.equal(ohne.blocker?.id, "paid", "was fehlt, muss als Erstes genannt werden");
});

test("der Engpass ist immer der teuerste offene Punkt", () => {
  const offen: CondId[] = ["ownRunway", "slowMarket"];
  const r = assess(S({ model: "consulting", ticked: ALLE.filter((id) => !offen.includes(id)) }));
  assert.equal(r.blocker?.id, "ownRunway", "sechs Monate ohne Gehalt wiegen schwerer als ein langsamer Markt");
  assert.deepEqual(r.open.map((c) => c.id), offen);
  for (const c of r.open) assert.ok(c.fix.length > 40, `${c.id} sagt nicht, was man tun kann`);
});

test("jede Bedingung erklärt sich und ist belegt", () => {
  const summe = CONDITIONS.reduce((n, c) => n + c.weight, 0);
  assert.ok(Math.abs(summe - 1) < 1e-9, `die Bedingungen ergeben ${summe}, nicht 1`);
  for (const c of CONDITIONS) {
    assert.ok(c.hint.length > 40, `${c.id}: man weiß nicht, wann man es ankreuzen darf`);
    for (const id of c.sources) assert.ok(SRC[id], `${c.id} zitiert ${id}, das es nicht gibt`);
  }
});

test("die Techniken sagen, wie schnell sie Geld bringen", () => {
  assert.ok(TECHNIQUES.length >= 6);
  const familien = new Set(TECHNIQUES.map((t) => t.family));
  assert.ok(familien.size >= 5, "Winborg und Landström haben mehr als drei Kategorien");
  for (const t of TECHNIQUES) {
    assert.ok(t.what.length > 50, `${t.id} erklärt sich nicht`);
    assert.ok(t.speed.length > 8, `${t.id} sagt nicht, wie schnell`);
    for (const id of t.sources) assert.ok(SRC[id], `${t.id} zitiert ${id}, das es nicht gibt`);
  }
  // Kundengeld steht vor eigenem Geld — so fanden es Ebben und Johnson.
  const ids = TECHNIQUES.map((t) => t.id);
  assert.ok(ids.indexOf("advance") < ids.indexOf("own"));
});

test("jede Quelle wird benutzt und hat eine Fundstelle", () => {
  const benutzt = new Set<string>();
  MODELS.forEach((m) => m.sources.forEach((s) => benutzt.add(s)));
  CONDITIONS.forEach((c) => c.sources.forEach((s) => benutzt.add(s)));
  TECHNIQUES.forEach((t) => t.sources.forEach((s) => benutzt.add(s)));
  for (const [id, [zitat, href]] of Object.entries(SRC)) {
    assert.ok(benutzt.has(id), `${id} steht im Verzeichnis, wird aber nirgends zitiert`);
    assert.match(zitat, /\(\d{4}\)/, `${id}: ohne Jahr`);
    assert.match(href, /^https:\/\//, `${id}: kein Link`);
  }
});

test("der Inhalt ist auf Englisch wie der Rest der Werkzeuge", () => {
  const text = [
    ...MODELS.map((m) => `${m.label} ${m.what} ${m.note} ${m.lever}`),
    ...CONDITIONS.map((c) => `${c.label} ${c.hint} ${c.fix}`),
    ...TECHNIQUES.map((t) => `${t.label} ${t.what}`),
  ].join(" ");
  for (const wort of [" der ", " und ", " nicht ", " ihr ", " euch "]) {
    assert.ok(!text.includes(wort), `deutscher Rest im Inhalt: "${wort}"`);
  }
});
