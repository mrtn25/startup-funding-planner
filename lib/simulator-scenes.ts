/* ══════════════════════════════════════════════════════════════
   Palettio — Inhalt.

   Sechs Phasen. In jeder liegt eine Liste von Maßnahmen, nach Gruppen
   sortiert, die parallel laufen können. Jede Karte zeigt auf Tap eine
   Detailkarte: Bild, Wirkung als Balken, zwei Zeilen, starten.

   Texte sind kurz. Wer spielt, will nicht lesen.
   ══════════════════════════════════════════════════════════════ */

import type { Ending, GameEvent, GameState, Milestone, RivalStep, Tactic } from "./simulator.ts";
import { fmtEuro } from "./simulator.ts";

export const ONBOARDING: { text: string; highlight?: string }[] = [
  { text: "Moin. Ich bin Tarek. Ich habe selbst zwei Firmen gegründet, eine davon ging gut. Ich schau euch über die Schulter." },
  { text: "Ihr beide habt Lkw eingeteilt — Disponenten nennt man das. Euch ist aufgefallen: jede vierte Fahrt geht leer zurück, weil niemand Zeit hat, eine Rückladung zu suchen." },
  { text: "Genau das soll eure Software machen. Gekündigt habt ihr beide schon. Gebaut ist noch nichts, Kunden habt ihr keine." },
  { text: "Links seht ihr euer Erspartes: 32.000 €. Davon gehen Miete und Essen ab, später Server und Gehälter. Das ist eure Uhr.", highlight: "eure Uhr" },
  { text: "Rechts wählt ihr, woran ihr arbeitet. Zwei Sachen gleichzeitig, eine pro Kopf. Jede dauert Monate." },
  { text: "Und in San Francisco baut Haulway dasselbe, bezahlt von Y Combinator. Die warten nicht auf euch.", highlight: "Haulway" },
];

export const INTRO = {
  image: "kitchen-night",
  who: "Lena Brandt & Jonas Ritter, Hamburg",
  lines: [
    "Ihr habt Lkw eingeteilt, für eine Spedition in Hamburg. Jede vierte Fahrt kommt leer zurück, weil niemand Zeit hat, für die Rückfahrt eine Ladung zu suchen.",
    "Das ist eure Marktlücke: eine Software, die diese Rückladungen automatisch findet. Ihr habt beide gekündigt und je 16.000 € gespart. Gebaut ist nichts, Kunden habt ihr keine.",
  ],
};

/* ── Maßnahmen ───────────────────────────────────────────────── */

const T = (t: Tactic) => t;

