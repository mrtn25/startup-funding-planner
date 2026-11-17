/* Tests für Palettio.  node --test lib/simulator.test.ts */

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  advance,
  alignmentOf,
  canStart,
  capacity,
  finishTactic,
  startTactic,
  tickBoard,
  drawEvent,
  eventDue,
  applyEffects,
  badges,
  beatsOf,
  blockedReason,
  deckFor,
  ablehnen,
  annehmen,
  drawAngebot,
  drawEntscheidung,
  entscheiden,
  entscheidungDue,
  fluss,
  frei,
  fmtEuroExakt,
  LEBEN_PRO_KOPF,
  forcedEnding,
  geldSkala,
  initialState,
  meterViews,
  erloes,
  erfolge,
  netBurn,
  rivalMove,
  runTactic,
  reifegrad,
  runway,
  runwayFill,
  saldo,
  tick,
  uhrMonate,
  verkaufsEnde,
  UHR_MAX,
  UEBERHOLT,
  monateOhneUmsatz,
  type GameState,
  type Tactic,
} from "./simulator.ts";
import { ANGEBOTE, ENDING_BY_ID, ENDINGS, ENTSCHEIDUNGEN, ERFOLGE, EVENTS, MILESTONES, MILESTONE_BY_ID, ONBOARDING, RIVAL_STEPS, TACTICS, pickEnding } from "./simulator-scenes.ts";

const S = (patch: Partial<GameState> = {}): GameState => ({ ...initialState(1), ...patch });
const T = (patch: Partial<Tactic> = {}): Tactic => ({
  id: "x",
  label: "x",
  group: "Produkt",
  flavour: "x",
  impact: { produkt: 2 },
  months: 1,
  effects: {},
  beats: ["a", "b"],
  ...patch,
});

const GRUPPEN = ["Produkt", "Vertrieb", "Team", "Geld"];

/* ── Parallel laufende Maßnahmen ── */

test("so viele Maßnahmen gleichzeitig, wie ihr Leute seid", () => {
  const s = S();
  assert.equal(capacity(s), 2);
  const a = startTactic(s, T({ id: "a", months: 2 }));
  assert.equal(a.running.length, 1);
  const b = startTactic(a, T({ id: "b", months: 3 }));
  assert.equal(canStart(b, T({ id: "c" })), false, "zu zweit geht keine dritte");
  assert.equal(canStart(b, T({ id: "a" })), false, "dieselbe nicht zweimal");
  // Eine Einstellung macht einen Platz frei.
  const drei = applyEffects(b, { einstellen: [{ name: "Timo", rolle: "operations", kosten: 3_800 }] });
  assert.equal(canStart(drei, T({ id: "c" })), true);
});

test("jeder macht sein Fach, und nur seins", () => {
  // Der Grund, warum zwei Gründer sich streiten: Lena baut, Jonas verkauft.
  const s = S();
  const bauen = T({ id: "bauen", months: 5, braucht: "entwicklung" });
  const verkaufen = T({ id: "verkaufen", months: 2, braucht: "vertrieb" });
  const gestartet = startTactic(s, bauen);
  assert.equal(gestartet.running[0].wer, "lena");
  assert.ok(canStart(gestartet, verkaufen), "Jonas kann verkaufen, während Lena baut");
  assert.equal(canStart(gestartet, T({ id: "mehr", braucht: "entwicklung" })), false, "Lena kann nicht zwei Sachen bauen");
  assert.match(blockedReason(gestartet, T({ id: "mehr", braucht: "entwicklung" })) ?? "", /Lena/);
  // Und niemand kann, was niemand kann.
  assert.equal(canStart(s, T({ id: "werben", braucht: "marketing" })), false);
  assert.match(blockedReason(s, T({ id: "werben", braucht: "marketing" })) ?? "", /Niemand/);
});

test("wer geht, nimmt seine laufende Maßnahme mit", () => {
  let s = applyEffects(S(), { einstellen: [{ name: "Sofia", rolle: "entwicklung", kosten: 6_400 }] });
  s = startTactic(s, T({ id: "bauen", months: 4, braucht: "entwicklung" }));
  s = startTactic(s, T({ id: "mehr", months: 4, braucht: "entwicklung" }));
  assert.equal(s.running.length, 2, "Lena und Sofia bauen parallel");
  const danach = applyEffects(s, { verlassen: "entwicklung" });
  assert.equal(danach.leute.length, 2);
  assert.equal(danach.running.length, 1, "die Maßnahme der Abgewanderten läuft nicht weiter");
  assert.ok(danach.leute.every((p) => p.gruender), "Gründer kündigen nicht per Ereignis");
});

test("die Zeit läuft für alle laufenden Maßnahmen gleichzeitig", () => {
  let s = startTactic(S(), T({ id: "a", months: 1 }));
  s = startTactic(s, T({ id: "b", months: 3 }));
  const erster = tickBoard(s);
  assert.deepEqual(erster.done, ["a"], "nach einem Monat ist nur die kurze fertig");
  assert.equal(erster.state.running.find((r) => r.id === "b")?.left, 2);
});

test("die Wirkung kommt beim Abschluss, die Kosten beim Start", () => {
  const karte = T({ id: "a", months: 2, cost: 5_000, effects: { product: 20 } });
  const gestartet = startTactic(S({ cash: 20_000, product: 10 }), karte);
  assert.equal(gestartet.cash, 15_000, "Geld ist sofort weg");
  assert.equal(gestartet.product, 10, "Wirkung noch nicht");
  const fertig = finishTactic(gestartet, karte);
  assert.equal(fertig.product, 30);
  assert.equal(fertig.running.length, 0);
});

/* ── Die Uhr ── */

test("der Runway ist Kasse durch das, was netto rausgeht", () => {
  // 2.200 € Lebenshaltung für zwei Gründer, 300 € Server, 3 Kunden
  // à 120 € Betreuung, minus 1.000 € Umsatz.
  const s = S({ cash: 14_880, burn: 300, customers: 3, mrr: 1_000 });
  assert.equal(netBurn(s), 1_860);
  assert.equal(runway(s), 8);
});

test("das Ersparte geht für Leben, Gehälter, Kunden und den Rest drauf", () => {
  // Vier Posten statt einer Zahl: sonst steht da nur, dass Geld weg ist.
  const zwei = S({ burn: 300, customers: 2 });
  const f = fluss(zwei);
  assert.equal(f.leben, 2 * LEBEN_PRO_KOPF, "beide Gründer müssen wohnen und essen");
  assert.equal(f.gehaelter, 0, "Gründer zahlen sich nichts");
  assert.equal(f.betreuung, 240);
  assert.equal(f.sonstiges, 300);
  assert.equal(f.raus, 2_740);
  // Die erste Einstellung ist der Sprung, den man sehen muss.
  const drei = applyEffects(zwei, { einstellen: [{ name: "Sofia", rolle: "entwicklung", kosten: 6_400 }] });
  assert.equal(fluss(drei).gehaelter, 6_400);
  assert.equal(fluss(drei).leben, 2 * LEBEN_PRO_KOPF, "Angestellte leben nicht vom Ersparten");
  assert.equal(fluss(drei).raus, 9_140);
});

test("der Saldo sagt, in welche Richtung die Uhr läuft", () => {
  // Ohne Kunden läuft der Monat gegen euch, mit genug Kunden für euch.
  assert.ok(saldo(S({ mrr: 0, customers: 0 })) < 0);
  assert.equal(saldo(S({ mrr: 0, customers: 0 })), -2_400, "2.200 € Leben plus 200 € Server");
  assert.ok(saldo(S({ mrr: 3_600, customers: 4 })) > 0);
  // Und er ist immer das Gegenstück zum Netto-Abfluss.
  const s = S({ burn: 300, mrr: 1_000, customers: 3 });
  assert.equal(saldo(s), -netBurn(s));
});

