/* ══════════════════════════════════════════════════════════════
   Palettio — Inhalt: Phasen, Karten, Ereignisse, Retoura, Enden.

   Acht Phasen vom ersten Verdacht bis zur Series A. In jeder liegt
   ein Deck: jede Karte nennt Dauer und Kosten, nicht ihre Wirkung.
   Was eine Messe bringt, findet man heraus, indem man hingeht.

   Geschrieben wie eine Spedition redet: kurze Sätze, konkrete
   Zahlen, keine Metaphern.
   ══════════════════════════════════════════════════════════════ */

import type { Ending, GameEvent, GameState, Milestone, RivalStep, Tactic } from "./simulator.ts";
import { fmtEuro } from "./simulator.ts";

/* ── Onboarding ──────────────────────────────────────────────
   Sechs Sätze vor dem ersten Zug, wie im Klimakanzler: erst wer
   spricht, dann das Ziel, dann die Bedingung, dann der Druck.
   ────────────────────────────────────────────────────────────── */

export const ONBOARDING: { text: string; highlight?: string }[] = [
  { text: "Moin. Ich bin Tarek, ich berate Gründerinnen beim Starthilfe-Zentrum. Ich begleite dich." },
  { text: "Du bist Lena Brandt, 29, Disponentin in Hamburg. Jede vierte Rückfahrt in deinem Hof ist leer." },
  { text: "Dein Ziel: aus dieser Beobachtung eine Firma machen, die eine Series A schafft.", highlight: "Series A" },
  { text: "Dafür wählst du in jeder Phase eine Maßnahme. Was sie kostet und wie lange sie dauert, steht drauf. Was sie bringt, siehst du danach." },
  { text: "Oben links steht dein Runway in Monaten. Solange du angestellt bist, läuft er nicht. Danach schon." },
  { text: "Und in Rotterdam baut Retoura dasselbe. Die warten nicht auf dich.", highlight: "Retoura" },
];

export const INTRO = {
  image: "day-job",
  who: "Lena Brandt, 29, Disponentin",
  lines: [
    "Jeden Freitag dieselbe Notiz in derselben Datei: Lkw 7 zurück aus Rotterdam, leer. Lkw 12 aus Hannover, leer.",
    "Jede vierte Rückfahrt bringt nichts ein. Deine Firma weiß das und zuckt mit den Schultern.",
    "Du hast 12.400 € gespart, einen Laptop und einen Kollegen namens Jonas, der dir recht gibt.",
  ],
};

/* ── Das Deck ────────────────────────────────────────────────── */

const T = (t: Tactic) => t;