export const TACTICS: Record<string, Tactic> = Object.fromEntries(
  [
    /* 1 · MVP */
    T({
      id: "tabelle",
      label: "Tabelle mit Makro",
      group: "Produkt",
      flavour: "Zwei Wochenenden. Freitags lasst ihr es von Hand laufen.",
      impact: { produkt: 2 },
      months: 1,
      effects: { product: 16 },
      beats: ["Zwei Spalten, ein Knopf, ein Makro.", "Ole bei Krämer findet damit am Dienstag eine Rückladung."],
    }),
    T({
      id: "handarbeit",
      label: "Von Hand machen, Software nennen",
      group: "Produkt",
      flavour: "Sie schicken Leerfahrten, ihr schickt Treffer zurück. Nachts, zu Fuß.",
      impact: { produkt: 4, team: 2 },
      months: 2,
      effects: { product: 26, team: -6, burn: 150 },
      beats: ["Ole hält es für ein System. Es ist euer Küchentisch.", "Ihr lernt in sechs Wochen, was das Matching wirklich können muss."],
    }),
    T({
      id: "richtig-bauen",
      label: "Richtig bauen",
      group: "Produkt",
      flavour: "Login, Karte, Matching-Engine. Monate von Nächten.",
      impact: { produkt: 5, team: 2, investoren: 2 },
      months: 5,
      effects: { product: 34, investors: 6, team: -5 },
      beats: ["Fünf Monate von 22 bis 1 Uhr. Die Demo sieht gut aus.", "Fünf Monate, in denen kein Disponent es angefasst hat."],
    }),
    T({
      id: "routing",
      label: "Routing-Engine einkaufen",
      group: "Produkt",
      flavour: "Die schwierige Geometrie hat jemand anders gelöst.",
      impact: { produkt: 4, geld: 2 },
      cost: 4_200,
      months: 2,
      effects: { product: 24, burn: 340 },
      beats: ["Sechs Wochen statt sechs Monate.", "Dafür jeden Monat Lizenzgebühr — und eine Frage in jeder Due Diligence."],
    }),
    T({
      id: "jonas-fragen",
      label: "Jonas fragen, was er eigentlich will",
      group: "Team",
      flavour: "Ein Abend, eine Frage, keine Entscheidung.",
      impact: { team: 3 },
      months: 1,
      effects: { alignment: 12, team: 5 },
      beats: ["", ""],
      beatsBy: {
        bootstrap: [
          "„Ehrlich? Ich will keine Investoren. Mein Schwager hatte nach anderthalb Jahren ein Board.“",
          "Er will, dass sich das selbst trägt. Fremdes Geld kostet dich ab jetzt mehr als Anteile.",
        ],
        venture: [
          "„Wenn wir das machen, dann richtig. Haulway wird Geld aufnehmen.“",
          "Er will eine Runde. Jeder Monat ohne Investorengespräch ist einer, in dem er zweifelt.",
        ],
      },
    }),

    T({
      id: "durchatmen",
      label: "Ein Wochenende nicht arbeiten",
      group: "Team",
      flavour: "Zwei Tage, an denen keiner aufs Matching-Dashboard schaut.",
      impact: { team: 4 },
      months: 1,
      effects: { team: 14, product: -2 },
      when: (s: GameState) => s.team < 55,
      repeatable: true,
      beats: ["Jonas fährt zu seiner Schwester, du schläfst.", "Am Montag ist alles noch genauso kaputt — und ihr könnt es ansehen, ohne zu zucken."],
    }),

    /* 2 · Erste Kunden */
    T({
      id: "pilot",
      label: "Vier Wochen bei Ole Wendt",
      group: "Vertrieb",
      flavour: "Achtzehn Lkw, kein Budget, keine Geduld.",
      impact: { umsatz: 3, produkt: 3 },
      months: 3,
      effects: { customers: 1, mrr: 890, product: 12, investors: 4 },
      beats: ["Fünf Tage neben ihm im Container, dann nutzt er es allein.", "Er unterschreibt für 890 € und erzählt es dem Hof nebenan."],
    }),
    T({
      id: "warme-kontakte",
      label: "Warme Kontakte anschreiben",
      group: "Vertrieb",
      flavour: "Zwanzig Leute, die euren Namen kennen.",
      impact: { umsatz: 2 },
      months: 1,
      effects: { customers: 1, mrr: 890, investors: 2 },
      when: (s: GameState) => s.product >= 30,
      beats: ["Neun Antworten, drei Telefonate, ein Ja.", "Der billigste Kunde eures Lebens. Davon gibt es genau zwanzig."],
    }),
    T({
      id: "kaltakquise",
      label: "Hofliste kalt durchtelefonieren",
      group: "Vertrieb",
      flavour: "Zweihundert Nummern, von oben nach unten.",
      impact: { umsatz: 2, produkt: 2, team: 1 },
      months: 2,
      effects: { product: 8, customers: 1, mrr: 540, team: -10 },
      beats: ["Zweihundert Anrufe, sechs Demos, eine Unterschrift zum Sonderpreis.", "Mitgenommen: die vier Sätze, die diese Gespräche beenden."],
    }),
    T({
      id: "messe",
      label: "Stand auf der transport logistic",
      group: "Vertrieb",
      flavour: "Vier Tage München. Vor Ort unterschreibt niemand.",
      impact: { umsatz: 4, investoren: 3, geld: 4 },
      cost: 6_500,
      months: 4,
      effects: { customers: 2, mrr: 1_780, investors: 8, team: -4 },
      when: (s: GameState) => s.rival < 45,
      beats: ["Vierzig Gespräche, elf Karten, ein Disponent aus Bremen bleibt vierzig Minuten.", "Zwei unterschreiben im Quartal danach."],
    }),
    T({
      id: "boerse",
      label: "Frachtbörse für Empfehlungen zahlen",
      group: "Vertrieb",
      flavour: "Deren Vertrieb hat die Beziehungen schon.",
      impact: { umsatz: 3, geld: 3 },
      cost: 3_000,
      months: 2,
      effects: { customers: 2, mrr: 1_400, investors: -3 },
      beats: ["Zwei Unterschriften in acht Wochen, zu deren Preis.", "Funktioniert genau einmal. Sie wollen an allem mitverdienen."],
    }),

    /* 3 · Erstes Geld */
    T({
      id: "exist",
      label: "EXIST-Stipendium beantragen",
      group: "Geld",
      flavour: "Elf Wochen Formulare, keine Anteile.",
      impact: { geld: 4, investoren: 2 },
      months: 4,
      effects: { cash: 32_000, investors: 4, burn: 900 },
      alignmentBy: { bootstrap: 8, venture: -4 },
      beats: ["Eine Präsentation in Lüneburg, Bescheid im März.", "32.000 € über zwölf Monate. Billiger kommt ihr nie an Geld."],
    }),
    T({
      id: "angel-40",
      label: "Oltmanns: 100.000 € für 40 %",
      group: "Geld",
      flavour: "Er will bis Freitag eine Antwort.",
      impact: { geld: 5, investoren: 2 },
      months: 1,
      effects: { cash: 100_000, equity: -40, investors: -8 },
      alignmentBy: { bootstrap: -18, venture: 6 },
      beats: ["Freitag ist das Geld da.", "Vierzig Prozent in der ersten Runde. Das erklärt ihr ab jetzt jedem Investor."],
    }),
    T({
      id: "wandeldarlehen",
      label: "Wandeldarlehen anbieten",
      group: "Geld",
      flavour: "Sein Geld jetzt, der Preis bei der nächsten Runde.",
      impact: { geld: 5, investoren: 3 },
      months: 2,
      effects: { cash: 100_000, equity: -11, investors: 3 },
      alignmentBy: { bootstrap: -6, venture: 8 },
      beats: ["100.000 €, 20 % Discount, 4 Mio. Cap.", "Niemand musste heute festlegen, was Palettio wert ist."],
    }),
    T({
      id: "aus-umsatz",
      label: "Aus Speditionsgeld finanzieren",
      group: "Geld",
      flavour: "Kein Deck, keine Termine. Dreißig Gespräche.",
      impact: { umsatz: 4, geld: 2 },
      months: 3,
      effects: { customers: 3, mrr: 2_300, team: -6 },
      alignmentBy: { bootstrap: 10, venture: -8 },
      beats: ["Drei Höfe mehr am Netz.", "Umsatz kostet keine Anteile. Er kostet drei Monate, in denen das Produkt steht."],
    }),
    T({
      id: "fff",
      label: "Friends and Family",
      group: "Geld",
      flavour: "Dein Onkel, Jonas' Schwager, je 8.000 €.",
      impact: { geld: 3 },
      months: 2,
      effects: { cash: 24_000, equity: -6, investors: -2, team: -4 },
      beats: ["Drei Leute, die das nicht beurteilen können, unterschreiben.", "Die einzige Geldsorte, bei der eine Down-Round Weihnachten schwierig macht."],
    }),

    /* 4 · Team & Büro */
    T({
      id: "buero",
      label: "Zwei Räume in Ottensen",
      group: "Team",
      flavour: "48 m², Altbau, Hinterhof, ab dem Ersten.",
      impact: { team: 4, geld: 2 },
      cost: 2_400,
      months: 1,
      effects: { burn: 1_250, team: 12, investors: 3 },
      beats: ["Zwei Räume, eine geteilte Küche.", "In dieser Küche werden Dinge besprochen, die vorher niemand angesprochen hat."],
    }),
    T({
      id: "hire-vertrieb",
      label: "Marie für den Vertrieb",
      group: "Team",
      flavour: "Kommt von einer Frachtbörse, kennt die halbe Branche.",
      impact: { umsatz: 5, geld: 4 },
      months: 2,
      effects: { burn: 7_500, headcount: 1, customers: 3, mrr: 2_670, investors: 5 },
      beats: ["Sie kennt die Disponenten beim Vornamen.", "7.500 € ab Tag eins, Abschlüsse ab Monat drei. Die Lücke ist das Risiko."],
    }),
    T({
      id: "hire-eng",
      label: "Eine Entwicklerin einstellen",
      group: "Team",
      flavour: "Damit das Matching nachts läuft und nicht, wenn ihr dran denkt.",
      impact: { produkt: 5, geld: 4 },
      months: 2,
      effects: { burn: 8_000, headcount: 1, product: 20, customers: 1, mrr: 890 },
      beats: ["Das Matching läuft um 4 Uhr, jeden Tag.", "Kunden merken es in drei Wochen, Investoren in sechs Monaten."],
    }),
    T({
      id: "werkstudenten",
      label: "Zwei Werkstudenten",
      group: "Team",
      flavour: "Zusammen 1.900 €, kündbar zum Semester.",
      impact: { umsatz: 2, geld: 2 },
      months: 1,
      effects: { burn: 1_900, headcount: 1, customers: 1, mrr: 890, team: -3 },
      beats: ["Sie übernehmen Onboarding und Datenpflege.", "Beide sind weg, bevor das, was sie gelernt haben, wichtig wird."],
    }),
    T({
      id: "ausflug",
      label: "Kutter nach Finkenwerder",
      group: "Team",
      flavour: "Ein Tag raus, alle zusammen, niemand redet über Roadmaps.",
      impact: { team: 5 },
      cost: 600,
      months: 1,
      effects: { team: 16 },
      when: (s: GameState) => s.headcount >= 3,
      beats: ["Fischbrötchen, drei Stunden Regen.", "Danach seid ihr eine Firma und nicht vier Leute mit demselben Kalender."],
    }),

    /* 5 · Seed */
    T({
      id: "anker-vc",
      label: "Anker-VC: 2,5 Mio. auf 10 Mio.",
      group: "Geld",
      flavour: "Großer Fonds aus München. Boardsitz, 2× participating.",
      impact: { geld: 5, investoren: 5, team: 2 },
      months: 4,
      effects: { cash: 2_500_000, equity: -22, investors: 12, burn: 3_000 },
      alignmentBy: { bootstrap: -12, venture: 10 },
      beats: ["Sechs Wochen Exklusivität, vier Wochen Prüfung.", "Beim mittleren Exit holen sie ihre 2,5 Mio. doppelt raus, bevor ihr etwas seht."],
    }),
    T({
      id: "angel-club",
      label: "Angel-Club: 800.000 €",
      group: "Geld",
      flavour: "Neun Leute, einer spricht. 1× non-participating, kein Board.",
      impact: { geld: 4, investoren: 3 },
      months: 3,
      effects: { cash: 800_000, equity: -15, investors: 6, burn: 500 },
      beats: ["Term Sheet auf zwei Seiten.", "Weniger Geld, saubere Bedingungen — und in achtzehn Monaten müsst ihr wieder los."],
    }),
    T({
      id: "stratege",
      label: "Strategischer Investor",
      group: "Geld",
      flavour: "Eine Frachtbörse. Geld, Vertrieb — und ein Vorkaufsrecht.",
      impact: { geld: 5, umsatz: 5 },
      months: 3,
      effects: { cash: 1_200_000, equity: -18, customers: 6, mrr: 5_340, investors: -6 },
      beats: ["1,2 Mio. und vierzig offene Türen im ersten Quartal.", "Das Vorkaufsrecht im Vertrag schreckt jeden späteren Käufer ab."],
    }),
    T({
      id: "runde-schieben",
      label: "Runde schieben, erst Umsatz",
      group: "Vertrieb",
      flavour: "Sechs Monate bessere Zahlen, schlechtere Nerven.",
      impact: { umsatz: 4, investoren: 2 },
      months: 6,
      effects: { customers: 4, mrr: 3_560, investors: -8 },
      alignmentBy: { bootstrap: 8, venture: -10 },
      beats: ["Der Umsatz steigt, die Bewertung wäre jetzt höher.", "Zwei der drei Fonds haben inzwischen woanders investiert. In dieser Branche."],
    }),
    T({
      id: "bruecke",
      label: "Brücke von Oltmanns",
      group: "Geld",
      flavour: "150.000 €, ein Telefonat, wandelt beim nächsten Preis.",
      impact: { geld: 3 },
      months: 1,
      effects: { cash: 150_000, equity: -5, investors: -3 },
      beats: ["Ein Sonntagstelefonat, zwei Seiten.", "Eine Wette auf sechs bessere Monate."],
    }),

    /* 6 · Skalieren */
    T({
      id: "vertrieb-ausbauen",
      label: "Drei Leute für den Vertrieb",
      group: "Team",
      flavour: "Marie baut ein Team. Das Geld ist ja da.",
      impact: { umsatz: 5, geld: 5, team: 2 },
      months: 3,
      effects: { burn: 19_000, headcount: 3, customers: 12, mrr: 10_680, team: -6 },
      beats: ["Drei Einstellungen in acht Wochen.", "Die Fixkosten verdreifachen sich an einem Tag."],
    }),
    T({
      id: "produkt-tiefer",
      label: "Produkt tiefer statt breiter",
      group: "Produkt",
      flavour: "Abrechnung, Zoll, Telematik. Alles, was sie ohnehin machen.",
      impact: { produkt: 5, umsatz: 4 },
      months: 4,
      effects: { product: 18, customers: 4, mrr: 6_230, team: 4 },
      beats: ["Abrechnung und Zollpapiere im selben System.", "Umsatz je Kunde steigt um ein Drittel, ohne dass jemand verkauft hat."],
    }),
    T({
      id: "usa",
      label: "Nach San Francisco gehen",
      group: "Vertrieb",
      flavour: "Haulway auf dem eigenen Hof besuchen.",
      impact: { umsatz: 4, investoren: 4, geld: 5 },
      cost: 40_000,
      months: 4,
      effects: { burn: 6_000, customers: 5, mrr: 4_450, investors: 8, team: -8 },
      beats: ["Zwei Leute in einem Büro an der Market Street.", "Haulway reagiert binnen sechs Wochen mit einer deutschen Preisliste."],
    }),
    T({
      id: "halten",
      label: "Die Entwicklerin halten",
      group: "Team",
      flavour: "Haulway hat ihr geschrieben. Sie hat es euch gesagt.",
      impact: { team: 5, produkt: 2 },
      months: 1,
      effects: { burn: 1_400, team: 14, product: 6 },
      when: (s: GameState) => s.headcount >= 3,
      beats: ["Sie zeigt euch die Nachricht selbst. Das ist das Signal.", "Mehr Geld, mehr Verantwortung, ESOP. Sie bleibt."],
    }),
    T({
      id: "series-a",
      label: "Series A vorbereiten",
      group: "Geld",
      flavour: "Datenraum, Kohorten, zwölf Erstgespräche.",
      impact: { investoren: 5, team: 2 },
      months: 4,
      effects: { investors: 20, team: -8, customers: -1 },
      beats: ["Zwölf Erstgespräche, drei zweite.", "Vier Monate, in denen niemand verkauft hat. Das steht in euren Zahlen."],
    }),
  ].map((t) => [t.id, t]),
) as Record<string, Tactic>;

