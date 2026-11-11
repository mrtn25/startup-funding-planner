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
  deckFor,
  drawEntscheidung,
  entscheiden,
  entscheidungDue,
  fluss,
  fmtEuroExakt,
  forcedEnding,
  geldSkala,
  initialState,
  meterViews,
  erfolge,
  netBurn,
  rivalMove,
  runTactic,
  reifegrad,
  runway,
  runwayFill,
  saldo,
  tick,
  type GameState,
  type Tactic,
} from "./simulator.ts";
import { ENDING_BY_ID, ENDINGS, ENTSCHEIDUNGEN, ERFOLGE, EVENTS, MILESTONES, MILESTONE_BY_ID, ONBOARDING, RIVAL_STEPS, TACTICS, pickEnding } from "./simulator-scenes.ts";

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

test("so viele Maßnahmen gleichzeitig, wie ihr Köpfe seid", () => {
  const s = S({ headcount: 2 });
  assert.equal(capacity(s), 2);
  const a = startTactic(s, T({ id: "a", months: 2 }));
  assert.equal(a.running.length, 1);
  const b = startTactic(a, T({ id: "b", months: 3 }));
  assert.equal(canStart(b, T({ id: "c" })), false, "zu zweit geht keine dritte");
  assert.equal(canStart(b, T({ id: "a" })), false, "dieselbe nicht zweimal");
  // Ein Hire macht einen Platz frei.
  assert.equal(canStart({ ...b, headcount: 3 }, T({ id: "c" })), true);
});

test("die Zeit läuft für alle laufenden Maßnahmen gleichzeitig", () => {
  let s = startTactic(S({ headcount: 2 }), T({ id: "a", months: 1 }));
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
  // 1.900 € fix plus 3 Kunden à 120 € Betreuung, minus 1.000 € MRR.
  const s = S({ cash: 10_080, burn: 1_900, customers: 3, mrr: 1_000 });
  assert.equal(netBurn(s), 1_260);
  assert.equal(runway(s), 8);
});

test("der Saldo sagt, in welche Richtung die Uhr läuft", () => {
  // Ohne Kunden läuft der Monat gegen euch, mit genug Kunden für euch.
  assert.ok(saldo(S({ burn: 2_400, mrr: 0, customers: 0 })) < 0);
  assert.equal(saldo(S({ burn: 2_400, mrr: 0, customers: 0 })), -2_400);
  assert.ok(saldo(S({ burn: 2_400, mrr: 3_600, customers: 4 })) > 0);
  // Und er ist immer das Gegenstück zum Netto-Abfluss.
  const s = S({ burn: 1_900, mrr: 1_000, customers: 3 });
  assert.equal(saldo(s), -netBurn(s));
});

test("jeder zahlende Kunde bringt mehr, als seine Betreuung kostet", () => {
  // Sonst wäre der erste Kunde eine schlechte Nachricht — und genau
  // das war der Fehler: der Runway fiel weiter, obwohl Geld reinkam.
  const ohne = S({ burn: 2_400, mrr: 0, customers: 0 });
  const mit = S({ burn: 2_400, mrr: 890, customers: 1 });
  assert.ok(saldo(mit) > saldo(ohne));
  assert.ok(runway({ ...mit, cash: 20_000 }) > runway({ ...ohne, cash: 20_000 }));
});

test("Erfolge feiern den Übergang und danach nie wieder", () => {
  const arm = S({ mrr: 0, customers: 0, burn: 2_400 });
  const erster = S({ mrr: 890, customers: 1, burn: 2_400 });
  const treffer = erfolge(arm, erster, ERFOLGE);
  assert.equal(treffer.length, 1);
  assert.equal(treffer[0].id, "erste-rechnung");
  // Schon gefeiert: kommt nicht noch einmal.
  assert.equal(erfolge(arm, { ...erster, gefeiert: ["erste-rechnung"] }, ERFOLGE).length, 0);
  // Und kein Zustand, sondern ein Übergang: zweimal Umsatz ist kein Moment.
  assert.equal(erfolge(erster, S({ mrr: 1_780, customers: 2 }), ERFOLGE).length, 0);
});

