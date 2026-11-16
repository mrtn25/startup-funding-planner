/* Tests for the exit model.  node --test lib/exits.test.ts */

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  APPROACHES,
  CAVEATS,
  EMPTY,
  FAMILIES,
  ranked,
  ROUTES,
  ROUTE_BY_ID,
  SRC,
  type ExitState,
  type Family,
} from "./exits.ts";

const S = (patch: Partial<ExitState> = {}): ExitState => ({ ...EMPTY, ...patch });
const platz = (s: ExitState, id: string) => ranked(s).findIndex((r) => r.route.id === id);

test("jeder Weg erklärt sich vollständig", () => {
  assert.ok(ROUTES.length >= 8, "zu wenige Wege für eine ehrliche Liste");
  for (const r of ROUTES) {
    for (const feld of ["what", "who", "frequency", "leadTime", "price", "trap"] as const) {
      assert.ok(r[feld].length > 30, `${r.id}: ${feld} ist zu dünn`);
    }
    assert.ok(r.sources.length > 0, `${r.id} ohne Beleg`);
    for (const id of r.sources) assert.ok(SRC[id], `${r.id} zitiert ${id}, das es nicht gibt`);
  }
});

test("jede Familie kommt vor, auch die unbequemen", () => {
  const da = new Set(ROUTES.map((r) => r.family));
  for (const f of FAMILIES) {
    assert.ok(da.has(f.key as Family), `keine einzige Option in "${f.label}"`);
  }
  // Aufhören und Behalten sind die beiden, die in solchen Listen fehlen.
  assert.ok(ROUTE_BY_ID["winddown"], "geordnet beenden fehlt");
  assert.ok(ROUTE_BY_ID["keep"], "behalten fehlt");
});

test("die Rangfolge bleibt im Rahmen und ist vollständig", () => {
  const liste = ranked(S());
  assert.equal(liste.length, ROUTES.length);
  for (const { score, because } of liste) {
    assert.ok(score >= 0 && score <= 100, `Wert außerhalb der Skala: ${score}`);
    assert.ok(because.length > 20, "jeder Platz braucht eine Begründung");
  }
  for (let i = 1; i < liste.length; i++) {
    assert.ok(liste[i - 1].score >= liste[i].score, "nicht absteigend sortiert");
  }
});

test("die Grundeinstellung schlägt nicht den Verkauf des Teams vor", () => {
  // Ein Acquihire ist der Ausgang einer gescheiterten Finanzierung.
  // Als erster Vorschlag an jemanden, dem die Firma gehört, wäre das
  // nicht nur falsch, sondern zynisch.
  const oben = ranked(EMPTY)[0];
  assert.equal(oben.route.id, "keep");
  assert.ok(platz(EMPTY, "acquihire") >= 2, "das Team zu verkaufen ist keine Ausgangslage");
  // Und mit Fonds im Haus und leerer Kasse wird es zur realen Option.
  const knapp = S({ owner: "vc", selfFunding: false, growth: "flat", size: "small" });
  const wert = (st: ExitState) => ranked(st).find((r) => r.route.id === "acquihire")!.score;
  assert.ok(wert(knapp) > wert(EMPTY) + 20, "mit Investoren und ohne Gewinn muss diese Tür deutlich weiter auf sein");
});

test("das Motiv entscheidet über den Weg, nicht die Größe", () => {
  // Das ist der Kern von DeTienne et al.: die Strategie folgt dem Motiv.
  const gleich = { size: "mid", growth: "steady", selfFunding: true } as const;
  const unabhaengig = S({ ...gleich, motive: "autonomy" });
  const geld = S({ ...gleich, motive: "money", relationships: true });

  assert.ok(platz(unabhaengig, "keep") <= 1, "wer Unabhängigkeit will, muss Behalten oben sehen");
  assert.ok(platz(geld, "strategic") <= 1, "wer Geld will und Kontakte hat, sieht den strategischen Verkauf oben");
  assert.ok(
    platz(geld, "keep") > platz(unabhaengig, "keep"),
    "dasselbe Unternehmen, anderes Motiv — die Reihenfolge muss sich ändern",
  );
});