export const TACTICS: Record<string, Tactic> = Object.fromEntries(
  [
    /* 1 · Das Problem */
    T({
      id: "anrufen",
      label: "Sechs andere Speditionen anrufen",
      flavour: "Haben die dieselbe Quote, oder ist es nur dein Hof?",
      months: 2,
      effects: { product: 12, investors: 5 },
      beats: [
        "Vier von sechs haben es nie gemessen. Zwei sagen 28 % und „bestimmt ein Drittel“.",
        "Beide wollen wissen, was du herausfindest. Zwei Disponenten warten jetzt auf eine Mail von dir.",
      ],
    }),
    T({
      id: "mitfahren",
      label: "Eine Woche mitfahren",
      flavour: "Fünf Tage im Lkw, zuhören, was wirklich schiefgeht.",
      months: 1,
      effects: { product: 14, team: 4 },
      beats: [
        "Fünf Tage mit einem Fahrer namens Mesut. Die Hälfte der Probleme sind Wartezeiten, keine Dispo.",
        "Das hättest du aus keiner Tabelle gelesen. Das Produkt wird jetzt anders aussehen.",
      ],
    }),
    T({
      id: "weiterzaehlen",
      label: "Noch ein Quartal zählen",
      flavour: "Drei Monate Freitagabende und eine Datei, die niemand bestellt hat.",
      months: 3,
      effects: { product: 9, investors: 2 },
      beats: [
        "Die Quote hält bei 31 %, aufgeschlüsselt nach Strecke, Wochentag und Kunde.",
        "Belastbarer geht es nicht. Gesehen hat die Zahlen in drei Monaten trotzdem niemand außerhalb deines Büros.",
      ],
    }),
    T({
      id: "chef",
      label: "Dem Chef vorschlagen, es intern zu lösen",
      flavour: "Auf deren Rechnung, in deren Firma.",
      months: 3,
      effects: { cash: 2_000, product: 5, investors: -4 },
      beats: [
        "Er gibt dir 2.000 € und einen Freitagnachmittag pro Woche.",
        "Nach sechs Wochen liegt es „bis nach der Systemumstellung“ auf Eis. Immerhin weißt du jetzt, wie das intern endet.",
      ],
    }),
    T({
      id: "linkedin-post",
      label: "Die Zahl auf LinkedIn posten",
      flavour: "„31 % unserer Rückfahrten liefen letztes Quartal leer.“",
      months: 1,
      effects: { product: 2, investors: 8, team: -3 },
      beats: [
        "Elftausend Aufrufe, vierzig Kommentare, zwei davon von Leuten mit Frachtbörsen.",
        "Dein Geschäftsführer liest es auch. Das Gespräch am Montag ist kurz.",
      ],
    }),

    /* 2 · Jonas */
    T({
      id: "jonas-fragen",
      label: "Jonas fragen, was er eigentlich will",
      flavour: "Ein Abend, eine Frage, keine Entscheidung.",
      months: 1,
      effects: { alignment: 12, team: 5 },
      beats: ["", ""],
      beatsBy: {
        bootstrap: [
          "„Ehrlich? Ich will keine Investoren. Mein Schwager hatte nach anderthalb Jahren ein Board und jeden Tag schlechte Laune.“",
          "Er will, dass sich das selbst trägt. Jedes fremde Geld ab hier kostet dich mehr als Anteile.",
        ],
        venture: [
          "„Wenn wir das machen, dann richtig. Retoura wird Geld aufnehmen, und ich hätte lieber weniger von etwas, das existiert.“",
          "Er will eine Runde. Jeder Monat ohne Investorengespräch ist ein Monat, in dem er sich fragt, wie ernst du es meinst.",
        ],
      },
    }),
    T({
      id: "handschlag",
      label: "Fifty-fifty per Handschlag",
      flavour: "Entschieden in der Zeit, die das Aufschließen des Autos dauert.",
      months: 1,
      effects: { headcount: 1, team: 8, investors: -4, product: 4 },
      beats: [
        "Ihr schlagt auf dem Parkplatz ein. Elf Monate lang ist das die beste Entscheidung von euch beiden.",
        "Nichts steht auf Papier, nichts vestet. Der erste Investor wird fragen, was passiert, wenn einer geht.",
      ],
    }),
    T({
      id: "vesting",
      label: "Fifty-fifty mit Vesting",
      flavour: "Ein unangenehmer Abend und 380 € beim Notar.",
      months: 2,
      effects: { headcount: 1, investors: 12, team: 2, product: 3 },
      beats: [
        "Zwei Abende Gespräch, das keiner führen wollte. Vier Jahre, ein Jahr Cliff.",
        "Jeder, der später auf diese Cap Table schaut, hört bei dieser Seite auf zu lesen. Genau das willst du.",
      ],
    }),
    T({
      id: "sechzig-vierzig",
      label: "Sechzig zu vierzig, du vorn",
      flavour: "Du hast jede Zeile geschrieben. Sag es laut, auf dem Parkplatz, jetzt.",
      months: 2,
      effects: { headcount: 1, investors: 3, team: -8, alignment: -10, product: 3 },
      beats: [
        "Jonas wird still und stimmt dann zu. „Passt schon. Du hast es gebaut.“",
        "Einen Monat lang ist er am Telefon langsamer. Nichts, worauf man zeigen könnte. Beide merkt ihr es.",
      ],
    }),
    T({
      id: "allein",
      label: "Ohne ihn weitermachen",
      flavour: "Alles behalten, alles selbst tragen.",
      months: 2,
      effects: { investors: -8, team: -12, product: 6 },
      beats: [
        "Du sagst ihm, du willst es erst allein versuchen. Er nimmt es besser auf, als du verdient hast.",
        "Du behältst jeden Anteil und verlierst den, der dich in jeden Hof bringt. Jede Vertriebskarte spielst du ab jetzt selbst.",
      ],
    }),

    /* 3 · Der Prototyp */
    T({
      id: "tabelle",
      label: "Eine Tabelle mit Makro",
      flavour: "Zwei Wochenenden. Freitags lässt du es von Hand laufen.",
      months: 1,
      effects: { product: 18, investors: -2 },
      beats: [
        "Zwei Spalten, ein Knopf, ein Makro, das Vorschläge ausspuckt. Es sieht aus wie das, was es ist.",
        "Ole Wendt bei Krämer findet am zweiten Dienstag eine Rückladung für Lkw 7.",
      ],
    }),
    T({
      id: "richtig-bauen",
      label: "Es richtig bauen",
      flavour: "Login, Karte, Live-Positionen, Matching-Engine. Monate von Nächten.",
      months: 5,
      effects: { product: 32, investors: 6, team: -5 },
      beats: [
        "Fünf Monate von 22 bis 1 Uhr. Die Demo sieht gut aus, Jonas nennt sie „fast professionell“.",
        "Fünf Monate, in denen kein Disponent es angefasst hat. Deine Annahmen sind jetzt alt und ungeprüft.",
      ],
    }),
    T({
      id: "handarbeit",
      label: "Von Hand machen, Software nennen",
      flavour: "Sie schicken ihre Leerfahrten. Vierzig Minuten später kommt ein Treffer zurück.",
      months: 2,
      effects: { product: 24, team: -6, burn: 150 },
      beats: [
        "Ole hält es für ein System. Es ist dein Laptop, dein Küchentisch, jeden Morgen um 6:40.",
        "In sechs Wochen lernst du, was das Matching wirklich können muss. Abende hast du keine mehr.",
      ],
    }),
    T({
      id: "teilzeit",
      label: "Auf vier Tage reduzieren",
      flavour: "Dein Arbeitgeber sagt schneller ja, als du gedacht hast.",
      months: 2,
      effects: { salary: -600, product: 8, team: -3 },
      beats: [
        "Ein Tag pro Woche offiziell für Palettio. Praktisch der Tag, auf den alles andere verschoben wird.",
        "Du behältst den größten Teil des Gehalts und kaufst dir einen echten Arbeitstag.",
      ],
    }),
    T({
      id: "kuendigen",
      label: "Kündigen",
      flavour: "Drei Monate Frist, danach kommt am 28. nichts mehr.",
      months: 3,
      effects: { salaryTo: 0, burn: 800, product: 10, investors: 10, team: 5 },
      alignmentBy: { bootstrap: -4, venture: 8 },
      beats: [
        "Dein Chef nimmt es anständig auf und fragt, ob er Kunde werden kann. Jonas kündigt in derselben Woche.",
        "Ab jetzt kommt am 28. nichts mehr. Die Zahl oben links bedeutet ab heute etwas.",
      ],
    }),
    T({
      id: "routing",
      label: "Routing-Engine einkaufen",
      flavour: "Die schwierige Geometrie hat jemand anders schon gelöst.",
      cost: 4_200,
      months: 2,
      effects: { product: 22, burn: 340 },
      beats: [
        "Sechs Wochen statt sechs Monate, dafür jeden Monat eine Lizenzgebühr.",
        "Der zugekaufte Teil ist der, den Investoren für deinen halten. Das kommt in jeder technischen Prüfung hoch.",
      ],
    }),

    /* 4 · Der erste Kunde */
    T({
      id: "pilot",
      label: "Vier Wochen bei Ole Wendt",
      flavour: "Achtzehn Lkw, kein Budget, keine Geduld.",
      months: 3,
      effects: { customers: 1, mrr: 890, product: 12, investors: 4 },
      beats: [
        "Fünf Tage neben ihm im Container, dann drei Wochen, in denen er es ohne Aufforderung benutzt.",
        "Er unterschreibt für 890 € im Monat und erzählt es dem Hof nebenan.",
      ],
    }),
    T({
      id: "warme-kontakte",
      label: "Die warmen Kontakte anschreiben",
      flavour: "Zwanzig Leute, die deinen Namen schon kennen.",
      months: 1,
      effects: { customers: 1, mrr: 890, investors: 2 },
      when: (s: GameState) => s.product >= 30,
      beats: [
        "Zwanzig Nachrichten, neun Antworten, drei Telefonate, ein Ja — von jemandem aus einer Fortbildung 2021.",
        "Der billigste Kunde deines Lebens. Von dieser Sorte Mensch gibt es genau zwanzig.",
      ],
    }),
    T({
      id: "kaltakquise",
      label: "Die Hofliste kalt durchtelefonieren",
      flavour: "Zweihundert Nummern, von oben nach unten.",
      months: 2,
      effects: { product: 8, customers: 1, mrr: 540, team: -10 },
      beats: [
        "Zweihundert Anrufe, sechs Demos, eine Unterschrift zum Sonderpreis, weil du keine Lust mehr hattest zu fragen.",
        "Mitgenommen hast du die Einwandliste: vier Sätze, die diese Gespräche beenden. Drei davon kannst du wegkonstruieren.",
      ],
    }),
    T({
      id: "messe",
      label: "Stand auf der transport logistic",
      flavour: "Vier Tage München. Vierzig Gespräche, vor Ort unterschreibt niemand.",
      cost: 6_500,
      months: 4,
      effects: { customers: 2, mrr: 1_780, investors: 8, team: -4 },
      when: (s: GameState) => s.rival < 45,
      beats: [
        "Vier Tage auf den Beinen. Vierzig echte Gespräche, elf Karten, ein Disponent aus Bremen, der vierzig Minuten bleibt.",
        "Zwei unterschreiben im Quartal danach. Es hat 6.500 € und vier Monate gekostet.",
      ],
    }),
    T({
      id: "boerse",
      label: "Frachtbörse für Empfehlungen bezahlen",
      flavour: "Deren Vertrieb hat die Beziehungen schon.",
      cost: 3_000,
      months: 2,
      effects: { customers: 2, mrr: 1_400, investors: -3 },
      beats: [
        "Zwei Unterschriften in acht Wochen, zu einem Preis, den deren Vertrieb verhandelt hat, nicht du.",
        "Es funktioniert genau einmal. Sie wollen an allem mitverdienen, die zweite Charge wäre teurer als ihr Ertrag.",
      ],
    }),
    T({
      id: "feier-erste-rechnung",
      label: "Die erste Rechnung feiern",
      flavour: "Lange Tafel, guter Wein, Ole kommt auch.",
      cost: 800,
      months: 1,
      effects: { team: 18, investors: 1 },
      when: (s: GameState) => s.mrr > 0,
      beats: [
        "Zwölf Leute über einer Kneipe in Ottensen. Ole bringt seinen Nachtschicht-Disponenten mit, der Meinungen zur 5:30-Liste hat.",
        "In dem Monat ist nichts ausgeliefert worden. Zwei Jahre später erzählen alle, die dabei waren, noch davon.",
      ],
    }),

    /* 5 · Das erste Geld */
    T({
      id: "exist",
      label: "EXIST-Gründerstipendium beantragen",
      flavour: "Elf Wochen Formulare. Dein alter Professor würde die Hochschule stellen.",
      months: 4,
      effects: { cash: 32_000, investors: 4, burn: 900, headcount: 1 },
      alignmentBy: { bootstrap: 8, venture: -4 },
      beats: [
        "Elf Wochen Formulare, eine Präsentation in Lüneburg, Bescheid im März.",
        "32.000 € über zwölf Monate, und niemand bekommt Anteile. Billigeres Geld gibt es in dieser Geschichte nicht.",
      ],
    }),
    T({
      id: "angel-40",
      label: "Oltmanns' 100.000 € für 40 % nehmen",
      flavour: "Er hat 2014 eine Frachtbörse verkauft und will bis Freitag eine Antwort.",
      months: 1,
      effects: { cash: 100_000, equity: -40, investors: -8 },
      alignmentBy: { bootstrap: -18, venture: 6 },
      beats: [
        "Freitag ist das Geld da. Zum ersten Mal ist die Zahl auf dem Konto nicht beängstigend.",
        "Vierzig Prozent in der ersten Runde. Jeder spätere Investor muss eine Firma bewerten, deren Gründer schon halb draußen sind.",
      ],
    }),
    T({
      id: "wandeldarlehen",
      label: "Oltmanns ein Wandeldarlehen anbieten",
      flavour: "Sein Geld jetzt, der Preis bei der nächsten Runde.",
      months: 2,
      effects: { cash: 100_000, equity: -11, investors: 3 },
      alignmentBy: { bootstrap: -6, venture: 8 },
      beats: [
        "100.000 € als Wandeldarlehen: 20 % Discount, 4 Mio. Cap, wandelt bei der nächsten Preisrunde.",
        "Niemand musste heute festlegen, was Palettio wert ist. Verschoben ist nicht vermieden — er wandelt beim Seed.",
      ],
    }),
    T({
      id: "aus-umsatz",
      label: "Aus Speditionsgeld finanzieren",
      flavour: "Kein Deck, keine Termine. Dreißig Gespräche.",
      months: 3,
      effects: { customers: 3, mrr: 2_300, team: -6 },
      alignmentBy: { bootstrap: 10, venture: -8 },
      beats: [
        "Drei Monate verkaufen, drei Höfe mehr am Netz, ein Rechnungslauf, der Server und ein Gehalt deckt.",
        "Umsatz kostet keine Anteile. Er kostet drei Monate, in denen das Produkt stand und Retoura nicht.",
      ],
    }),
    T({
      id: "fff",
      label: "Friends-and-Family-Runde",
      flavour: "Dein Onkel, Jonas' Schwager, je 8.000 €.",
      months: 2,
      effects: { cash: 24_000, equity: -6, investors: -2, team: -4 },
      beats: [
        "Drei Leute, die das nicht beurteilen können, unterschreiben, weil sie dich beurteilen können.",
        "Das schnellste Geld, das es gibt. Und die einzige Sorte, bei der eine Down-Round Weihnachten schwierig macht.",
      ],
    }),

    /* 6 · Büro und erster Hire */
    T({
      id: "buero",
      label: "Zwei Räume in Ottensen mieten",
      flavour: "48 m², Altbau, Hinterhof, ab dem Ersten.",
      cost: 2_400,
      months: 1,
      effects: { burn: 1_250, team: 12, investors: 3 },
      beats: [
        "48 Quadratmeter, zwei Räume, eine Küche, die ihr euch mit einer Grafikerin teilt.",
        "Die Küche ist der Grund, warum ab jetzt Dinge besprochen werden, die vorher niemand angesprochen hat.",
      ],
    }),
    T({
      id: "hire-vertrieb",
      label: "Jemanden für den Vertrieb einstellen",
      flavour: "Marie, kommt von einer Frachtbörse, kennt die halbe Branche.",
      months: 2,
      effects: { burn: 7_500, headcount: 1, customers: 3, mrr: 2_670, investors: 5 },
      beats: [
        "Marie kennt die Disponenten in Niedersachsen beim Vornamen.",
        "Sie kostet ab Tag eins 7.500 € und schließt drei Monate lang nichts ab. Diese Lücke ist das ganze Risiko.",
      ],
    }),
    T({
      id: "hire-eng",
      label: "Eine Entwicklerin einstellen",
      flavour: "Damit das Matching nachts läuft und nicht, wenn du dran denkst.",
      months: 2,
      effects: { burn: 8_000, headcount: 1, product: 20, customers: 1, mrr: 890 },
      beats: [
        "Das Matching läuft um 4 Uhr, jeden Tag. Die Rostock-Klasse von Fehlern verschwindet.",
        "Die Kunden merken es in drei Wochen. In den Zahlen, die Investoren lesen, steht es in sechs Monaten.",
      ],
    }),
    T({
      id: "werkstudenten",
      label: "Zwei Werkstudenten",
      flavour: "Zusammen 1.900 € im Monat, kündbar zum Semester.",
      months: 1,
      effects: { burn: 1_900, customers: 1, mrr: 890, team: -3 },
      beats: [
        "Sie übernehmen Onboarding-Telefonate und die Datenpflege, die keiner machen will.",
        "Billig und kündbar. Beide sind weg, bevor das, was sie gelernt haben, wichtig wird.",
      ],
    }),
    T({
      id: "betriebsausflug",
      label: "Einen Tag rausfahren, alle zusammen",
      flavour: "Kutter nach Finkenwerder, niemand redet über Roadmaps.",
      cost: 600,
      months: 1,
      effects: { team: 16 },
      when: (s: GameState) => s.headcount >= 3,
      beats: [
        "Kutter, Fischbrötchen, drei Stunden Regen. Marie erzählt, warum sie bei der Frachtbörse aufgehört hat.",
        "Ihr seid danach eine Firma und nicht mehr vier Leute mit demselben Kalender.",
      ],
    }),

    /* 7 · Die Seed-Runde */
    T({
      id: "anker-vc",
      label: "Anker-VC: 2,5 Mio. auf 10 Mio. pre",
      flavour: "Großer Fonds aus München. Boardsitz, Exklusivität, 2× participating.",
      months: 4,
      effects: { cash: 2_500_000, equity: -22, investors: 12, burn: 3_000 },
      alignmentBy: { bootstrap: -12, venture: 10 },
      beats: [
        "Sechs Wochen Exklusivität, vier Wochen Due Diligence, ein Term Sheet mit 2× participating und einem Boardsitz.",
        "Das Geld reicht für drei Jahre. Beim mittleren Exit holen sie ihre 2,5 Mio. doppelt raus, bevor ihr irgendetwas seht.",
      ],
    }),
    T({
      id: "angel-club",
      label: "Angel-Club: 800.000 €, 1× non-participating",
      flavour: "Neun Leute, einer spricht. Kein Boardsitz.",
      months: 3,
      effects: { cash: 800_000, equity: -15, investors: 6, burn: 500 },
      alignmentBy: { bootstrap: 4, venture: 2 },
      beats: [
        "Neun Angels, ein Sprecher, ein Term Sheet auf zwei Seiten. 1× non-participating, kein Board, pro rata.",
        "Weniger Geld und saubere Bedingungen. Dafür musst du in achtzehn Monaten wieder los.",
      ],
    }),
    T({
      id: "stratege",
      label: "Strategischer Investor: eine Frachtbörse",
      flavour: "Geld und Zugang zu 4.000 Speditionen. Und ein Vorkaufsrecht.",
      months: 3,
      effects: { cash: 1_200_000, equity: -18, customers: 6, mrr: 5_340, investors: -6 },
      beats: [
        "1,2 Mio. und ihr Vertrieb öffnet dir vierzig Türen im ersten Quartal.",
        "Im Vertrag steht ein Vorkaufsrecht. Jeder spätere Käufer weiß, dass er gegen sie bieten müsste — die meisten bieten dann gar nicht.",
      ],
    }),
    T({
      id: "runde-schieben",
      label: "Die Runde schieben, erst Umsatz machen",
      flavour: "Sechs Monate, bessere Zahlen, schlechtere Nerven.",
      months: 6,
      effects: { customers: 4, mrr: 3_560, investors: -8 },
      alignmentBy: { bootstrap: 8, venture: -10 },
      beats: [
        "Sechs Monate verkaufen statt pitchen. Der Umsatz steigt, die Bewertung wäre jetzt höher.",
        "Zwei der drei interessierten Fonds haben in der Zwischenzeit woanders investiert. In dieser Branche.",
      ],
    }),
    T({
      id: "bruecke",
      label: "Brücke von Oltmanns nehmen",
      flavour: "150.000 €, wandelt beim nächsten Preis, ein Telefonat.",
      months: 1,
      effects: { cash: 150_000, equity: -5, investors: -3 },
      beats: [
        "Ein Sonntagstelefonat, zwei Seiten, 150.000 €.",
        "Eine Wette darauf, dass sechs Monate mehr einen besseren Preis bringen. Wenn nicht, sitzt du mit weniger Anteilen am selben Tisch.",
      ],
    }),

    /* 8 · Nach der Runde */
    T({
      id: "vertrieb-ausbauen",
      label: "Drei Leute für den Vertrieb einstellen",
      flavour: "Marie baut ein Team. Das Geld ist ja da.",
      months: 3,
      effects: { burn: 19_000, headcount: 3, customers: 12, mrr: 10_680, team: -6 },
      beats: [
        "Drei Einstellungen in acht Wochen, zwei davon über Marie.",
        "Die Burn-Rate verdreifacht sich an einem Tag. Ab jetzt rechnest du in Quartalen, nicht in Monaten.",
      ],
    }),
    T({
      id: "international",
      label: "Nach Rotterdam gehen",
      flavour: "Retoura auf dem eigenen Hof besuchen.",
      cost: 40_000,
      months: 4,
      effects: { burn: 6_000, customers: 5, mrr: 4_450, investors: 8, team: -8 },
      beats: [
        "Ein Büro mit zwei Leuten in Rotterdam. Die ersten fünf Kunden kommen schneller als gedacht.",
        "Retoura reagiert innerhalb von sechs Wochen mit einer deutschen Preisliste.",
      ],
    }),
    T({
      id: "produkt-tiefer",
      label: "Das Produkt tiefer machen statt breiter",
      flavour: "Abrechnung, Zoll, Telematik. Alles, was sie ohnehin machen.",
      months: 4,
      effects: { product: 18, customers: 4, mrr: 6_230, team: 4 },
      beats: [
        "Abrechnung und Zollpapiere im selben System. Die Kunden hören auf, zwischen Fenstern zu wechseln.",
        "Der Umsatz je Kunde steigt um ein Drittel, ohne dass jemand neu verkauft hat.",
      ],
    }),
    T({
      id: "schlüssel-halten",
      label: "Die Entwicklerin halten",
      flavour: "Retoura hat ihr geschrieben. Sie hat es dir gesagt.",
      months: 1,
      effects: { burn: 1_400, team: 14, product: 6 },
      when: (s: GameState) => s.headcount >= 3,
      beats: [
        "Sie zeigt dir die Nachricht selbst. Das ist das Signal, nicht die Nachricht.",
        "Mehr Geld, mehr Verantwortung, ein Anteil am ESOP. Sie bleibt — und erzählt es im Team weiter.",
      ],
    }),
    T({
      id: "series-a-vorbereiten",
      label: "Die Series A vorbereiten",
      flavour: "Datenraum, Kohortenanalyse, zwölf Gespräche.",
      months: 4,
      effects: { investors: 20, team: -8, customers: -1 },
      beats: [
        "Datenraum, Kohorten, Churn-Analyse nach Flottengröße. Zwölf Erstgespräche, drei zweite.",
        "Vier Monate, in denen niemand verkauft hat. Genau das lesen die Fonds in deinen Zahlen.",
      ],
    }),
  ].map((t) => [t.id, t]),
) as Record<string, Tactic>;