test("jeder zahlende Kunde bringt mehr, als seine Betreuung kostet", () => {
  // Sonst wäre der erste Kunde eine schlechte Nachricht — und genau
  // das war der Fehler: der Runway fiel weiter, obwohl Geld reinkam.
  const ohne = S({ mrr: 0, customers: 0 });
  const mit = S({ mrr: 890, customers: 1 });
  assert.ok(saldo(mit) > saldo(ohne));
  assert.ok(runway({ ...mit, cash: 20_000 }) > runway({ ...ohne, cash: 20_000 }));
});

test("Erfolge feiern den Übergang und danach nie wieder", () => {
  const arm = S({ mrr: 0, customers: 0 });
  const erster = S({ mrr: 890, customers: 1 });
  const treffer = erfolge(arm, erster, ERFOLGE);
  assert.equal(treffer.length, 1);
  assert.equal(treffer[0].id, "erste-rechnung");
  // Schon gefeiert: kommt nicht noch einmal.
  assert.equal(erfolge(arm, { ...erster, gefeiert: ["erste-rechnung"] }, ERFOLGE).length, 0);
  // Und kein Zustand, sondern ein Übergang: zweimal Umsatz ist kein Moment.
  assert.equal(erfolge(erster, S({ mrr: 1_780, customers: 2 }), ERFOLGE).length, 0);
});

test("der Monat, der sich selbst trägt, ist ein eigener Moment", () => {
  const rot = S({ mrr: 1_800, customers: 2 });
  const schwarz = S({ mrr: 3_600, customers: 4, gefeiert: ["erste-rechnung"] });
  assert.ok(saldo(rot) < 0 && saldo(schwarz) >= 0);
  const treffer = erfolge(rot, schwarz, ERFOLGE);
  assert.equal(treffer.length, 1);
  assert.equal(treffer[0].id, "traegt-sich");
});

test("jede Maßnahme sagt vorher, wie lange sie dauert", () => {
  for (const t of Object.values(TACTICS)) {
    assert.ok(t.months >= 1, `${t.id} dauert keine Zeit`);
    assert.ok(t.cost === undefined || t.cost > 0, `${t.id} hat Kosten von null`);
  }
});

test("wer mehr einnimmt als ausgibt, hat keinen Countdown mehr", () => {
  const s = S({ cash: 5_000, burn: 300, customers: 4, mrr: 4_000 });
  assert.equal(runway(s), Infinity);
  const v = meterViews(s);
  assert.equal(v.length, 6);
  // Keine nackten Prozente mehr, wo niemand weiß, was hundert wäre.
  assert.ok(!v.some((x) => ["Produkt", "Stimmung", "Investoren"].includes(x.label) && x.value.includes("%")));
});

test("ein Monat kostet genau den Netto-Burn", () => {
  const s = S({ cash: 20_000, burn: 1_900, customers: 0, mrr: 0 });
  assert.equal(tick(s).cash, 15_900);
  assert.equal(tick(s).month, 1);
});

test("Retoura wird schneller, je weiter sie sind", () => {
  const frueh = tick(S({ rival: 10 }));
  const spaet = tick(S({ rival: 80 }));
  assert.ok(spaet.rival - 80 > frueh.rival - 10, "der Vorsprung muss sich selbst verstärken");
  assert.ok(advance(S({ rival: 95 }), 10).rival <= 100);
});

test("Investoreninteresse verfällt erst, wenn es welches gibt", () => {
  const leise = advance(S({ investors: 12 }), 12);
  assert.equal(leise.investors, 12);
  const laut = advance(S({ investors: 60 }), 12);
  assert.ok(laut.investors < 60);
});

test("die Uhr läuft vom ersten Monat an", () => {
  // Gekündigt wurde vor dem Spiel. Es gibt kein Gehalt, das sie anhält.
  const start = S();
  assert.ok(isFinite(runway(start)), "ohne Gehalt muss der Runway endlich sein");
  assert.ok(runway(start) >= 8 && runway(start) <= 16, `Start-Runway: ${runway(start)}`);
  assert.ok(runwayFill(start) > 0.4 && runwayFill(start) <= 1);

  // Umsatz füllt den Tank wieder auf.
  const mitUmsatz = S({ mrr: 4_000, customers: 3 });
  assert.ok(runway(mitUmsatz) > runway(start));
  assert.equal(runwayFill(S({ mrr: 9_000, customers: 2 })), 1);
});

/* ── Maßnahmen ── */

test("eine Maßnahme kostet sofort Geld, dann Zeit, dann wirkt sie", () => {
  const s = runTactic(
    S({ cash: 20_000, burn: 1_900, customers: 0, mrr: 0 }),
    T({ cost: 6_500, months: 2, effects: { customers: 2, mrr: 1_780 } }),
  );
  // 20.000 − 6.500 Kosten − 2 × 4.100 (Leben plus Fixkosten), dann
  // erst kommen Kunden und Umsatz.
  assert.equal(s.cash, 20_000 - 6_500 - 8_200);
  assert.equal(s.customers, 2);
  assert.equal(s.mrr, 1_780);
  assert.equal(s.month, 2);
});

test("eine benutzte Karte liegt nicht mehr im Deck", () => {
  const m = MILESTONE_BY_ID["mvp"];
  const voll = deckFor(S(), m, TACTICS);
  const nachher = deckFor(S({ used: [voll[0].id] }), m, TACTICS);
  assert.equal(nachher.length, voll.length - 1);
});

test("Karten mit Bedingung tauchen erst auf, wenn sie dürfen", () => {
  const m = MILESTONE_BY_ID["kunden"];
  const ohneProdukt = deckFor(S({ product: 10, mrr: 0, rival: 10 }), m, TACTICS).map((t) => t.id);
  assert.ok(!ohneProdukt.includes("warme-kontakte"), "warme Kontakte brauchen ein Produkt");
  const mitProdukt = deckFor(S({ product: 45, mrr: 890, rival: 10 }), m, TACTICS).map((t) => t.id);
  assert.ok(mitProdukt.includes("warme-kontakte"));
});

test("hat Retoura den Messestand, ist die Messe weg", () => {
  const m = MILESTONE_BY_ID["kunden"];
  assert.ok(deckFor(S({ rival: 30 }), m, TACTICS).some((t) => t.id === "messe"));
  assert.ok(!deckFor(S({ rival: 50 }), m, TACTICS).some((t) => t.id === "messe"));
});

test("Anteile gehen nur runter", () => {
  assert.equal(applyEffects(S({ equity: 100 }), { equity: -40 }).equity, 60);
  assert.equal(applyEffects(S({ equity: 60 }), { equity: 25 }).equity, 60);
});

/* ── Jonas hat eine Haltung ── */

test("dieselbe Karte zahlt unterschiedlich ein, je nachdem was Jonas will", () => {
  const angel = TACTICS["angel-40"];
  assert.ok(alignmentOf(angel, "bootstrap") < 0, "ein Bootstrapper verzeiht 40 % nicht");
  assert.ok(alignmentOf(angel, "venture") > 0);
  const selbst = TACTICS["aus-umsatz"];
  assert.ok(alignmentOf(selbst, "bootstrap") > alignmentOf(selbst, "venture"));
});