/* ── Phasen ──────────────────────────────────────────────────── */

export const MILESTONES: Milestone[] = [
  {
    id: "mvp",
    title: "Baut eine erste Version",
    blurb: "Niemand kauft eine Idee. Ihr braucht etwas, das eine Spedition ausprobieren kann — und sei es eine Tabelle.",
    image: "kitchen-night",
    gate: (s) => s.product >= 40,
    gateLabel: "Etwas, das eine Spedition ausprobieren kann",
    tactics: ["tabelle", "handarbeit", "routing", "richtig-bauen", "jonas-fragen", "durchatmen"],
    next: "kunden",
  },
  {
    id: "kunden",
    title: "Die ersten zahlenden Kunden",
    blurb: "„Interessant“ sagen alle. Erst wenn jemand eine Rechnung bezahlt, wisst ihr, ob es etwas taugt.",
    image: "first-customer",
    gate: (s) => s.mrr > 0 && s.customers >= 2,
    gateLabel: "Zwei Speditionen zahlen jeden Monat",
    tactics: ["pilot", "warme-kontakte", "kaltakquise", "messe", "boerse", "durchatmen"],
    next: "geld",
  },
  {
    id: "geld",
    title: "Fremdes Geld",
    blurb: "Jetzt braucht ihr Geld, das nicht von Kunden kommt — oder so viel Umsatz, dass ihr keins braucht.",
    image: "angel-cafe",
    gate: (s) => s.cash >= 45_000 || s.mrr >= 3_500,
    gateLabel: "45.000 € auf dem Konto oder 3.500 € Umsatz im Monat",
    tactics: ["exist", "aus-umsatz", "wandeldarlehen", "angel-40", "fff", "durchatmen"],
    next: "team",
  },
  {
    id: "team",
    title: "Büro und erste Leute",
    blurb: "Zu zweit schafft ihr zwei Sachen gleichzeitig. Jede weitere Person ist eine mehr.",
    image: "first-hire",
    gate: (s) => s.headcount >= 3 && s.mrr >= 4_000,
    gateLabel: "Drei Leute an Bord und 4.000 € Umsatz im Monat",
    tactics: ["buero", "hire-vertrieb", "hire-eng", "werkstudenten", "ausflug", "durchatmen"],
    next: "seed",
  },
  {
    id: "seed",
    title: "Die Seed-Runde",
    blurb: "Mehrere Investoren wollen rein. Was sie verlangen, unterscheidet sich stärker als das, was sie zahlen.",
    image: "the-round",
    gate: (s) => s.cash >= 400_000 || s.mrr >= 14_000,
    gateLabel: "400.000 € einsammeln — oder 14.000 € Umsatz im Monat",
    tactics: ["anker-vc", "angel-club", "stratege", "runde-schieben", "bruecke", "durchatmen"],
    next: "skalieren",
  },
  {
    id: "skalieren",
    title: "Skalieren",
    blurb: "Mit Geld wachsen ist leicht. Mit Geld wachsen, ohne alles zu verbrennen, ist die Aufgabe.",
    image: "first-hire",
    gate: (s) => s.mrr >= 25_000 || s.investors >= 70,
    gateLabel: "25.000 € Umsatz im Monat — dann kommt die Series A",
    tactics: ["vertrieb-ausbauen", "produkt-tiefer", "usa", "halten", "series-a", "durchatmen"],
    next: null,
  },
];

