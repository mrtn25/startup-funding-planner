/* Tests für Palettio.  node --test lib/simulator.test.ts */

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  advance,
  alignmentOf,
  drawEvent,
  eventDue,
  applyEffects,
  badges,
  beatsOf,
  deckFor,
  forcedEnding,
  initialState,
  meterViews,
  netBurn,
  rivalMove,
  runTactic,
  runway,
  tick,
  type GameState,
  type Tactic,
} from "./simulator.ts";
import { ENDING_BY_ID, ENDINGS, EVENTS, MILESTONES, MILESTONE_BY_ID, ONBOARDING, RIVAL_STEPS, TACTICS, pickEnding } from "./simulator-scenes.ts";

const S = (patch: Partial<GameState> = {}): GameState => ({ ...initialState(1), ...patch });
const T = (patch: Partial<Tactic> = {}): Tactic => ({
  id: "x",
  label: "x",
  flavour: "x",
  months: 1,
  effects: {},
  beats: ["a", "b"],
  ...patch,
});

/* ── Die Uhr ── */

test("der Runway ist Kasse durch das, was netto rausgeht", () => {
  // 1.900 € fix plus 3 Kunden à 180 € Betreuung, minus 1.000 € MRR.
  const s = S({ cash: 10_080, burn: 1_900, customers: 3, mrr: 1_000, salary: 0 });
  assert.equal(netBurn(s), 1_440);
  assert.equal(runway(s), 7);
});

test("wer mehr einnimmt als ausgibt, hat keinen Countdown mehr", () => {
  const s = S({ cash: 5_000, burn: 1_900, customers: 4, mrr: 4_000, salary: 0 });
  assert.equal(runway(s), Infinity);
  assert.equal(meterViews(s).length, 5);
});

test("ein Monat kostet genau den Netto-Burn", () => {
  const s = S({ cash: 20_000, burn: 1_900, customers: 0, mrr: 0, salary: 0 });
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

test("solange ein Gehalt reinkommt, gibt es keinen Countdown", () => {
  // Lena ist am Anfang angestellt: das Gehalt trägt die Fixkosten.
  const angestellt = S();
  assert.ok(angestellt.salary > 0);
  assert.equal(runway(angestellt), Infinity);

  // Die Kündigung ist der Moment, in dem die Uhr etwas bedeutet.
  const gekuendigt = runTactic(angestellt, TACTICS["kuendigen"]);
  assert.equal(gekuendigt.salary, 0);
  assert.ok(isFinite(runway(gekuendigt)), "nach der Kündigung muss der Runway endlich sein");
  assert.ok(runway(gekuendigt) < 12);
});

/* ── Maßnahmen ── */

test("eine Maßnahme kostet sofort Geld, dann Zeit, dann wirkt sie", () => {
  const s = runTactic(
    S({ cash: 20_000, burn: 1_900, customers: 0, mrr: 0, salary: 0 }),
    T({ cost: 6_500, months: 2, effects: { customers: 2, mrr: 1_780 } }),
  );
  // 20.000 − 6.500 Kosten − 2 × 1.900 Burn, dann erst kommen Kunden und MRR.
  assert.equal(s.cash, 20_000 - 6_500 - 3_800);
  assert.equal(s.customers, 2);
  assert.equal(s.mrr, 1_780);
  assert.equal(s.month, 2);
});

test("eine benutzte Karte liegt nicht mehr im Deck", () => {
  const m = MILESTONE_BY_ID["problem"];
  const voll = deckFor(S(), m, TACTICS);
  const nachher = deckFor(S({ used: [voll[0].id] }), m, TACTICS);
  assert.equal(nachher.length, voll.length - 1);
});

test("Karten mit Bedingung tauchen erst auf, wenn sie dürfen", () => {
  const m = MILESTONE_BY_ID["kunde"];
  const ohneProdukt = deckFor(S({ product: 10, mrr: 0, rival: 10 }), m, TACTICS).map((t) => t.id);
  assert.ok(!ohneProdukt.includes("warme-kontakte"), "LinkedIn braucht ein Produkt");
  assert.ok(!ohneProdukt.includes("feier-erste-rechnung"), "ohne Umsatz gibt es nichts zu feiern");
  const mitAllem = deckFor(S({ product: 45, mrr: 890, rival: 10 }), m, TACTICS).map((t) => t.id);
  assert.ok(mitAllem.includes("warme-kontakte") && mitAllem.includes("feier-erste-rechnung"));
});

test("hat Retoura den Messestand, ist die Messe weg", () => {
  const m = MILESTONE_BY_ID["kunde"];
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

test("spätestens beim ersten Kunden ist das Gehalt weg", () => {
  const kunde = MILESTONE_BY_ID["kunde"];
  assert.ok(kunde.onEnter, "dieser Meilenstein muss die Uhr starten");
  assert.equal(kunde.onEnter!.when!(S({ salary: 2_300 })), true);
  assert.equal(kunde.onEnter!.when!(S({ salary: 0 })), false, "wer schon gekündigt hat, kündigt nicht nochmal");
  const danach = applyEffects(S({ salary: 2_300 }), kunde.onEnter!.effects);
  assert.equal(danach.salary, 0);
  assert.ok(isFinite(runway(danach)));
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

/* ── Der Inhalt ── */

test("jede Karte nennt Dauer und Wirkung, aber verrät nichts im Text", () => {
  for (const t of Object.values(TACTICS)) {
    assert.ok(t.months >= 0 && t.months <= 6, `${t.id}: ${t.months} Monate`);
    assert.ok(t.flavour.length > 25, `${t.id} ohne Beschreibung`);
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
  assert.equal(MILESTONES.length, 8);
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
  for (const begriff of ["Runway", "Retoura", "Maßnahme"]) {
    assert.ok(alles.includes(begriff), `${begriff} wird nie erklärt`);
  }
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
  assert.ok(EVENTS.length >= 10, "zu wenige Ereignisse für acht Phasen");
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
  ].join(" ");
  // Ein paar englische Füllwörter, die beim Übersetzen gern stehen bleiben.
  for (const wort of [" the ", " you ", " with ", " and the ", " months of "]) {
    assert.ok(!text.includes(wort), `englischer Rest im Inhalt: "${wort}"`);
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