test("ihn zu fragen erzählt je nach Haltung etwas anderes", () => {
  const frage = TACTICS["jonas-fragen"];
  const [a] = beatsOf(frage, "bootstrap");
  const [b] = beatsOf(frage, "venture");
  assert.notEqual(a, b);
  assert.ok(a.length > 40 && b.length > 40);
  // Und es bringt in beiden Fällen Einigkeit.
  assert.ok((frage.effects.alignment ?? 0) > 0);
});

test("gegen die Haltung des Co-Founders zu spielen beendet die Partie", () => {
  let s = S({ stance: "bootstrap", alignment: 12, customers: 0 });
  s = runTactic(s, TACTICS["angel-40"]);
  assert.ok(s.alignment <= 0);
  assert.equal(forcedEnding(s), "split");
  // Mit Kunden im Rücken ist es ein schlechtes Quartal, kein Ende.
  assert.equal(forcedEnding({ ...s, customers: 4 }), null);
});

test("der Tank zeigt ein Jahr als voll und leer als leer", () => {
  assert.equal(runwayFill(S({ cash: 0, mrr: 0, customers: 0 })), 0);
  assert.equal(runwayFill(S({ cash: 100_000, mrr: 0, customers: 0 })), 1);
  const halb = runwayFill(S({ cash: 16_800, burn: 600, mrr: 0, customers: 0 }));
  assert.ok(halb > 0.4 && halb < 0.6, `halb voll wäre 0,5, ist ${halb}`);
});

/* ── Retoura ── */

test("Retoura meldet sich, wenn sie an dir vorbeiziehen", () => {
  assert.equal(rivalMove(S({ rival: 10 }), RIVAL_STEPS), null);
  const ersterZug = rivalMove(S({ rival: 20 }), RIVAL_STEPS);
  assert.equal(ersterZug?.at, RIVAL_STEPS[0].at);
  assert.equal(rivalMove(S({ rival: 20, rivalSeen: [RIVAL_STEPS[0].at] }), RIVAL_STEPS), null);
});

test("Haulway erreicht in einer normalen Partie jede seiner Stufen", () => {
  // Vorher standen die Stufen bei 25/45/65/85, erreicht wurden in
  // zwanzig Monaten aber nur 45 — die Drohung aus dem Onboarding blieb
  // folgenlos, und „Haulway war schneller“ konnte nie eintreten.
  let s = S();
  for (let i = 0; i < 20; i++) s = tick(s);
  const erreicht = RIVAL_STEPS.filter((st) => s.rival >= st.at);
  assert.equal(erreicht.length, RIVAL_STEPS.length, `nach 20 Monaten erst ${erreicht.length} von ${RIVAL_STEPS.length} Stufen`);
  // Überholt wird, wer nach knapp zwei Jahren noch kaum Kunden hat.
  for (let i = 0; i < 4; i++) s = tick(s);
  assert.ok(s.rival >= UEBERHOLT, `nach 24 Monaten erst ${Math.round(s.rival)} %`);
});

test("jeder Zug von Retoura kostet dich etwas", () => {
  for (const st of RIVAL_STEPS) {
    assert.ok(Object.keys(st.effects).length > 0, `${st.label} bleibt folgenlos`);
    assert.equal(st.beats.length, 2);
  }
});

test("wer bei 100 % Retoura keine Kunden hat, ist überholt worden", () => {
  assert.equal(forcedEnding(S({ rival: 100, customers: 2 })), "outrun");
  assert.equal(forcedEnding(S({ rival: 100, customers: 12 })), null);
});

test("die Anzeigen sagen etwas, das man benennen kann", () => {
  const anfang = meterViews(S());
  const investoren = anfang.find((v) => v.label === "Investoren")!;
  assert.equal(investoren.value, "niemand", "ohne Investoren steht da nicht 12 %");
  assert.equal(investoren.punkte, 0);

  const kunden = anfang.find((v) => v.label === "Kunden")!;
  assert.equal(kunden.value, "0");
  assert.equal(kunden.note, "Speditionen");

  const team = anfang.find((v) => v.label === "Stimmung")!;
  assert.ok(team.punkte !== undefined && team.punkte >= 1);

  const spaet = meterViews(S({ investors: 95, product: 92, customers: 1 }));
  assert.equal(spaet.find((v) => v.label === "Investoren")!.value, "Term Sheets");
  assert.equal(spaet.find((v) => v.label === "Produkt")!.value, "rund");
  assert.equal(spaet.find((v) => v.label === "Kunden")!.note, "Spedition");
});

/* ── Der Inhalt ── */

test("jede Karte nennt Dauer und Wirkung, aber verrät nichts im Text", () => {
  for (const t of Object.values(TACTICS)) {
    assert.ok(t.months >= 1 && t.months <= 6, `${t.id}: ${t.months} Monate`);
    assert.ok(t.flavour.length > 25, `${t.id} ohne Beschreibung`);
    assert.ok(GRUPPEN.includes(t.group), `${t.id} hat die Gruppe "${t.group}"`);
    assert.ok(Object.keys(t.impact).length > 0, `${t.id} ohne sichtbare Wirkung`);
    for (const n of Object.values(t.impact)) {
      assert.ok(Math.abs(n) >= 1 && Math.abs(n) <= 5, `${t.id}: Wirkung ${n}`);
    }
    assert.ok(t.beats.length === 2 || t.beatsBy, `${t.id} ohne zwei Beats`);
    const wirkt = Object.keys(t.effects).length > 0 || t.beatsBy;
    assert.ok(wirkt, `${t.id} ist folgenlos`);
    /* Die Beschreibung darf die Wirkung nicht vorwegnehmen. Zahlen aus
       der Welt sind erlaubt — "31 % der Rückfahrten" ist das Problem,
       nicht das Ergebnis; "+2 Kunden" wäre das Ergebnis. */
    assert.ok(
      !/[+−-]\s?\d/.test(t.flavour) && !/\d+\s*(customers|Kunden|MRR|investors)/i.test(t.flavour),
      `${t.id} verrät die Wirkung: ${t.flavour}`,
    );
  }
});

test("jeder Meilenstein hat ein Deck, ein Tor und einen Nachfolger", () => {
  assert.equal(MILESTONES.length, 6);
  for (const m of MILESTONES) {
    assert.ok(m.tactics.length >= 4, `${m.id} hat nur ${m.tactics.length} Karten`);
    for (const id of m.tactics) assert.ok(TACTICS[id], `${m.id} verweist auf ${id}`);
    assert.ok(m.gateLabel.length > 15, `${m.id} sagt nicht, was zu tun ist`);
    if (m.next) assert.ok(MILESTONE_BY_ID[m.next], `${m.id} → ${m.next} gibt es nicht`);
  }
  assert.equal(MILESTONES[MILESTONES.length - 1].next, null);
});

test("keine Phase ist eine Sackgasse", () => {
  /* Jede Phase wird mit dem Zustand betreten, mit dem man realistisch
     ankommt — nicht bei null. Geprüft wird, dass das eigene Deck dann
     reicht, um das Tor zu öffnen. */
  let s = S();
  for (const m of MILESTONES) {
    s = { ...s, milestoneId: m.id };
    let karten = 0;
    while (!m.gate(s) && karten < 12) {
      const deck = deckFor(s, m, TACTICS);
      assert.ok(deck.length, `${m.id}: Deck leer, Tor zu`);
      s = runTactic(s, deck[0]);
      karten++;
    }
    assert.ok(m.gate(s), `${m.id}: selbst mit dem ganzen Deck bleibt das Tor zu`);
    assert.ok(karten <= 6, `${m.id} braucht ${karten} Karten — das ist keine Phase mehr, das ist eine Schicht`);
  }
});