export const MILESTONE_BY_ID = Object.fromEntries(MILESTONES.map((m) => [m.id, m])) as Record<string, Milestone>;

/* ── Ereignisse ──────────────────────────────────────────────── */

export const EVENTS: GameEvent[] = [
  {
    id: "urlaub",
    title: "Ole ist im Urlaub",
    beats: ["Drei Wochen Kroatien, keine Übergabe.", "Im Hof weiß sonst niemand, wofür Palettio gut ist."],
    effects: { customers: -1, mrr: -890 },
    when: (s) => s.customers >= 2,
  },
  {
    id: "finanzamt",
    title: "Das Finanzamt rechnet nach",
    beats: ["Die Vorauszahlungen werden neu festgesetzt.", "2.400 € gehen raus in einer Woche, die ihr anders geplant hattet."],
    effects: { cash: -2_400 },
    when: (s) => s.mrr > 0,
  },
  {
    id: "dvz",
    title: "Die DVZ schreibt über euch",
    beats: ["Zweihundert Wörter über Leerfahrten, mit eurem Namen.", "Vier Speditionen wollen bis Freitag eine Demo."],
    effects: { customers: 1, mrr: 890, investors: 4 },
  },
  {
    id: "rostock",
    title: "Ein Lkw fährt nach Rostock statt Rotterdam",
    beats: ["Ein Rundungsfehler im Matching, ein verlorener Tag.", "Jonas entschuldigt sich zwei Stunden. Sie bleiben und erzählen es weiter."],
    effects: { customers: -1, mrr: -540, investors: -3 },
    when: (s) => s.customers >= 2,
  },
  {
    id: "professor",
    title: "Dein alter Professor meldet sich",
    beats: ["Er hat euer Einseitenpapier weitergeleitet.", "Am Abend bietet eine Gründerin ein Gespräch mit ihrem Seed-Investor an."],
    effects: { investors: 9 },
  },
  {
    id: "streik",
    title: "Warnstreik am Terminal",
    beats: ["Vier Tage bewegt sich nichts im Hafen.", "Eure Kunden haben diese Woche größere Sorgen."],
    effects: { customers: -1, team: -3 },
    when: (s) => s.customers >= 3,
  },
  {
    id: "server",
    title: "Die Rechnung fürs Matching",
    beats: ["Der nächtliche Lauf ist plötzlich neunmal so teuer.", "Jemand hat eine Schleife drin gelassen. 1.900 €."],
    effects: { cash: -1_900 },
    when: (s) => s.customers >= 2,
  },
  {
    id: "abwerbung",
    title: "Jemand wirbt Jonas ab",
    beats: ["Ein Berliner Series-B-Unternehmen bietet 95.000 €.", "Er sagt ab und erwähnt es zweimal. Du erhöhst seine Entnahme."],
    effects: { burn: 700, team: -4 },
  },
  {
    id: "empfehlung",
    title: "Ein fremder Disponent ruft an",
    beats: ["Sein Schwager führt eine Spedition in Bremen.", "Er unterschreibt ohne Demo."],
    effects: { customers: 1, mrr: 890, cash: 2_670 },
    when: (s) => s.customers >= 3,
  },
  {
    id: "winter",
    title: "Milder Winter",
    beats: ["Die Frachtmengen im Norden gehen zurück.", "Weniger Fahrten heißt weniger für Palettio zu tun."],
    effects: { mrr: -400, investors: -2 },
    when: (s) => s.mrr >= 2_000,
  },
  {
    id: "dsgvo",
    title: "Ein Kunde schickt einen Datenschutz-Fragebogen",
    beats: ["Vierzig Fragen, acht davon ehrlich mit „noch nicht“ zu beantworten.", "Zwei Wochen Arbeit. Der nächste Kunde fragt dasselbe."],
    effects: { product: 4, team: -5 },
    when: (s) => s.customers >= 4,
  },
  {
    id: "krankheit",
    title: "Jonas liegt flach",
    beats: ["Drei Wochen, erst Grippe, dann Nachwirkungen.", "Du machst Vertrieb und Entwicklung gleichzeitig. Beides halb."],
    effects: { team: -8, product: -3, mrr: -300 },
  },
  {
    id: "grosskunde-weg",
    title: "Euer größter Kunde kündigt",
    beats: [
      "Neuer Fuhrparkleiter, alter Lieferant, Mail am Donnerstag um 8:15.",
      "Ein Drittel eures Umsatzes geht mit einem Mann, den ihr nie getroffen habt.",
    ],
    effects: { customers: -2, mrr: -1_780, investors: -5, team: -6 },
    when: (s) => s.customers >= 5,
  },
  {
    id: "engineer-weg",
    title: "Eure Entwicklerin wird abgeworben",
    beats: [
      "Haulway bietet ihr das Doppelte und ein Visum.",
      "Sie geht. Zwei Monate lang weiß niemand mehr, wie das nächtliche Matching wirklich funktioniert.",
    ],
    effects: { headcount: -1, product: -12, team: -10, burn: -8_000 },
    when: (s) => s.headcount >= 3,
  },
  {
    id: "nachverhandeln",
    title: "Der Investor will nachverhandeln",
    beats: [
      "Zwei Wochen vor Unterschrift: die Bewertung sei „im aktuellen Marktumfeld nicht haltbar“.",
      "20 % runter, sonst steigt er aus. Ihr habt sechs Wochen Exklusivität unterschrieben und könnt niemand anderen fragen.",
    ],
    effects: { equity: -6, investors: -4, team: -5 },
    when: (s) => s.cash >= 80_000,
  },
  {
    id: "insolvenz-kunde",
    title: "Eine Spedition geht insolvent",
    beats: [
      "Vierzig Lkw, achtzig Jahre alt, am Dienstag vorläufiger Insolvenzverwalter.",
      "Zwei offene Rechnungen von euch stehen auf der Gläubigerliste ganz unten.",
    ],
    effects: { customers: -1, mrr: -890, cash: -3_400 },
    when: (s) => s.customers >= 4,
  },
  {
    id: "presse-schlecht",
    title: "Ein Disponent schreibt einen Verriss",
    beats: [
      "LinkedIn, 600 Wörter, „nettes Tool für Leute, die nie disponiert haben“.",
      "Er hat in drei Punkten recht. Die Branche liest mit.",
    ],
    effects: { customers: -1, investors: -6, product: 3 },
    when: (s) => s.customers >= 3,
  },
  {
    id: "grosse-anfrage",
    title: "Ein Konzern meldet sich",
    beats: [
      "Zentraleinkauf einer Handelskette, 400 Lkw im Werkverkehr.",
      "Sie wollen ein Pilotprojekt — und einen Fragebogen mit 120 Positionen beantwortet haben.",
    ],
    effects: { customers: 2, mrr: 3_560, team: -8, product: 4 },
    when: (s) => s.customers >= 4 && s.product >= 55,
  },
  {
    id: "altkunde",
    title: "Krämer verlängert um zwölf Monate",
    beats: ["Statt monatlich kündbar jetzt ein Jahresvertrag.", "10.680 € vertraglich zugesagt."],
    effects: { cash: 10_680, investors: 5 },
    when: (s) => s.customers >= 4,
  },
];