/* ── Die Phasen ──────────────────────────────────────────────── */

export const MILESTONES: Milestone[] = [
  {
    id: "problem",
    title: "Das Problem",
    blurb: "Ein Problem ist noch keine Firma. Erst musst du wissen, ob es andere auch haben.",
    image: "day-job",
    gate: (s) => s.product >= 15,
    gateLabel: "Das Problem gut genug verstehen, um dafür zu bauen",
    tactics: ["anrufen", "mitfahren", "weiterzaehlen", "chef", "linkedin-post"],
    next: "cofounder",
  },
  {
    id: "cofounder",
    title: "Jonas will mitmachen",
    blurb: "Neun Jahre Dispo, kennt die halbe Strecke zwischen Hamburg und Bremen. Und hat eine Meinung, die er nicht ausspricht.",
    image: "kitchen-night",
    gate: (s) => s.headcount >= 2 || s.used.includes("allein"),
    gateLabel: "Klären, wie ihr zwei das macht",
    tactics: ["jonas-fragen", "vesting", "handschlag", "sechzig-vierzig", "allein"],
    next: "prototyp",
  },
  {
    id: "prototyp",
    title: "Etwas zum Anklicken",
    blurb: "Auf eine Beschreibung kann niemand reagieren. Du brauchst das Kleinste, das öffentlich falsch sein kann.",
    image: "kitchen-night",
    gate: (s) => s.product >= 40,
    gateLabel: "Etwas, das ein Disponent an einem Dienstag benutzen kann",
    tactics: ["tabelle", "handarbeit", "teilzeit", "kuendigen", "routing", "richtig-bauen"],
    next: "kunde",
  },
  {
    id: "kunde",
    title: "Die erste Rechnung",
    blurb: "Interesse ist gratis. Sobald du Geld verlangst, weißt du, was es wert war.",
    image: "first-customer",
    gate: (s) => s.mrr > 0 && s.customers >= 2,
    gateLabel: "Zwei Speditionen, die jeden Monat zahlen",
    onEnter: {
      title: "Dein Arbeitgeber hat davon gehört",
      when: (s) => s.salary > 0,
      beats: [
        "Krämers Disponent hat es beim Regionaltreffen deinem Geschäftsführer erzählt. Das Gespräch am Montag dauert vier Minuten und ist höflich.",
        "Am 28. kommt kein Gehalt mehr. Die Zahl oben links war bis heute Morgen Dekoration.",
      ],
      effects: { salaryTo: 0, burn: 700, investors: 4, team: -5 },
    },
    tactics: ["pilot", "warme-kontakte", "kaltakquise", "messe", "boerse", "feier-erste-rechnung"],
    next: "geld",
  },
  {
    id: "geld",
    title: "Fremdes Geld",
    blurb: "Es kommt mit Bedingungen, und die Bedingungen überleben das Geld.",
    image: "angel-cafe",
    gate: (s) => s.cash >= 45_000 || s.mrr >= 3_500,
    gateLabel: "Genug auf dem Konto oder genug Umsatz für das nächste Jahr",
    tactics: ["exist", "aus-umsatz", "wandeldarlehen", "angel-40", "fff"],
    next: "buero",
  },
  {
    id: "buero",
    title: "Büro und erste Leute",
    blurb: "Ab hier ist es kein Projekt mehr. Ab hier hängen andere Leute mit drin.",
    image: "first-hire",
    gate: (s) => s.headcount >= 3 && s.mrr >= 4_000,
    gateLabel: "Mindestens drei auf der Gehaltsliste und 4.000 € MRR",
    tactics: ["buero", "hire-vertrieb", "hire-eng", "werkstudenten", "betriebsausflug"],
    next: "seed",
  },
  {
    id: "seed",
    title: "Die Seed-Runde",
    blurb: "Drei Wege, dasselbe Geld zu bekommen. Die Bedingungen unterscheiden sich mehr als die Summen.",
    image: "the-round",
    gate: (s) => s.cash >= 400_000 || s.mrr >= 14_000,
    gateLabel: "Eine Runde abschließen — oder ohne eine weiterkommen",
    tactics: ["anker-vc", "angel-club", "stratege", "runde-schieben", "bruecke"],
    next: "skalieren",
  },
  {
    id: "skalieren",
    title: "Skalieren",
    blurb: "Das Geld ist da. Jetzt entscheidet sich, ob daraus eine Firma wird oder ein teures Jahr.",
    image: "first-hire",
    gate: (s) => s.mrr >= 25_000 || s.investors >= 70,
    gateLabel: "25.000 € MRR oder eine Series A in Reichweite",
    tactics: ["vertrieb-ausbauen", "produkt-tiefer", "international", "schlüssel-halten", "series-a-vorbereiten"],
    next: null,
  },
];