test("Badges zeigen erst auf der Ergebniskarte, was passiert ist", () => {
  const labels = badges({ cash: -6_500, customers: 2, mrr: 1_780, investors: 8, team: -4 }).map((b) => b.label);
  assert.deepEqual(labels, ["−6.5k €", "+1.8k € Umsatz/Monat", "+2 Kunden", "+8 Investoren", "−4 Stimmung"]);
  assert.equal(badges({ burn: 900 })[0].up, false, "mehr Burn ist keine gute Nachricht");
  assert.equal(badges(undefined).length, 0);
  // Eine Einstellung steht mit Namen und Preis da, nicht als Kopfzahl.
  assert.deepEqual(
    badges({ einstellen: [{ name: "Marie", rolle: "vertrieb", kosten: 6_200 }] }).map((b) => b.label),
    ["+ Marie · 6.2k €/Monat"],
  );
  assert.equal(badges({ verlassen: "entwicklung" })[0].up, false);
});

/* ── Enden ── */

test("jedes vergebene Ende existiert", () => {
  const faelle = [
    S({ cash: 0 }),
    S({ alignment: 0, customers: 0 }),
    S({ rival: 60, customers: 1 }),
    S({ mrr: 30_000, investors: 70, customers: 20 }),
    S({ mrr: 20_000, customers: 15, cash: 30_000 }),
    S({ mrr: 9_000, equity: 40, customers: 10 }),
    S({ cash: 20_000, mrr: 400 }),
  ];
  const ids = new Set(faelle.map(pickEnding));
  for (const id of ids) assert.ok(ENDING_BY_ID[id], `unbekannt: ${id}`);
  assert.ok(ids.size >= 5, "die meisten Enden müssen erreichbar sein");
  assert.equal(ENDINGS.length, 11);
});

test("leere Kasse schlägt jedes andere Ende", () => {
  assert.equal(pickEnding(S({ cash: 0, mrr: 9_000, customers: 20 })), "insolvent");
});

/* ── Onboarding und Ereigniskarten ── */

test("das Onboarding erklärt in wenigen Sätzen, worum es geht", () => {
  assert.ok(ONBOARDING.length >= 5 && ONBOARDING.length <= 8);
  for (const z of ONBOARDING) assert.ok(z.text.length > 30 && z.text.length < 220, `zu lang oder zu kurz: ${z.text}`);
  const alles = ONBOARDING.map((z) => z.text).join(" ");
  // Das Onboarding muss die Begriffe erklären, die man sonst nicht kennt.
  for (const begriff of ["Disponent", "Haulway", "Monate"]) {
    assert.ok(alles.includes(begriff), `${begriff} wird nie erklärt`);
  }
  assert.ok(alles.includes("kein") || alles.includes("nichts"), "es muss klar sein, dass noch nichts da ist");
});

test("Ereigniskarten kommen mit Abstand und jede nur einmal", () => {
  assert.equal(eventDue(S({ month: 2, lastEvent: 0 })), false);
  assert.equal(eventDue(S({ month: 3, lastEvent: 0 })), true);
  assert.equal(eventDue(S({ month: 5, lastEvent: 3 })), false);
  assert.equal(eventDue(S({ month: 6, lastEvent: 3 })), true);

  const erste = drawEvent(S({ month: 6, customers: 5, mrr: 4_000 }), EVENTS);
  assert.ok(erste);
  const zweite = drawEvent(S({ month: 9, customers: 5, mrr: 4_000, drawn: [erste!.id] }), EVENTS);
  assert.ok(zweite && zweite.id !== erste!.id);
});

test("jede Ereigniskarte trifft etwas und erzählt es in zwei Sätzen", () => {
  assert.ok(EVENTS.length >= 10, "zu wenige Ereignisse für sechs Phasen");
  for (const e of EVENTS) {
    assert.equal(e.beats.length, 2, `${e.id} ohne zwei Beats`);
    assert.ok(Object.keys(e.effects).length > 0, `${e.id} bleibt folgenlos`);
    assert.ok(e.title.length > 8, `${e.id} ohne Titel`);
  }
});

test("der Inhalt ist auf Deutsch", () => {
  const text = [
    ...MILESTONES.map((m) => `${m.title} ${m.blurb} ${m.gateLabel}`),
    ...Object.values(TACTICS).map((t) => `${t.label} ${t.flavour} ${t.beats.join(" ")}`),
    ...EVENTS.map((e) => `${e.title} ${e.beats.join(" ")}`),
    ...ENDINGS.map((e) => `${e.title} ${e.text}`),
    ...ENTSCHEIDUNGEN.map((e) => `${e.title} ${e.beats.join(" ")} ${e.wege.map((w) => `${w.label} ${w.hint} ${w.beats.join(" ")}`).join(" ")}`),
  ].join(" ");
  // Ein paar englische Füllwörter, die beim Übersetzen gern stehen bleiben.
  for (const wort of [" the ", " you ", " with ", " and the ", " months of "]) {
    assert.ok(!text.includes(wort), `englischer Rest im Inhalt: "${wort}"`);
  }
});

/* ── Entscheidungen ── */

test("Entscheidungen kommen mit Abstand und jede Frage nur einmal", () => {
  assert.equal(entscheidungDue(S({ month: 1 })), false);
  assert.equal(entscheidungDue(S({ month: 2, lastChoice: 0 })), true);
  assert.equal(entscheidungDue(S({ month: 4, lastChoice: 3 })), false);
  assert.equal(entscheidungDue(S({ month: 6, lastChoice: 3 })), true);

  const lage = S({ month: 6, lastChoice: 3, product: 40, customers: 2, mrr: 890 });
  const erste = drawEntscheidung(lage, ENTSCHEIDUNGEN);
  assert.ok(erste, "in dieser Lage muss eine Frage offen sein");
  const danach = entscheiden(lage, erste!, erste!.wege[0]);
  assert.ok(danach.entschieden.includes(erste!.id));
  assert.equal(danach.lastChoice, lage.month);
  assert.notEqual(drawEntscheidung(danach, ENTSCHEIDUNGEN)?.id, erste!.id, "dieselbe Frage wird zweimal gestellt");
});

test("die Frage vor dem ersten Kunden wartet nicht auf den Takt", () => {
  // Wie ihr an Speditionen herangeht, gehört vor den ersten Kunden —
  // nicht drei Monate danach, wenn die Frage beantwortet ist.
  const gerade = S({ month: 5, lastChoice: 4, milestoneId: "kunden", product: 45, customers: 0 });
  assert.equal(entscheidungDue(gerade), false, "der normale Abstand ist noch nicht um");
  const e = drawEntscheidung(gerade, ENTSCHEIDUNGEN);
  assert.equal(e?.id, "outreach");
  // Und sie ist weg, sobald der erste Kunde da ist.
  assert.notEqual(drawEntscheidung({ ...gerade, customers: 1 }, ENTSCHEIDUNGEN)?.id, "outreach");
});

test("die Reihenfolge der Entscheidungen ergibt einen Sinn", () => {
  const ids = ENTSCHEIDUNGEN.map((e) => e.id);
  for (const id of ["anteile", "rollen", "rechtsform", "weg", "vsop", "holding"]) {
    assert.ok(ids.includes(id), `${id} fehlt`);
  }
  // Anteile vor Rechtsform, Rechtsform vor Holding: andersherum ergibt keine der Fragen einen Sinn.
  assert.ok(ids.indexOf("anteile") < ids.indexOf("rechtsform"));
  assert.ok(ids.indexOf("rechtsform") < ids.indexOf("holding"));
  // Und die Holding fragt niemand, solange es keine Gesellschaft gibt.
  const ohne = S({ cash: 200_000 });
  const holding = ENTSCHEIDUNGEN.find((e) => e.id === "holding")!;
  assert.equal(holding.when!(ohne), false);
  assert.equal(holding.when!({ ...ohne, entschieden: ["rechtsform"] }), true);
});