/* ── Haulway, San Francisco ──────────────────────────────────── */

export const RIVAL_STEPS: RivalStep[] = [
  {
    at: 25,
    label: "Haulway kommt bei Y Combinator rein",
    beats: [
      "Vier Leute aus San Francisco, derselbe Gedanke, W26-Batch.",
      "500.000 $ und drei Monate Demo-Day-Training. Zwei Investoren von eurer Liste kennen sie schon.",
    ],
    effects: { investors: -6 },
  },
  {
    at: 45,
    label: "Demo Day",
    beats: [
      "Haulway pitcht vor vierhundert Investoren und sammelt 3 Mio. $ ein.",
      "Ihr Blogpost über Leerfahrten in Europa wird in eurer Branche geteilt. Von euren Kunden.",
    ],
    effects: { investors: -5, team: -4 },
  },
  {
    at: 65,
    label: "Haulway eröffnet in Berlin",
    beats: [
      "Zwei Leute, ein WeWork, deutsche Preisliste.",
      "Die Bremer Spedition, um die ihr euch fünf Monate bemüht habt, unterschreibt dort.",
    ],
    effects: { customers: -1, mrr: -890, investors: -7 },
  },
  {
    at: 85,
    label: "Haulway macht eine Series A",
    beats: [
      "18 Mio. $, angeführt von einem Fonds an der Sand Hill Road.",
      "Jedes Investorengespräch beginnt ab jetzt mit derselben Frage, und die handelt nicht von euch.",
    ],
    effects: { investors: -12, team: -6 },
  },
];