export const MILESTONE_BY_ID = Object.fromEntries(MILESTONES.map((m) => [m.id, m])) as Record<string, Milestone>;

/* ── Ereigniskarten ──────────────────────────────────────────── */

export const EVENTS: GameEvent[] = [
  {
    id: "urlaub",
    title: "Ole ist im Urlaub",
    beats: [
      "Drei Wochen Kroatien, keine Übergabe.",
      "Im Hof weiß sonst niemand, wofür Palettio gut ist. Die Nutzung geht auf null.",
    ],
    effects: { customers: -1, mrr: -890 },
    when: (s) => s.customers >= 2,
  },
  {
    id: "finanzamt",
    title: "Das Finanzamt rechnet nach",
    beats: [
      "Die Vorauszahlungen für letztes Jahr werden neu festgesetzt.",
      "2.400 € gehen in einer Woche raus, die du anders geplant hattest.",
    ],
    effects: { cash: -2_400 },
  },
  {
    id: "dvz",
    title: "Die DVZ schreibt über euch",
    beats: [
      "Zweihundert Wörter über Leerfahrten, mit eurem Namen drin.",
      "Vier Speditionen wollen bis Freitag eine Demo.",
    ],
    effects: { customers: 1, mrr: 890, investors: 4 },
  },
  {
    id: "rostock",
    title: "Ein Lkw fährt nach Rostock statt Rotterdam",
    beats: [
      "Ein Rundungsfehler im Matching, eine falsche Zuordnung, ein verlorener Tag.",
      "Jonas entschuldigt sich zwei Stunden lang. Sie bleiben, und sie erzählen es weiter.",
    ],
    effects: { customers: -1, mrr: -540, investors: -3 },
    when: (s) => s.customers >= 2,
  },
  {
    id: "professor",
    title: "Dein alter Professor meldet sich",
    beats: [
      "Er hat dein Einseitenpapier an eine Gründerin von 2016 weitergeleitet.",
      "Sie antwortet am selben Abend und bietet ein Gespräch mit ihrem Seed-Investor an.",
    ],
    effects: { investors: 9 },
  },
  {
    id: "streik",
    title: "Warnstreik am Terminal",
    beats: [
      "Vier Tage bewegt sich nichts im Hafen.",
      "Deine Kunden haben diese Woche größere Sorgen als dein Onboarding-Termin.",
    ],
    effects: { customers: -1, team: -3 },
    when: (s) => s.customers >= 3,
  },
  {
    id: "server",
    title: "Die Rechnung fürs Matching",
    beats: [
      "Der nächtliche Lauf ist plötzlich neunmal so teuer.",
      "Jemand hat eine Schleife drin gelassen. Es kostet 1.900 €, bis es auffällt.",
    ],
    effects: { cash: -1_900 },
  },
  {
    id: "abwerbung",
    title: "Jemand wirbt Jonas ab",
    beats: [
      "Ein Berliner Series-B-Unternehmen bietet ihm 95.000 €.",
      "Er sagt ab und erwähnt es zweimal. Du erhöhst seine Entnahme, was ohnehin überfällig war.",
    ],
    effects: { burn: 700, team: -4 },
    when: (s) => s.headcount >= 2,
  },
  {
    id: "empfehlung",
    title: "Ein Disponent, den du nie getroffen hast, ruft an",
    beats: [
      "Sein Schwager führt eine Spedition in Bremen.",
      "Er unterschreibt ohne Demo, weil jemand, dem er vertraut, die Demo schon gesehen hat.",
    ],
    effects: { customers: 1, mrr: 890, cash: 2_670 },
    when: (s) => s.customers >= 3,
  },
  {
    id: "winter",
    title: "Milder Winter",
    beats: [
      "Die Frachtmengen im Norden gehen zurück.",
      "Weniger Fahrten heißt weniger für Palettio zu tun. Die Nutzungszahlen zeigen es.",
    ],
    effects: { mrr: -400, investors: -2 },
    when: (s) => s.mrr >= 2_000,
  },
  {
    id: "dsgvo",
    title: "Ein Kunde schickt einen Datenschutz-Fragebogen",
    beats: [
      "Vierzig Fragen, davon acht, die ihr ehrlich mit „noch nicht“ beantworten müsst.",
      "Zwei Wochen Arbeit, keine neue Funktion. Dafür fragt der nächste Kunde dasselbe und ihr habt es liegen.",
    ],
    effects: { product: 4, team: -5 },
    when: (s) => s.customers >= 4,
  },
  {
    id: "krankheit",
    title: "Jonas liegt flach",
    beats: [
      "Drei Wochen, erst Grippe, dann Nachwirkungen.",
      "Du machst Vertrieb und Entwicklung gleichzeitig. Beides nur halb.",
    ],
    effects: { team: -8, product: -3, mrr: -300 },
    when: (s) => s.headcount >= 2,
  },
  {
    id: "altkunde",
    title: "Krämer verlängert um zwölf Monate",
    beats: [
      "Statt monatlich kündbar jetzt ein Jahresvertrag.",
      "10.680 € vertraglich zugesagt. Zum ersten Mal verpflichtet sich jemand im Voraus.",
    ],
    effects: { cash: 10_680, investors: 5 },
    when: (s) => s.customers >= 4,
  },
];