test("jede Entscheidung ist ein Abwägen und kein Geschenk", () => {
  assert.ok(ENTSCHEIDUNGEN.length >= 6, "zu wenige Entscheidungen für sechs Phasen");
  for (const e of ENTSCHEIDUNGEN) {
    assert.equal(e.beats.length, 2, `${e.id} ohne zwei Beats`);
    assert.ok(e.wege.length >= 2, `${e.id} ist keine Wahl`);
    const abdruecke = new Set<string>();
    for (const w of e.wege) {
      assert.equal(w.beats.length, 2, `${e.id}/${w.id} ohne zwei Beats`);
      assert.ok(w.hint.length > 12, `${e.id}/${w.id} erklärt sich nicht`);
      assert.ok(Object.keys(w.effects).length > 0 || w.alignmentBy, `${e.id}/${w.id} bleibt folgenlos`);
      abdruecke.add(JSON.stringify(w.effects) + JSON.stringify(w.alignmentBy ?? null));
    }
    assert.equal(abdruecke.size, e.wege.length, `${e.id}: zwei Wege wirken gleich`);
    // Mindestens ein Weg muss wehtun, sonst ist es keine Entscheidung.
    const weh = e.wege.some(
      (w) =>
        Object.values(w.effects).some((v) => typeof v === "number" && v < 0) ||
        Object.values(w.alignmentBy ?? {}).some((v) => v < 0),
    );
    assert.ok(weh, `${e.id}: jeder Weg ist gut, also ist keiner eine Entscheidung`);
  }
});

test("aus jeder Entscheidung führt ein Weg, der kein Geld kostet", () => {
  // Entscheidungen lassen sich nicht verschieben. Eine Frage, die in
  // jeder Antwort Geld verlangt, kann einen also zwingend ruinieren.
  for (const e of ENTSCHEIDUNGEN) {
    assert.ok(
      e.wege.some((w) => (w.effects.cash ?? 0) >= 0),
      `${e.id}: jeder Weg kostet Geld, das ist eine Falle und keine Wahl`,
    );
  }
});

test("bei der Frage nach fremdem Geld zählt, was Jonas will", () => {
  const weg = ENTSCHEIDUNGEN.find((e) => e.id === "weg")!;
  const ja = weg.wege.find((w) => w.id === "ja")!;
  const spar = entscheiden(S({ stance: "bootstrap", alignment: 60 }), weg, ja);
  const wachs = entscheiden(S({ stance: "venture", alignment: 60 }), weg, ja);
  assert.ok(spar.alignment < 60, "wer bootstrappen will, nimmt das Geld nicht gern");
  assert.ok(wachs.alignment > 60, "wer eine Runde will, findet es gut");
  // Und die Wirkung selbst wird genau einmal angewandt.
  assert.equal(wachs.investors, Math.min(100, 0 + 12));
});

test("der Reifegrad sagt, was noch fehlt", () => {
  const punkte = reifegrad(S());
  assert.equal(punkte.length, 5);
  // Am Anfang stimmt nur, dass noch Geld da ist und ihr euch einig seid.
  assert.deepEqual(
    punkte.filter((p) => p.ok).map((p) => p.label),
    ["Noch sechs Monate Geld", "Ihr zwei seid euch einig"],
  );
  const reif = reifegrad(S({ product: 60, customers: 3, mrr: 2_700, cash: 60_000, alignment: 70 }));
  assert.ok(reif.every((p) => p.ok), `noch offen: ${reif.filter((p) => !p.ok).map((p) => p.label)}`);
});

/* ── Geld sichtbar machen ── */

test("der Fluss erklärt die Zahl, die unter der Uhr steht", () => {
  const s = S({ burn: 200, mrr: 890, customers: 2 });
  const f = fluss(s);
  assert.equal(f.betreuung, 240, "jeder Kunde kostet Betreuung");
  assert.equal(f.raus, 2_640);
  assert.equal(f.rein, 890);
  assert.equal(f.raus - f.rein, netBurn(s), "die Aufschlüsselung muss dieselbe Zahl ergeben");
  assert.equal(saldo(s), -netBurn(s));
});

test("der Geldbalken hat einen festen Maßstab, der nur nach oben springt", () => {
  assert.equal(geldSkala(32_000), 50_000);
  assert.equal(geldSkala(50_000), 50_000);
  assert.equal(geldSkala(50_001), 150_000);
  assert.equal(geldSkala(2_500_000), 5_000_000);
  // Monoton: mehr Geld heißt nie ein kleinerer Maßstab.
  let vor = 0;
  for (const c of [0, 10_000, 60_000, 400_000, 900_000, 4_000_000, 20_000_000]) {
    const sk = geldSkala(c);
    assert.ok(sk >= vor && sk >= c, `Maßstab springt zurück bei ${c}`);
    vor = sk;
  }
});

test("die laufende Zahl zeigt jeden Euro und hängt nicht an der Spracheinstellung", () => {
  assert.equal(fmtEuroExakt(32_000), "32.000 €");
  assert.equal(fmtEuroExakt(1_234_567), "1.234.567 €");
  assert.equal(fmtEuroExakt(890), "890 €");
  assert.equal(fmtEuroExakt(-1_500), "−1.500 €");
  assert.equal(fmtEuroExakt(32_000.4), "32.000 €");
});

test("eine Maßnahme heißt, wie sie heißt, und nicht wie ein Datenblatt", () => {
  const text = Object.values(TACTICS)
    .map((t) => `${t.label} ${t.flavour}`)
    .join(" ");
  // Begriffe, die niemand erklärt bekommt und die deshalb nichts sagen.
  for (const wort of ["Makro", "Engine", "Dashboard", "Wrapper", "Pipeline", "Funnel"]) {
    assert.ok(!text.includes(wort), `unerklärtes Fachwort auf einer Karte: ${wort}`);
  }
  for (const t of Object.values(TACTICS)) {
    assert.ok(t.flavour.length > 25, `${t.id} erklärt sich nicht`);
  }
});

test("die Uhr zeigt nie Unendlich, weil Gehälter nicht unendlich warten", () => {
  const knapp = S({ cash: 10_000, burn: 300, mrr: 0, customers: 0 });
  assert.deepEqual(uhrMonate(knapp), { monate: 4, gedeckelt: false });

  // Wer sich trägt, bekommt einen Deckel statt eines Unendlichzeichens.
  const traegt = S({ cash: 60_000, burn: 300, mrr: 6_000, customers: 4 });
  assert.equal(runway(traegt), Infinity);
  const uhr = uhrMonate(traegt);
  assert.equal(uhr.gedeckelt, true);
  assert.equal(uhr.monate, UHR_MAX);

  // Und daneben die ehrlichere Zahl: der Umsatz kann morgen weg sein.
  assert.ok(monateOhneUmsatz(traegt) < UHR_MAX, "ohne Umsatz ist das Geld endlich");
  assert.equal(monateOhneUmsatz(traegt), Math.floor(60_000 / (2_200 + 300 + 480)));
});