test("Beziehungen schlagen alles andere beim strategischen Verkauf", () => {
  const ohne = S({ motive: "money", relationships: false });
  const mit = S({ motive: "money", relationships: true });
  const a = ranked(ohne).find((r) => r.route.id === "strategic")!;
  const b = ranked(mit).find((r) => r.route.id === "strategic")!;
  assert.ok(b.score - a.score >= 30, "Kontakte müssen den Unterschied machen, den die Studie beschreibt");
  assert.match(a.because, /know|relationship|industry/i);
});

test("ohne eigenen Gewinn fällt der Finanzkäufer weg und das Ende rückt vor", () => {
  const brennt = S({ selfFunding: false, growth: "flat", size: "small" });
  const traegt = S({ selfFunding: true, growth: "flat", size: "small" });
  assert.ok(platz(brennt, "winddown") < platz(traegt, "winddown"), "wer verbrennt, muss das geordnete Ende sehen");
  assert.ok(platz(traegt, "financial") < platz(brennt, "financial"));
  assert.ok(platz(traegt, "keep") < platz(brennt, "keep"));
});

test("der Börsengang bleibt die Ausnahme, auch im besten Fall", () => {
  const best = S({ owner: "vc", size: "large", growth: "steep", motive: "money" });
  const ipo = ranked(best).find((r) => r.route.id === "ipo")!;
  const strat = ranked(best).find((r) => r.route.id === "strategic")!;
  assert.ok(strat.score > ipo.score, "Übernahmen sind häufiger als Börsengänge — das muss die Reihenfolge zeigen");
  assert.match(ROUTE_BY_ID["ipo"].frequency, /nine|rare/i);
});

test("die Warnung steht vorne und ist belegt", () => {
  assert.ok(CAVEATS.length >= 3, "die Warnung braucht mehr als einen Satz");
  for (const c of CAVEATS) {
    assert.ok(c.text.length > 80, `"${c.title}" ist zu knapp, um zu überzeugen`);
    assert.ok(c.sources.length > 0, `"${c.title}" ohne Beleg`);
    for (const id of c.sources) assert.ok(SRC[id], `${c.title} zitiert ${id}, das es nicht gibt`);
  }
  const text = CAVEATS.map((c) => `${c.title} ${c.text}`).join(" ");
  assert.match(text, /motive/i, "der Kernbefund — die Strategie folgt dem Motiv — muss dastehen");
});

test("die Anbahnung sagt, wie lange sie dauert", () => {
  assert.ok(APPROACHES.length >= 5);
  for (const a of APPROACHES) {
    assert.ok(a.what.length > 40, `${a.id} erklärt sich nicht`);
    assert.ok(a.horizon.length > 10, `${a.id} sagt nicht, wie lange es dauert`);
    for (const id of a.sources) assert.ok(SRC[id], `${a.id} zitiert ${id}, das es nicht gibt`);
  }
});

test("jede Quelle wird auch benutzt", () => {
  const benutzt = new Set<string>();
  ROUTES.forEach((r) => r.sources.forEach((s) => benutzt.add(s)));
  APPROACHES.forEach((a) => a.sources.forEach((s) => benutzt.add(s)));
  CAVEATS.forEach((c) => c.sources.forEach((s) => benutzt.add(s)));
  for (const id of Object.keys(SRC)) {
    assert.ok(benutzt.has(id), `${id} steht im Literaturverzeichnis, wird aber nirgends zitiert`);
  }
});

test("jede Quelle hat eine Fundstelle und einen Link", () => {
  for (const [id, [zitat, href]] of Object.entries(SRC)) {
    assert.ok(zitat.length > 60, `${id}: Zitat ohne Angaben`);
    assert.match(zitat, /\(\d{4}\)/, `${id}: ohne Jahr`);
    assert.match(href, /^https:\/\//, `${id}: kein Link`);
  }
});

test("der Inhalt ist auf Englisch wie der Rest der Werkzeuge", () => {
  const text = [
    ...ROUTES.map((r) => `${r.label} ${r.what} ${r.who} ${r.trap}`),
    ...CAVEATS.map((c) => `${c.title} ${c.text}`),
    ...APPROACHES.map((a) => `${a.label} ${a.what}`),
  ].join(" ");
  for (const wort of [" der ", " und ", " nicht ", " ihr ", " euch "]) {
    assert.ok(!text.includes(wort), `deutscher Rest im Inhalt: "${wort}"`);
  }
});