/* ── Retoura ─────────────────────────────────────────────────── */

export const RIVAL_STEPS: RivalStep[] = [
  {
    at: 25,
    label: "Retoura nimmt eine Pre-Seed",
    beats: [
      "250.000 € von einem Angel aus Rotterdam, der früher eine Reederei geführt hat.",
      "Zwei Investoren von deiner Liste antworten jetzt mit einem Satz: Sie schauen sich das Feld schon an.",
    ],
    effects: { investors: -6 },
  },
  {
    at: 45,
    label: "Retoura hat den Messestand",
    beats: [
      "Der Hallenplan der transport logistic kommt raus. Halle B, Stand 214, Retoura.",
      "Das war dein Stand. Übrig ist die Halle, durch die niemand läuft.",
    ],
    effects: { investors: -4, team: -4 },
  },
  {
    at: 65,
    label: "Retoura holt die 90-Lkw-Spedition",
    beats: [
      "Die Bremer Spedition, um die du dich fünf Monate bemüht hast, unterschreibt bei Retoura.",
      "Ihr Disponent ruft selbst an, um es zu sagen. Retoura hatte eine Woche lang jemanden vor Ort.",
    ],
    effects: { customers: -1, mrr: -890, investors: -7 },
  },
  {
    at: 85,
    label: "Retoura schließt eine Series A",
    beats: [
      "6 Mio., angeführt von einem Fonds aus Amsterdam. In der Mitteilung steht „Marktführer“.",
      "Jedes Investorengespräch ab jetzt beginnt mit derselben Frage, und die handelt nicht von dir.",
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
    text: "Keine große Szene. Ein Monat, in dem die Gehälter nicht durchgehen, ein Termin beim Steuerberater darüber, wozu du jetzt verpflichtet bist, und eine Liste von Disponenten, die du anrufen musst, bevor sie es anders erfahren.",
    payout: (s) => `${s.month} Monate ab dem ersten Freitag, an dem du gezählt hast. ${Math.round(s.equity)} % von nichts.`,
  },
  {
    id: "split",
    title: "Jonas ist raus",
    tone: "loss",
    image: "ending-empty",
    text: "Es passiert nicht in einem Gespräch, sondern in vieren über sechs Wochen. Das letzte ist kurz. Er wollte eine andere Firma als die, die du gebaut hast, und keiner von euch hat das gesagt, solange es noch eine Frage war.",
    payout: () => "Die halbe Idee war seine. Allein beendest du das hier nicht.",
  },
  {
    id: "outrun",
    title: "Retoura war schneller",
    tone: "loss",
    image: "ending-empty",
    text: "Niemand hat euch beim Produkt geschlagen. Sie waren in den Höfen, während ihr gebaut habt, und haben Geld aufgenommen, während ihr überlegt habt. Als ihr etwas zu verkaufen hattet, war jeder Disponent im Norden schon besucht.",
    payout: (s) => `${s.month} Monate, ${s.customers} Kunden, und ein Markt mit einem Marktführer darin.`,
  },
  {
    id: "seriesa",
    title: "Die Series A steht",
    tone: "win",
    image: "ending-round",
    text: "Ein Fonds aus Berlin führt an, Oltmanns zieht mit, der Anker aus dem Seed nimmt seine Quote. Vierzehn Leute, zwei Länder, und ein Markt, in dem jetzt zwei Firmen ernst genommen werden statt einer.",
    payout: (s) =>
      `${fmtEuro(s.mrr)} MRR, ${s.customers} Speditionen, ${Math.round(s.equity)} % noch bei euch${s.pref === "2x" ? " — bei 2× participating ist davon beim mittleren Exit wenig übrig." : "."}`,
  },
  {
    id: "profitabel",
    title: "Es trägt sich",
    tone: "win",
    image: "ending-indie",
    text: "Keine Runde mehr nötig. Genug Speditionen zahlen genug, dass alle Gehälter durchgehen und die Server langweilig sind. Ole öffnet die 5:30-Liste immer noch jeden Morgen.",
    payout: (s) => `${fmtEuro(s.mrr)} im Monat von ${s.customers} Kunden, ${Math.round(s.equity)} % gehören euch.`,
  },
  {
    id: "acquihire",
    title: "Ihr werdet gekauft, nicht die Firma",
    tone: "mixed",
    image: "ending-round",
    text: "Eine Frachtbörse übernimmt das Team und schaltet das Produkt nach acht Monaten ab. Ihr habt beide Verträge mit Bonus, und die Kunden bekommen eine Mail mit einer Frist.",
    payout: (s) => `${Math.round(s.equity)} % von einem Preis, bei dem nach den Präferenzen wenig übrig bleibt.`,
  },
  {
    id: "stehen",
    title: "Immer noch da",
    tone: "mixed",
    image: "ending-empty",
    text: "Es läuft, ein paar Speditionen zahlen, und weder der Markt noch irgendein Investor hat sich zu euch entschieden. Das ist kein Scheitern. Es ist die häufigste Stelle, an der man nach ein paar Jahren steht, und die schwierigste, von der aus man plant.",
    payout: (s) => `${s.month} Monate, ${fmtEuro(s.cash)} auf dem Konto, ${s.customers} Kunden, Retoura bei ${Math.round(s.rival)} %.`,
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