test("in jeder Phase hat jeder der beiden etwas zu tun — auch noch im fünften Monat", () => {
  // Einmal prüfen reicht nicht: die Karten sind verbraucht, sobald sie
  // gespielt wurden. Im Geld-Kapitel gehörte alles dem Vertrieb, und
  // die Entwicklerin saß vier Monate lang da und sah zu.
  for (const m of MILESTONES) {
    const deck = m.tactics.map((id) => TACTICS[id]);
    for (const rolle of ["entwicklung", "vertrieb"] as const) {
      assert.ok(
        deck.some((t) => (!t.braucht || t.braucht === rolle) && t.repeatable && !t.when),
        `${m.id}: für ${rolle} gibt es keine Karte, die immer geht`,
      );
    }
  }
});

test("niemand sitzt da und wartet", () => {
  // Durchgespielt mit der stursten Strategie: immer die oberste Karte.
  // Wenn dabei ein Monat kommt, in dem jemand frei ist und nichts
  // wählbar, ist das Kapitel zu dünn besetzt.
  let s = S();
  let leer = 0;
  for (let runde = 0; runde < 120 && !s.endingId; runde++) {
    const m = MILESTONE_BY_ID[s.milestoneId];
    if (!m) break;
    if (m.gate(s)) {
      if (!m.next) break;
      s = { ...s, milestoneId: m.next };
      continue;
    }
    if (forcedEnding(s)) break;
    const offen = deckFor(s, m, TACTICS).filter((t) => canStart(s, t));
    if (offen.length) {
      s = startTactic(s, offen[0]);
      continue;
    }
    if (frei(s).length && s.running.length) leer++;
    if (!s.running.length) break;
    const { state, done } = tickBoard(s);
    s = state;
    for (const id of done) if (TACTICS[id]) s = finishTactic(s, TACTICS[id]);
  }
  assert.ok(leer <= 2, `${leer} Monate, in denen jemand frei war und nichts wählbar`);
});

test("keine Maßnahme verlangt ein Fach, das niemand hat", () => {
  for (const t of Object.values(TACTICS)) {
    if (!t.braucht) continue;
    if (["entwicklung", "vertrieb"].includes(t.braucht)) continue;
    /* Marketing und Operations gibt es erst, wenn jemand eingestellt
       wurde — solche Karten müssen sich selbst sperren, sonst stehen
       sie unerreichbar in der Liste. */
    assert.ok(t.when, `${t.id} braucht ${t.braucht}, ist aber immer sichtbar`);
    assert.equal(t.when!(S()), false, `${t.id} ist schon wählbar, bevor es jemanden mit diesem Fach gibt`);
    const mit = applyEffects(S(), { einstellen: [{ name: "X", rolle: t.braucht, kosten: 3_000 }] });
    assert.equal(t.when!(mit), true, `${t.id} bleibt gesperrt, obwohl jemand da ist`);
  }
});

test("was wehtut, sagt auch warum", () => {
  // „Team −6“ ohne Satz dazu ist eine Zahl, die vom Himmel fällt.
  for (const t of Object.values(TACTICS)) {
    const schmerz = (["team", "product", "investors"] as const).filter((k) => (t.effects[k] ?? 0) < 0);
    if (!schmerz.length) continue;
    assert.ok(t.preis, `${t.id} zieht ${schmerz.join(", ")} ab und erklärt es nicht`);
  }
});

test("Fachwörter auf einer Karte werden auf der Karte erklärt", () => {
  const erklaert = new Set<string>();
  for (const t of Object.values(TACTICS)) for (const b of t.begriffe ?? []) erklaert.add(b.wort);
  for (const e of ENTSCHEIDUNGEN) for (const b of e.begriffe ?? []) erklaert.add(b.wort);
  for (const wort of ["Matching", "Concierge-MVP", "Venture Case", "Power Law", "VSOP", "Stealth"]) {
    assert.ok(erklaert.has(wort), `${wort} steht im Spiel und wird nirgends erklärt`);
  }
  // Jede Erklärung ist ein echter Satz und kein Stichwort.
  const alle = [...Object.values(TACTICS).flatMap((t) => t.begriffe ?? []), ...ENTSCHEIDUNGEN.flatMap((e) => e.begriffe ?? [])];
  for (const b of alle) assert.ok(b.erklaerung.length > 60, `${b.wort} wird in einem Stichwort "erklärt"`);
});

test("der Mentor behauptet nichts, was das Spiel später widerlegt", () => {
  const alles = ONBOARDING.map((z) => z.text).join(" ");
  // Haulway kommt erst im Spielverlauf bei Y Combinator rein — am
  // Anfang darf das nicht schon dastehen.
  assert.ok(!alles.includes("Combinator"), "das Onboarding nimmt den Zug von Haulway vorweg");
  assert.ok(
    RIVAL_STEPS.some((r) => r.label.includes("Y Combinator")),
    "irgendwann muss der Zug kommen",
  );
  // Und er sagt, wer er ist.
  assert.ok(/verkauft|Exit/.test(alles), "Tarek sagt nicht, warum man ihm zuhören sollte");
});

test("die Balken zeigen in dieselbe Richtung wie die Wirkung", () => {
  // Vorher stand „Team 3/5“ auf einer Karte, die neun Punkte Stimmung
  // abzog, und „Geld 4/5“ hieß beim Stipendium Einnahme und bei einer
  // Einstellung Gehalt. Derselbe Balken, entgegengesetzte Bedeutung.
  const paare: [keyof typeof TACTICS.tabelle.impact, (t: Tactic) => number][] = [
    ["team", (t) => t.effects.team ?? 0],
    ["produkt", (t) => t.effects.product ?? 0],
    ["umsatz", (t) => (t.effects.mrr ?? 0) + (t.effects.customers ?? 0) * 100],
    ["investoren", (t) => t.effects.investors ?? 0],
    [
      "geld",
      (t) =>
        (t.effects.cash ?? 0) -
        (t.cost ?? 0) -
        (t.effects.burn ?? 0) * 12 -
        (t.effects.einstellen ?? []).reduce((n, e) => n + e.kosten * 12, 0),
    ],
  ];
  for (const t of Object.values(TACTICS)) {
    for (const [k, wirkung] of paare) {
      const balken = t.impact[k];
      if (balken === undefined) continue;
      const w = wirkung(t);
      if (w === 0) continue;
      assert.equal(Math.sign(balken), Math.sign(w), `${t.id}: Balken ${k} ${balken}, Wirkung ${w}`);
    }
  }
});

test("wer fast pleite ist, darf trotzdem telefonieren", () => {
  // Die Pufferregel galt auch für Karten ohne Preis. Bei 980 € Kasse
  // stand hinter jeder Karte „Zu teuer“ — auch hinter der einen, die
  // noch rausgeführt hätte.
  const knapp = S({ cash: 980, mrr: 190, customers: 1 });
  const gratis = T({ id: "anrufen", months: 2, braucht: "vertrieb" });
  assert.ok(canStart(knapp, gratis), "eine kostenlose Maßnahme darf nie an der Kasse scheitern");
  assert.equal(blockedReason(knapp, gratis), null);
  // Was Geld kostet, bleibt gesperrt.
  const teuer = T({ id: "messe", months: 2, cost: 6_500, braucht: "vertrieb" });
  assert.equal(canStart(knapp, teuer), false);
  assert.equal(blockedReason(knapp, teuer), "Zu teuer");
});