/* ── Enden ───────────────────────────────────────────────────── */

export const ENDINGS: Ending[] = [
  {
    id: "insolvent",
    title: "Das Geld ist alle",
    tone: "loss",
    image: "ending-empty",
    text: "Ein Monat, in dem die Gehälter nicht durchgehen, ein Termin beim Steuerberater, und eine Liste von Disponenten, die ihr anrufen müsst, bevor sie es anders erfahren.",
    payout: (s) => `${s.month} Monate. ${Math.round(s.equity)} % von nichts.`,
  },
  {
    id: "split",
    title: "Jonas ist raus",
    tone: "loss",
    image: "ending-empty",
    text: "Vier Gespräche über sechs Wochen, das letzte ist kurz. Er wollte eine andere Firma als die, die ihr gebaut habt.",
    payout: () => "Die halbe Idee war seine. Allein beendest du das hier nicht.",
  },
  {
    id: "outrun",
    title: "Haulway war schneller",
    tone: "loss",
    image: "ending-empty",
    text: "Beim Produkt hat euch niemand geschlagen. Sie hatten Geld, als ihr noch gebaut habt, und einen Namen, als ihr verkaufen wolltet.",
    payout: (s) => `${s.month} Monate, ${s.customers} Kunden, und ein Markt mit einem Marktführer.`,
  },
  {
    id: "seriesa",
    title: "Die Series A steht",
    tone: "win",
    image: "ending-round",
    text: "Ein Fonds aus Berlin führt an, Oltmanns zieht mit. Vierzehn Leute, zwei Länder, und ein Markt, in dem jetzt zwei Firmen ernst genommen werden.",
    payout: (s) =>
      `${fmtEuro(s.mrr)} MRR, ${s.customers} Speditionen, ${Math.round(s.equity)} % bei euch${s.pref === "2x" ? " — bei 2× participating bleibt davon beim mittleren Exit wenig." : "."}`,
  },
  {
    id: "profitabel",
    title: "Es trägt sich",
    tone: "win",
    image: "ending-indie",
    text: "Keine Runde mehr nötig. Genug Speditionen zahlen genug, dass alle Gehälter durchgehen und die Server langweilig sind.",
    payout: (s) => `${fmtEuro(s.mrr)} im Monat von ${s.customers} Kunden, ${Math.round(s.equity)} % gehören euch.`,
  },
  {
    id: "acquihire",
    title: "Gekauft werdet ihr, nicht die Firma",
    tone: "mixed",
    image: "ending-round",
    text: "Eine Frachtbörse übernimmt das Team und schaltet das Produkt nach acht Monaten ab. Ihr habt Verträge mit Bonus, die Kunden eine Mail mit Frist.",
    payout: (s) => `${Math.round(s.equity)} % von einem Preis, bei dem nach den Präferenzen wenig bleibt.`,
  },
  {
    id: "stehen",
    title: "Immer noch da",
    tone: "mixed",
    image: "ending-empty",
    text: "Es läuft, ein paar Speditionen zahlen, und weder der Markt noch ein Investor hat sich zu euch entschieden.",
    payout: (s) => `${s.month} Monate, ${fmtEuro(s.cash)} auf dem Konto, ${s.customers} Kunden, Haulway bei ${Math.round(s.rival)} %.`,
  },
];

export const ENDING_BY_ID = Object.fromEntries(ENDINGS.map((e) => [e.id, e])) as Record<string, Ending>;

export function pickEnding(s: GameState): string {
  if (s.cash <= 0) return "insolvent";
  if (s.alignment <= 0 && s.customers === 0) return "split";
  if (s.rival >= 100 && s.customers < 8) return "outrun";
  if (s.mrr >= 25_000 && s.investors >= 60) return "seriesa";
  if (s.mrr >= 18_000) return "profitabel";
  if (s.equity <= 45 && s.mrr >= 8_000) return "acquihire";
  return "stehen";
}