test("der Monat, der sich selbst trägt, ist ein eigener Moment", () => {
  const rot = S({ burn: 2_400, mrr: 1_800, customers: 2 });
  const schwarz = S({ burn: 2_400, mrr: 3_600, customers: 4, gefeiert: ["erste-rechnung"] });
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
  const s = S({ cash: 5_000, burn: 1_900, customers: 4, mrr: 4_000 });
  assert.equal(runway(s), Infinity);
  const v = meterViews(s);
  assert.equal(v.length, 6);
  // Keine nackten Prozente mehr, wo niemand weiß, was hundert wäre.
  assert.ok(!v.some((x) => ["Produkt", "Stimmung", "Investoren"].includes(x.label) && x.value.includes("%")));
});

test("ein Monat kostet genau den Netto-Burn", () => {
  const s = S({ cash: 20_000, burn: 1_900, customers: 0, mrr: 0 });
  assert.equal(tick(s).cash, 18_100);
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
  // 20.000 − 6.500 Kosten − 2 × 1.900 Burn, dann erst kommen Kunden und MRR.
  assert.equal(s.cash, 20_000 - 6_500 - 3_800);
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
  const halb = runwayFill(S({ cash: 16_800, burn: 2_800, mrr: 0, customers: 0 }));
  assert.ok(halb > 0.4 && halb < 0.6, `halb voll wäre 0,5, ist ${halb}`);
});

/* ── Retoura ── */

test("Retoura meldet sich, wenn sie an dir vorbeiziehen", () => {
  assert.equal(rivalMove(S({ rival: 10 }), RIVAL_STEPS), null);
  const ersterZug = rivalMove(S({ rival: 30 }), RIVAL_STEPS);
  assert.equal(ersterZug?.at, 25);
  assert.equal(rivalMove(S({ rival: 30, rivalSeen: [25] }), RIVAL_STEPS), null);
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
  assert.equal(team.note, "2 Köpfe");
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
    for (const n of Object.values(t.impact)) assert.ok(n >= 1 && n <= 5, `${t.id}: Wirkung ${n}`);
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
  assert.deepEqual(labels, ["−6.5k €", "+1.8k € MRR", "+2 Kunden", "+8 Investoren", "−4 Team"]);
  assert.equal(badges({ burn: 900 })[0].up, false, "mehr Burn ist keine gute Nachricht");
  assert.equal(badges(undefined).length, 0);
});

/* ── Enden ── */

test("jedes vergebene Ende existiert", () => {
  const faelle = [
    S({ cash: 0 }),
    S({ alignment: 0, customers: 0 }),
    S({ rival: 100, customers: 1 }),
    S({ mrr: 30_000, investors: 70, customers: 20 }),
    S({ mrr: 20_000, customers: 15 }),
    S({ mrr: 9_000, equity: 40, customers: 10 }),
    S({ cash: 20_000, mrr: 400 }),
  ];
  const ids = new Set(faelle.map(pickEnding));
  for (const id of ids) assert.ok(ENDING_BY_ID[id], `unbekannt: ${id}`);
  assert.ok(ids.size >= 5, "die meisten Enden müssen erreichbar sein");
  assert.equal(ENDINGS.length, 7);
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

  const erste = drawEvent(S({ month: 6, customers: 5, mrr: 4_000, headcount: 3 }), EVENTS);
  assert.ok(erste);
  const zweite = drawEvent(S({ month: 9, customers: 5, mrr: 4_000, headcount: 3, drawn: [erste!.id] }), EVENTS);
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

  const lage = S({ product: 40, customers: 2, mrr: 890 });
  const erste = drawEntscheidung(lage, ENTSCHEIDUNGEN);
  assert.ok(erste, "in dieser Lage muss eine Frage offen sein");
  const danach = entscheiden(lage, erste!, erste!.wege[0]);
  assert.ok(danach.entschieden.includes(erste!.id));
  assert.equal(danach.lastChoice, lage.month);
  assert.notEqual(drawEntscheidung(danach, ENTSCHEIDUNGEN)?.id, erste!.id, "dieselbe Frage wird zweimal gestellt");
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
  const s = S({ burn: 2_400, mrr: 890, customers: 2 });
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