test("eine wiederholbare Karte bleibt wählbar", () => {
  // Der Grund für Monate, in denen jemand frei war und nichts ging:
  // „Ein Monat auf halber Kraft“ stand in der Liste und war gesperrt.
  const immer = T({ id: "hoefe", months: 2, repeatable: true, braucht: "vertrieb" });
  const fertig = { ...S(), used: ["hoefe"] };
  assert.ok(canStart(fertig, immer), "wiederholbar heißt wiederholbar");
  assert.equal(blockedReason(fertig, immer), null);
  // Und eine einmalige bleibt einmalig.
  const einmal = T({ id: "einmal", months: 1 });
  assert.equal(canStart({ ...S(), used: ["einmal"] }, einmal), false);
  assert.equal(blockedReason({ ...S(), used: ["einmal"] }, einmal), "Läuft schon");
});

test("wer kein fremdes Geld will, hat in jedem Kapitel noch Karten", () => {
  for (const m of MILESTONES) {
    const s = S({ milestoneId: m.id, kurs: "bootstrap", product: 60, customers: 8, mrr: 8_000, cash: 80_000 });
    const deck = deckFor(s, m, TACTICS);
    assert.ok(deck.length >= 3, `${m.id}: nur ${deck.length} Karten ohne fremdes Geld`);
    assert.ok(
      deck.some((t) => (t.effects.mrr ?? 0) > 0 || (t.effects.cash ?? 0) > 0),
      `${m.id}: kein Weg, selbst Geld zu verdienen`,
    );
    assert.ok(
      !deck.some((t) => (t.effects.equity ?? 0) < 0),
      `${m.id}: Anteile kosten, obwohl man sich dagegen entschieden hat`,
    );
  }
});

test("die Geldfrage kommt zum Kapitelbeginn und hat Folgen", () => {
  const start = S({ milestoneId: "geld", customers: 3, mrr: 2_000, month: 9, lastChoice: 8 });
  const e = drawEntscheidung(start, ENTSCHEIDUNGEN);
  assert.equal(e?.id, "weg", "die Frage nach fremdem Geld eröffnet das Kapitel");
  const nein = e!.wege.find((w) => w.id === "nein")!;
  const danach = entscheiden(start, e!, nein);
  assert.equal(danach.kurs, "bootstrap");
  // Und danach liegt keine Anteilskarte mehr im Stapel.
  const deck = deckFor(danach, MILESTONE_BY_ID.geld, TACTICS);
  assert.ok(deck.length >= 3);
  assert.ok(!deck.some((t) => (t.effects.equity ?? 0) < 0), "nach dem Nein liegen die Investorenkarten weiter da");
});

test("„Es trägt sich“ bekommt nur, wem die Firma auch gehört", () => {
  const finanziert = S({ mrr: 20_000, customers: 20, cash: 2_000_000, equity: 55, burn: 30_000 });
  assert.notEqual(pickEnding(finanziert), "profitabel", "2,5 Mio. aufgenommen ist kein Bootstrapper-Ende");
  assert.ok(ENDING_BY_ID[pickEnding(finanziert)]);
  const eigen = S({ mrr: 14_000, customers: 14, cash: 60_000, equity: 95, burn: 2_000 });
  assert.equal(pickEnding(eigen), "profitabel");
});

test("jeder Name ist vorgestellt, bevor er etwas tut", () => {
  const onboarding = ONBOARDING.map((z) => z.text).join(" ");
  for (const name of ["Ole", "Haulway", "Jonas"]) {
    assert.ok(onboarding.includes(name), `${name} taucht im Spiel auf, ohne je vorgestellt zu werden`);
  }
  // Oltmanns steht nicht im Onboarding — dann muss jede Stelle, an der
  // er auftaucht, selbst sagen, wer er ist.
  const karten = Object.values(TACTICS).filter((t) => `${t.label} ${t.flavour}`.includes("Oltmanns"));
  assert.ok(karten.length >= 2);
  for (const t of karten) {
    assert.match(`${t.label} ${t.flavour}`, /Reeder/, `${t.id} nennt Oltmanns, ohne zu sagen, wer das ist`);
  }
  assert.match(ENTSCHEIDUNGEN.find((e) => e.id === "weg")!.beats.join(" "), /Reeder/);
});

test("Sofia lässt sich nur halten, solange sie da ist", () => {
  const halten = TACTICS["halten"];
  assert.equal(halten.when!(S()), false, "ohne Sofia gibt es nichts zu halten");
  const mit = applyEffects(S(), { einstellen: [{ name: "Sofia", rolle: "entwicklung", kosten: 6_400 }] });
  assert.equal(halten.when!(mit), true);
  assert.equal(halten.when!(applyEffects(mit, { verlassen: "entwicklung" })), false);
});

test("Tarek bleibt dabei und eröffnet die Kapitel", () => {
  // Er sagt in Karte 1 „ich schau euch über die Schulter“ — und war
  // danach einundzwanzig Monate lang nicht mehr zu sehen.
  const mitTarek = MILESTONES.filter((m) => m.onEnter?.kicker === "Tarek");
  assert.ok(mitTarek.length >= 4, `nur ${mitTarek.length} Kapitel haben eine Ansage von Tarek`);
  for (const m of mitTarek) {
    assert.equal(m.onEnter!.beats.length, 2, `${m.id}: Tarek redet nicht in zwei Sätzen`);
    assert.deepEqual(m.onEnter!.effects, {}, `${m.id}: eine Ansage darf nichts am Spielstand ändern`);
  }
  // Und das Geld-Kapitel ist die Stelle, an der er beide Wege nennt.
  const geld = MILESTONE_BY_ID.geld.onEnter!.beats.join(" ");
  assert.match(geld, /gehört/, "er muss sagen, was fremdes Geld kostet");
});

/* ── Verkaufen ── */

test("der Erlös ist nicht Preis mal Anteil", () => {
  // Die Rechnung, die das Spiel bisher nicht hatte.
  const ohne = S({ equity: 100, runden: [] });
  assert.equal(erloes(1_000_000, ohne).gruender, 1_000_000);

  // 2× participating: zuerst das Doppelte zurück, dann noch der Anteil.
  const schlimm = S({
    equity: 78,
    runden: [{ wer: "Anker-VC", betrag: 2_500_000, faktor: 2, participating: true }],
  });
  const a = erloes(4_000_000, schlimm);
  assert.equal(a.praeferenz, 5_000_000 > 4_000_000 ? 4_000_000 : 5_000_000);
  assert.equal(a.gruender, 0, "bei 4 Mio. Preis und 5 Mio. Präferenz bleibt nichts");
  assert.match(a.warnung ?? "", /zuerst/);

  // Derselbe Preis, dieselbe Beteiligungshöhe, aber 1× ohne participating:
  // die Investoren wandeln und nehmen nur ihren Anteil.
  const fair = S({
    equity: 78,
    runden: [{ wer: "Angel-Club", betrag: 2_500_000, faktor: 1, participating: false }],
  });
  const b = erloes(4_000_000, fair);
  assert.equal(b.praeferenz, 2_500_000, "1× heißt: einmal das Geld zurück");
  assert.equal(b.gruender, 1_500_000, "und der Rest gehört euch");
  assert.ok(b.gruender > a.gruender, "derselbe Preis, nur andere Bedingungen");
});

test("dieselbe Firma, zwei Term Sheets, zwei Leben", () => {
  const basis = { equity: 80, mrr: 20_000 };
  const teuer = S({ ...basis, runden: [{ wer: "VC", betrag: 2_000_000, faktor: 2, participating: true }] });
  const sauber = S({ ...basis, runden: [{ wer: "Angels", betrag: 2_000_000, faktor: 1, participating: false }] });
  const preis = 6_000_000;
  assert.ok(erloes(preis, sauber).gruender > erloes(preis, teuer).gruender + 1_000_000);
});

test("das Ende folgt dem Geld, nicht dem Käufer", () => {
  const leer = S({ equity: 80, runden: [{ wer: "VC", betrag: 3_000_000, faktor: 2, participating: true }] });
  assert.equal(verkaufsEnde(leer, 4_000_000), "verkauft-leer");
  assert.equal(verkaufsEnde(S({ equity: 100 }), 300_000), "verkauft-klein");
  assert.equal(verkaufsEnde(S({ equity: 100 }), 4_000_000), "verkauft");
  for (const id of ["verkauft", "verkauft-klein", "verkauft-leer"]) {
    assert.ok(ENDING_BY_ID[id], `${id} fehlt in den Enden`);
  }
});

test("das erste Angebot ist eine Falle, und man kann sie sehen", () => {
  const a = ANGEBOTE[0];
  assert.equal(a.id, "boerse-kauf");
  // Alles, was man zum Durchschauen braucht, steht auf der Karte:
  // der Barbetrag und das, was daran hängt.
  const text = a.bedingungen.join(" ");
  assert.match(text, /bei Unterschrift/, "der Barbetrag muss dastehen");
  assert.match(text, /Earn-out/, "der Teil, der an Bedingungen hängt, muss dastehen");
  assert.match(a.tarek, /Konto|bar/, "Tarek muss sagen, womit man das prüft");
  // Und er nennt eine kleinere Zahl als die Überschrift.
  const preis = a.preis(S({ mrr: 2_700, customers: 4 }));
  assert.ok(preis >= 750_000, "die Überschrift muss groß sein, sonst ist es keine Falle");
  // Aber nicht so groß, dass Annehmen die bessere Rechnung wäre.
  const spaeter = ANGEBOTE.find((x) => x.id === "plattform-kauf")!.preis(S({ mrr: 20_000 }));
  assert.ok(spaeter > preis * 2, "wer die Falle durchschaut, muss dafür belohnt werden");
});

test("die Falle zahlt nicht, was auf dem Schild steht", () => {
  // Das ist der Kern: 750.000 € im Angebot, 250.000 € am Tag der
  // Unterschrift, und der Rest hängt an Zielen, die der Käufer setzt.
  const lage = S({ month: 8, customers: 4, mrr: 2_700, equity: 100 });
  const falle = ANGEBOTE[0];
  const preis = falle.preis(lage);
  const danach = annehmen(lage, falle, preis);
  assert.equal(danach.verkauf?.schild, preis);
  assert.ok(danach.verkauf!.erloest < preis / 2, "die Barquote muss im Zustand ankommen");
  assert.equal(danach.endingId, "verkauft-klein", "ein Drittel von 750k ist kein gutes Ende");

  // Das faire Angebot zahlt dagegen voll aus.
  const gross = S({ mrr: 20_000, equity: 100 });
  const platt = ANGEBOTE.find((x) => x.id === "plattform-kauf")!;
  const voll = annehmen(gross, platt, platt.preis(gross));
  assert.equal(voll.verkauf!.erloest, voll.verkauf!.schild);
  assert.equal(voll.endingId, "verkauft");
});

test("Angebote kommen in der Reihenfolge, in der sie Sinn ergeben", () => {
  // Früh die Frachtbörse, spät die Plattform.
  const frueh = S({ month: 8, customers: 4, mrr: 2_700 });
  assert.equal(drawAngebot(frueh, ANGEBOTE)?.id, "boerse-kauf");
  // Abgelehnt kommt dasselbe Angebot nicht wieder.
  const danach = ablehnen(frueh, ANGEBOTE[0]);
  assert.notEqual(drawAngebot(danach, ANGEBOTE)?.id, "boerse-kauf");
  assert.ok(danach.investors > frueh.investors, "ein Angebot abzulehnen spricht sich herum");
  // Und das große Angebot gibt es erst, wenn der Umsatz es trägt.
  assert.equal(ANGEBOTE.find((x) => x.id === "plattform-kauf")!.when(frueh), false);
  assert.equal(ANGEBOTE.find((x) => x.id === "plattform-kauf")!.when(S({ mrr: 20_000 })), true);
});

test("wer ablehnt und wächst, bekommt mehr geboten", () => {
  // Die Wette, um die es geht: dasselbe Geschäft, zwei Jahre später.
  const klein = S({ mrr: 2_700, customers: 4, month: 8 });
  const gross = S({ mrr: 20_000, customers: 25, month: 26 });
  const ersterPreis = ANGEBOTE[0].preis(klein);
  const spaeterPreis = ANGEBOTE.find((x) => x.id === "plattform-kauf")!.preis(gross);
  assert.ok(spaeterPreis > ersterPreis * 2, `${spaeterPreis} ist keine Belohnung für das Warten`);
});

test("jedes Angebot erklärt sich und verweist auf das Werkzeug", () => {
  assert.ok(ANGEBOTE.length >= 3);
  for (const a of ANGEBOTE) {
    assert.equal(a.beats.length, 2, `${a.id} ohne zwei Beats`);
    assert.equal(a.absage.length, 2, `${a.id} ohne Folge der Absage`);
    assert.ok(a.bedingungen.length >= 3, `${a.id}: zu wenige Bedingungen, um etwas zu prüfen`);
    assert.ok(a.warum.length > 40, `${a.id} sagt nicht, warum sie kaufen wollen`);
    assert.ok(a.tarek.length > 60, `${a.id} ohne Einordnung`);
    assert.ok(a.link?.href.startsWith("/?tool="), `${a.id} verweist nicht auf das passende Werkzeug`);
    assert.ok(Object.keys(a.absageEffects).length > 0, `${a.id}: Ablehnen bleibt folgenlos`);
  }
});

test("Geldkarten hinterlassen eine Präferenz, keine Fußnote", () => {
  // Der Fehler, der das ganze Thema unsichtbar gemacht hat: die Karte
  // sagte „2× participating“ und im Zustand stand nichts.
  const vc = TACTICS["anker-vc"];
  assert.ok(vc.effects.runde, "die größte Runde im Spiel hinterlässt keine Präferenz");
  assert.equal(vc.effects.runde!.faktor, 2);
  assert.equal(vc.effects.runde!.participating, true);
  const danach = applyEffects(S(), vc.effects);
  assert.equal(danach.runden.length, 1);
  // Und jede Karte, die Geld gegen Anteile bringt, führt eine Runde.
  for (const t of Object.values(TACTICS)) {
    if ((t.effects.cash ?? 0) > 0 && (t.effects.equity ?? 0) < 0) {
      assert.ok(t.effects.runde, `${t.id} nimmt Geld gegen Anteile, hinterlässt aber keine Runde`);
      assert.equal(t.effects.runde!.betrag, t.effects.cash, `${t.id}: Betrag und Einzahlung weichen ab`);
    }
  }
});

/* ── Eine ganze Partie ── */

test("man kann die Kette von vorn bis hinten durchspielen", () => {
  let s = S();
  let schritte = 0;
  for (const m of MILESTONES) {
    s = { ...s, milestoneId: m.id };
    while (!m.gate(s) && schritte < 40) {
      const deck = deckFor(s, m, TACTICS);
      assert.ok(deck.length, `${m.id}: Deck leer, Tor zu`);
      s = runTactic(s, deck[0]);
      schritte++;
    }
    assert.ok(m.gate(s), `${m.id} nicht erreicht`);
  }
  assert.ok(s.month > 10 && s.month < 80, `unplausible Spieldauer: ${s.month} Monate`);
  assert.ok(ENDING_BY_ID[pickEnding(s)]);
});
