/* ══════════════════════════════════════════════════════════════
   Palettio — Inhalt.

   Sechs Phasen. In jeder liegt eine Liste von Maßnahmen, nach Gruppen
   sortiert. Jede Karte zeigt auf Tap eine Detailkarte: wer sie macht,
   wie lange sie dauert, was sie kostet, was sie bewegt — und warum
   sie wehtut.

   Zwei Gründer mit zwei Fächern: Lena baut, Jonas verkauft. Jeder
   kann an einer Sache gleichzeitig arbeiten, und nur an seiner. Daraus
   kommt die Spannung, um die es in diesem Spiel geht: Jonas kann
   verkaufen, was es noch nicht gibt, und Lena kann fünf Monate bauen,
   was niemand bestellt hat.

   Texte sind kurz. Wer spielt, will nicht lesen.
   ══════════════════════════════════════════════════════════════ */

import type {
  Angebot,
  Ending,
  Entscheidung,
  Erfolg,
  GameEvent,
  GameState,
  Milestone,
  RivalStep,
  Tactic,
} from "./simulator.ts";
import { arr, erloes, fmtEuro, MARKT_VIELFACHES, saldo, UEBERHOLT } from "./simulator.ts";

export const ONBOARDING: { text: string; highlight?: string }[] = [
  {
    text: "Moin. Ich bin Tarek. Ich habe vor vier Jahren meine Firma für Hafensoftware verkauft und berate seitdem Leute wie euch. Ich schau euch über die Schulter.",
  },
  {
    text: "Ihr zwei habt bei derselben Spedition gekündigt. Jonas hat dort Lkw eingeteilt — Disponent nennt man das. Du, Lena, hast die IT betreut.",
    highlight: "Disponent",
  },
  {
    text: "Aufgefallen ist es Jonas: jede vierte Fahrt kommt leer zurück, weil niemand Zeit hat, für die Rückfahrt eine Ladung zu suchen. Das will eure Software automatisch finden.",
  },
  {
    text: "Jonas verkauft, du baust. Jeder von euch arbeitet an einer Sache gleichzeitig — und nur an seiner. Wer das vergisst, verspricht Kunden etwas, das der andere bauen muss.",
    highlight: "und nur an seiner",
  },
  {
    text: "Links steht euer Erspartes: 32.000 €. Davon gehen jeden Monat Miete, Essen und Versicherung ab. Jeder Monat kostet euch 2.400 €, ob ihr etwas schafft oder nicht.",
    highlight: "2.400 €",
  },
  {
    text: "Rechts wählt ihr, woran gearbeitet wird. Unter jeder Maßnahme steht, wer sie macht, wie viele Monate sie dauert und was sie kostet.",
  },
  {
    text: "Einen Testkunden habt ihr schon: Ole Wendt, Jonas' alter Kollege, teilt bei der Spedition Krämer achtzehn Lkw ein. Er probiert aus, was ihr baut.",
    highlight: "Ole Wendt",
  },
  {
    text: "Und in San Francisco sitzen vier Leute an derselben Idee. Haulway. Noch hat denen keiner Geld gegeben — das kann sich ändern.",
    highlight: "Haulway",
  },
];

export const INTRO = {
  image: "kitchen-night",
  who: "Lena Brandt & Jonas Ritter, Hamburg",
  lines: [
    "Ihr habt beide bei derselben Spedition in Hamburg gearbeitet: Jonas hat Lkw eingeteilt, du hast die IT betreut. Jede vierte Fahrt kam leer zurück, weil niemand Zeit hatte, für die Rückfahrt eine Ladung zu suchen.",
    "Das ist eure Marktlücke. Ihr habt beide gekündigt und je 16.000 € gespart. Jonas kann verkaufen, du kannst bauen. Gebaut ist nichts, Kunden habt ihr keine.",
  ],
};

/* ── Begriffe, die sonst niemand erklärt ─────────────────────── */

const MATCHING = {
  wort: "Matching",
  erklaerung:
    "Eine leere Rückfahrt und eine offene Ladung zusammenbringen: Lkw fährt Dienstag leer von Rotterdam nach Hamburg, jemand sucht genau dafür Platz. Das ist die ganze Software.",
};

const DONT_SCALE = {
  text: "Paul Graham: Do Things That Don’t Scale",
  href: "https://www.paulgraham.com/ds.html",
};

/* ── Maßnahmen ───────────────────────────────────────────────── */

const T = (t: Tactic) => t;

export const TACTICS: Record<string, Tactic> = Object.fromEntries(
  [
    /* 1 · MVP */
    T({
      id: "tabelle",
      label: "Erst mal in Excel lösen",
      group: "Produkt",
      braucht: "entwicklung",
      flavour: "Eine Tabelle mit zwei Listen: leere Lkw und offene Ladungen. Freitags drückst du auf Start und schaust, was zusammenpasst.",
      impact: { produkt: 2 },
      months: 1,
      effects: { product: 16 },
      begriffe: [MATCHING],
      beats: [
        "Keine App, keine Anmeldung. Eine Datei, die du selbst startest.",
        "Ole findet damit am Dienstag eine Rückladung. Mehr muss eine erste Version nicht beweisen.",
      ],
    }),
    T({
      id: "handarbeit",
      label: "Die Treffer von Hand suchen",
      group: "Produkt",
      braucht: "entwicklung",
      flavour:
        "Sie schicken euch ihre Leerfahrten, ihr schickt Treffer zurück — am selben Tag, von Hand. Sie halten es für ein System.",
      impact: { produkt: 4, team: -2 },
      preis: "Zwei Monate jeden Abend bis elf Uhr Listen durchgehen. Das sieht man euch an.",
      months: 2,
      effects: { product: 26, team: -6, burn: 150 },
      begriffe: [
        {
          wort: "Concierge-MVP",
          erklaerung:
            "Ihr macht die Arbeit von Hand und verkauft sie als Software. Kunden merken den Unterschied nicht — ihr lernt dafür in Wochen, was das Programm später können muss.",
          quelle: DONT_SCALE,
        },
      ],
      beats: [
        "Ole hält es für ein System. Es ist euer Küchentisch und zwei Tabellen.",
        "Ihr lernt in zwei Monaten, was die Software wirklich können muss. Nichts davon stand vorher auf eurer Liste.",
      ],
    }),
    T({
      id: "richtig-bauen",
      label: "Fünf Monate am Stück bauen",
      group: "Produkt",
      braucht: "entwicklung",
      flavour: "Login, Karte, und ein Matching, das nachts von allein läuft. Fünf Monate, in denen du für nichts anderes zu haben bist.",
      impact: { produkt: 5, team: -2, investoren: 2 },
      preis: "Fünf Monate ohne eine einzige Rückmeldung von außen. Jonas hat in der Zeit nichts zu zeigen.",
      months: 5,
      effects: { product: 34, investors: 6, team: -5 },
      begriffe: [MATCHING],
      beats: [
        "Fünf Monate am Stück. Die Demo sieht gut aus.",
        "Fünf Monate, in denen kein Disponent es angefasst hat. Drei der Sachen, die du gebaut hast, will niemand.",
      ],
    }),
    T({
      id: "routing",
      label: "Die Streckenberechnung einkaufen",
      group: "Produkt",
      braucht: "entwicklung",
      flavour: "Welcher Umweg wie viel kostet, hat schon jemand gelöst. Für 4.200 € dürft ihr seine Karte benutzen, statt sie selbst zu bauen.",
      impact: { produkt: 4, geld: -2, investoren: -2 },
      preis: "Jeden Monat Lizenzgebühr — und in jedem Investorengespräch die Frage, was davon eigentlich eure Software ist.",
      cost: 4_200,
      months: 2,
      effects: { product: 24, burn: 340, investors: -5 },
      beats: [
        "Sechs Wochen statt sechs Monate. Das Matching rechnet ab Montag auf fremden Karten.",
        "„Und was davon ist jetzt eure Software?“ — die Frage kommt in jedem Investorengespräch, und eine gute Antwort habt ihr noch nicht.",
      ],
    }),
    T({
      id: "zuhoeren",
      label: "Zwanzig Disponenten zuhören",
      group: "Vertrieb",
      braucht: "vertrieb",
      flavour: "Jonas ruft zwanzig alte Kollegen an und fragt nicht, ob sie kaufen, sondern wie sie heute eine Rückladung suchen.",
      impact: { produkt: 3, umsatz: 1, investoren: 1 },
      months: 1,
      effects: { product: 8, investors: 2, team: 4 },
      repeatable: true,
      beats: [
        "Zwanzig Telefonate, kein einziges Verkaufsgespräch.",
        "Zwei Drittel suchen per WhatsApp-Gruppe. Das ist der Wettbewerb, nicht Haulway.",
      ],
    }),
    T({
      id: "vorverkauf",
      label: "Verkaufen, bevor es das gibt",
      group: "Vertrieb",
      braucht: "vertrieb",
      flavour: "Jonas zeigt die Tabelle und redet über das, was im Sommer kommt. Eine Spedition unterschreibt jetzt, zum halben Preis.",
      impact: { umsatz: 3, produkt: -2, team: -4 },
      preis: "Was Jonas verspricht, musst du bauen — in der Reihenfolge, in der er es verkauft hat.",
      months: 2,
      effects: { customers: 1, mrr: 490, product: -4, team: -9 },
      when: (s: GameState) => s.product >= 20,
      beats: [
        "Unterschrift auf etwas, das es im Juni geben soll. 490 € im Monat, ab sofort.",
        "Jonas hat zwei Sachen zugesagt, die nicht auf deiner Liste standen. Jetzt stehen sie ganz oben.",
      ],
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
      label: "Einen Monat auf halber Kraft",
      group: "Team",
      flavour: "Vier Wochen, in denen nur das Nötigste läuft: keine neuen Baustellen, keine Termine, und am Wochenende macht keiner den Rechner an.",
      impact: { team: 4, produkt: -1 },
      preis: "Ein Monat, in dem nichts vorangeht. Die Uhr läuft trotzdem.",
      months: 1,
      effects: { team: 14, product: -2 },
      repeatable: true,
      beats: [
        "Jonas fährt zu seiner Schwester, du schläfst vier Wochenenden am Stück aus.",
        "Danach ist alles noch genauso kaputt — und ihr könnt es ansehen, ohne zu zucken.",
      ],
    }),

    /* 2 · Erste Kunden */
    T({
      id: "pilot",
      label: "Drei Monate neben Ole sitzen",
      group: "Vertrieb",
      braucht: "vertrieb",
      flavour:
        "Ole Wendt teilt bei der Spedition Krämer achtzehn Lkw ein. Jonas kennt ihn aus dem alten Job. Kein Budget, keine Geduld, aber eine Tür.",
      impact: { umsatz: 3, produkt: 3 },
      months: 3,
      effects: { customers: 1, mrr: 890, product: 12, investors: 4 },
      beats: [
        "Die erste Woche sitzt du neben ihm im Container, danach nutzt er es allein.",
        "Er unterschreibt für 890 € und erzählt es dem Hof nebenan.",
      ],
    }),
    T({
      id: "warme-kontakte",
      label: "Warme Kontakte anschreiben",
      group: "Vertrieb",
      braucht: "vertrieb",
      flavour: "Zwanzig Disponenten, die Jonas' Namen kennen. Die Liste gibt es genau einmal.",
      impact: { umsatz: 2 },
      months: 1,
      effects: { customers: 1, mrr: 890, investors: 2 },
      when: (s: GameState) => s.product >= 30,
      beats: [
        "Neun Antworten, drei Telefonate, ein Ja.",
        "Der billigste Kunde eures Lebens. Davon gibt es genau zwanzig, und jetzt sind es neunzehn.",
      ],
    }),
    T({
      id: "kaltakquise",
      label: "Hofliste kalt durchtelefonieren",
      group: "Vertrieb",
      braucht: "vertrieb",
      flavour: "Zweihundert Nummern aus dem Branchenverzeichnis, von oben nach unten.",
      impact: { umsatz: 2, produkt: 2, team: -4 },
      preis: "Zweihundertmal abgewimmelt werden, zwei Monate lang. Danach ist Jonas leer.",
      months: 2,
      effects: { product: 8, customers: 1, mrr: 540, team: -10 },
      beats: [
        "Zweihundert Anrufe, sechs Demos, eine Unterschrift zum Sonderpreis.",
        "Mitgenommen: die vier Sätze, die diese Gespräche beenden.",
      ],
    }),
    T({
      id: "messe",
      label: "Stand auf der transport logistic",
      group: "Vertrieb",
      braucht: "vertrieb",
      flavour: "Die größte Logistikmesse Europas: vier Tage München, davor Vorbereitung, danach Nachfassen. Vor Ort unterschreibt niemand.",
      impact: { umsatz: 4, investoren: 3, geld: -4, team: -2 },
      preis: "6.500 € sind weg, bevor das erste Gespräch läuft. Zwei Monate später wisst ihr, ob es sich gelohnt hat.",
      cost: 6_500,
      months: 4,
      effects: { customers: 2, mrr: 1_780, investors: 8, team: -4 },
      when: (s: GameState) => s.rival < 45,
      beats: [
        "Vierzig Gespräche, elf Karten, ein Disponent aus Bremen bleibt vierzig Minuten.",
        "Zwei unterschreiben im Quartal danach.",
      ],
    }),
    T({
      id: "boerse",
      label: "Frachtbörse für Empfehlungen zahlen",
      group: "Vertrieb",
      braucht: "vertrieb",
      flavour: "Eine Frachtbörse ist der Marktplatz, auf dem Speditionen heute Ladungen tauschen. Deren Vertrieb hat die Beziehungen schon.",
      impact: { umsatz: 3, geld: -3, investoren: -2 },
      preis: "Kunden, die ihr nicht selbst gewonnen habt. Das fällt jedem Investor auf, der nach dem Vertriebsweg fragt.",
      cost: 3_000,
      months: 2,
      effects: { customers: 2, mrr: 1_400, investors: -3 },
      beats: [
        "Zwei Unterschriften in acht Wochen, zu deren Preis.",
        "Funktioniert genau einmal. Sie wollen an allem mitverdienen, was danach kommt.",
      ],
    }),
    T({
      id: "nachtlauf",
      label: "Das Matching nachts laufen lassen",
      group: "Produkt",
      braucht: "entwicklung",
      flavour: "Statt auf Knopfdruck läuft es um vier Uhr morgens. Die Disponenten haben die Treffer, bevor sie den Rechner anmachen.",
      impact: { produkt: 4, umsatz: 2 },
      months: 2,
      effects: { product: 16, mrr: 300, burn: 120, team: 3 },
      begriffe: [MATCHING],
      beats: [
        "Um 4:10 Uhr liegt die Liste im Postfach.",
        "Zwei Kunden zahlen dafür fünfzig Euro mehr, ohne dass jemand verhandelt hat.",
      ],
    }),

    T({
      id: "aufraeumen",
      label: "Liegengebliebenes abarbeiten",
      group: "Produkt",
      braucht: "entwicklung",
      flavour:
        "Gemeldete Fehler, halbfertige Stellen, die eine Sache, die seit Wochen nur bei Ole funktioniert. Nichts davon ist neu, alles davon nervt jemanden.",
      impact: { produkt: 2, team: 1 },
      months: 1,
      effects: { product: 5, team: 2 },
      repeatable: true,
      beats: [
        "Vierzehn kleine Sachen in vier Wochen, keine davon ist eine Überschrift wert.",
        "Zwei Kunden schreiben von selbst, dass es sich besser anfühlt. Mehr passiert nicht, und das ist in Ordnung.",
      ],
    }),
    T({
      id: "kampagne",
      label: "Eine Runde Fachpresse",
      group: "Vertrieb",
      braucht: "marketing",
      flavour:
        "Zwei Fachartikel, ein Messebericht, die Website nachziehen. Disponenten googeln, bevor sie zurückrufen — und finden bisher nichts.",
      impact: { investoren: 3, umsatz: 1 },
      preis: "Zuordnen lässt sich keine der Anfragen. Ihr wisst nie, ob es das Geld wert war.",
      months: 2,
      effects: { investors: 5, customers: 1, mrr: 300, burn: 400 },
      repeatable: true,
      when: (s: GameState) => s.leute.some((p) => p.rolle === "marketing"),
      beats: [
        "Ein Artikel in der Fachzeitung, ein Beitrag im Branchen-Newsletter.",
        "Drei Anfragen in vier Wochen. Woher die dritte kam, findet niemand heraus.",
      ],
    }),
    T({
      id: "nachfassen",
      label: "Rechnungen und Rückfragen abarbeiten",
      group: "Team",
      braucht: "operations",
      flavour:
        "Offene Rechnungen, Kundenfragen, der Vertrag, den jemand nie zurückgeschickt hat. Nichts davon gewinnt einen Kunden, alles davon verliert sonst einen.",
      impact: { umsatz: 1, team: 2 },
      months: 1,
      effects: { mrr: 150, team: 3, cash: 1_200 },
      repeatable: true,
      when: (s: GameState) => s.leute.some((p) => p.rolle === "operations"),
      beats: [
        "Vier offene Rechnungen rausgeschickt, zwei davon aus dem Vorquartal.",
        "1.200 € kommen rein, die euch schon gehört haben. Gemerkt hatte es niemand.",
      ],
    }),
    T({
      id: "hoefe",
      label: "Noch drei Höfe anrufen",
      group: "Vertrieb",
      braucht: "vertrieb",
      flavour:
        "Keine Kampagne, kein Plan: Jonas nimmt die Liste und telefoniert, bis einer Ja sagt. Geht immer — und bringt jedes Mal ein bisschen weniger.",
      impact: { umsatz: 2, team: -1 },
      preis: "Zwei Monate am Telefon, und die guten Nummern sind irgendwann durch.",
      months: 2,
      effects: { customers: 1, mrr: 890, team: -3 },
      repeatable: true,
      beats: [
        "Vierzig Anrufe, zwei Demos, eine Unterschrift.",
        "So wächst eine Firma ohne fremdes Geld: langsam, aus eigener Kraft, einen Hof nach dem anderen.",
      ],
    }),
    T({
      id: "vorkasse",
      label: "Jahresverträge gegen Vorkasse",
      group: "Geld",
      braucht: "vertrieb",
      flavour: "Wer zwölf Monate im Voraus zahlt, bekommt zwei geschenkt. Euer Konto bekommt das ganze Jahr sofort.",
      impact: { geld: 4, umsatz: 1, team: -1 },
      preis: "Ihr verkauft das Jahr mit Rabatt: das Geld ist jetzt da und fehlt in zwölf Monaten.",
      months: 2,
      effects: { cash: 14_000, mrr: 240, customers: 1, team: -3 },
      when: (s: GameState) => s.customers >= 2,
      beats: [
        "Drei Speditionen zahlen das Jahr im Voraus, zwei Monate geschenkt.",
        "14.000 € auf einen Schlag, ohne einen einzigen Anteil. Das ist die Finanzierungsrunde der Leute, die keine wollen.",
      ],
    }),
    T({
      id: "preise",
      label: "Die Preise erhöhen",
      group: "Vertrieb",
      braucht: "vertrieb",
      flavour: "890 € war der Preis, den ihr euch am Anfang getraut habt. Inzwischen spart eine Spedition damit das Zehnfache im Monat.",
      impact: { umsatz: 5, investoren: 2, team: -1 },
      preis: "Zwei von zehn kündigen. Welche zwei, wisst ihr vorher nicht.",
      months: 2,
      effects: { mrr: 3_200, customers: -1, investors: 4, team: -4 },
      when: (s: GameState) => s.customers >= 6,
      beats: [
        "Neuer Preis 1.490 €, für Bestandskunden ab Januar.",
        "Zwei kündigen, der Rest bleibt, und der Umsatz steigt um ein Drittel — ohne eine einzige neue Unterschrift.",
      ],
    }),

    /* 3 · Erstes Geld */
    T({
      id: "exist",
      label: "EXIST-Stipendium beantragen",
      group: "Geld",
      flavour: "Ein Förderprogramm des Bundes: zwölf Monate Lebensunterhalt für Gründungen mit einer Hochschule im Rücken. Lenas alter Lehrstuhl macht mit.",
      impact: { geld: 4, investoren: 2 },
      preis: "Elf Wochen Anträge schreiben statt verkaufen oder bauen.",
      months: 4,
      effects: { cash: 32_000, investors: 4 },
      alignmentBy: { bootstrap: 8, venture: -4 },
      beats: [
        "Eine Präsentation in Lüneburg, Bescheid im März.",
        "32.000 € über zwölf Monate. Billiger kommt ihr nie an Geld.",
      ],
    }),
    T({
      id: "angel-40",
      label: "Der Reeder Oltmanns: 100.000 € für 40 %",
      group: "Geld",
      braucht: "vertrieb",
      flavour: "Ein Hamburger Reeder, der in acht Firmen im Jahr investiert. Er will bis Freitag eine Antwort.",
      impact: { geld: 5, investoren: -3 },
      preis: "40 % in der ersten Runde. Das steht in jedem späteren Gespräch mit im Raum.",
      months: 1,
      effects: {
        cash: 100_000,
        equity: -40,
        investors: -8,
        runde: { wer: "Oltmanns", betrag: 100_000, faktor: 1, participating: false },
      },
      link: { text: "Wie viel ihr überhaupt braucht — Round Planner", href: "/?tool=round" },
      alignmentBy: { bootstrap: -18, venture: 6 },
      /* Wer sich gegen fremdes Geld entschieden hat, dem liegt es nicht
         weiter im Stapel. */
      when: (s: GameState) => s.kurs !== "bootstrap",
      beats: [
        "Freitag ist das Geld da.",
        "Vierzig Prozent in der ersten Runde. Der nächste Investor rechnet nach und fragt, was ihr euch dabei gedacht habt.",
      ],
    }),
    T({
      id: "wandeldarlehen",
      label: "Wandeldarlehen anbieten",
      group: "Geld",
      braucht: "vertrieb",
      flavour: "Ein Kredit, der sich später in Anteile verwandelt — zum Preis der nächsten Runde, mit Abschlag.",
      impact: { geld: 5, investoren: 3 },
      months: 2,
      effects: {
        cash: 100_000,
        equity: -11,
        investors: 3,
        runde: { wer: "Oltmanns (Wandeldarlehen)", betrag: 100_000, faktor: 1, participating: false },
      },
      alignmentBy: { bootstrap: -6, venture: 8 },
      begriffe: [
        {
          wort: "Discount und Cap",
          erklaerung:
            "Der Abschlag (20 %) ist der Rabatt, den er für das frühe Risiko bekommt. Der Cap (4 Mio.) ist die Bewertung, über der er trotzdem nicht teurer einsteigt.",
        },
      ],
      /* Wer sich gegen fremdes Geld entschieden hat, dem liegt es nicht
         weiter im Stapel. */
      when: (s: GameState) => s.kurs !== "bootstrap",
      beats: [
        "100.000 €, 20 % Discount, 4 Mio. Cap.",
        "Niemand musste heute festlegen, was Palettio wert ist. Nächstes Jahr schon.",
      ],
    }),
    T({
      id: "aus-umsatz",
      label: "Aus Speditionsgeld finanzieren",
      group: "Geld",
      braucht: "vertrieb",
      flavour: "Kein Deck, keine Termine. Dreißig Gespräche und drei Unterschriften.",
      impact: { umsatz: 4, geld: 2, team: -2 },
      preis: "Drei Monate, in denen am Produkt nichts passiert, weil Jonas nur verkauft.",
      months: 3,
      effects: { customers: 3, mrr: 2_300, team: -6 },
      alignmentBy: { bootstrap: 10, venture: -8 },
      beats: [
        "Drei Höfe mehr am Netz.",
        "Umsatz kostet keine Anteile. Er kostet drei Monate, in denen das Produkt steht.",
      ],
    }),
    T({
      id: "fff",
      label: "Friends and Family",
      group: "Geld",
      braucht: "vertrieb",
      flavour: "Dein Onkel, Jonas' Schwager, je 8.000 €.",
      impact: { geld: 3, team: -2, investoren: -1 },
      preis: "Drei Leute, die nicht beurteilen können, worauf sie sich einlassen — und die ihr Weihnachten seht.",
      months: 2,
      effects: {
        cash: 24_000,
        equity: -6,
        investors: -2,
        team: -4,
        runde: { wer: "Familie und Freunde", betrag: 24_000, faktor: 1, participating: false },
      },
      begriffe: [
        {
          wort: "Friends and Family",
          erklaerung:
            "Die Runde vor allen Runden: Leute aus dem Umfeld geben kleine Beträge, meist ohne das Geschäft beurteilen zu können. Billig an Anteilen, teuer an Beziehungen.",
        },
      ],
      /* Wer sich gegen fremdes Geld entschieden hat, dem liegt es nicht
         weiter im Stapel. */
      when: (s: GameState) => s.kurs !== "bootstrap",
      beats: [
        "Drei Leute, die das nicht beurteilen können, unterschreiben.",
        "Die einzige Geldsorte, bei der ein schlechtes Jahr Weihnachten schwierig macht.",
      ],
    }),

    /* 4 · Team & Büro */
    T({
      id: "buero",
      label: "Zwei Räume in Ottensen",
      group: "Team",
      flavour: "48 m², Altbau, Hinterhof, ab dem Ersten.",
      impact: { team: 4, geld: -2 },
      cost: 2_400,
      months: 1,
      effects: { burn: 1_250, team: 12, investors: 3 },
      beats: [
        "Zwei Räume, eine geteilte Küche.",
        "In dieser Küche werden Dinge besprochen, die vorher niemand angesprochen hat.",
      ],
    }),
    T({
      id: "hire-vertrieb",
      label: "Marie für den Vertrieb",
      group: "Team",
      braucht: "vertrieb",
      flavour: "Kommt von einer Frachtbörse, kennt die halbe Branche. Ab jetzt kann jemand verkaufen, während Jonas etwas anderes macht.",
      impact: { umsatz: 5, geld: -4 },
      preis: "6.200 € ab Tag eins, Abschlüsse ab Monat drei. Die Lücke dazwischen zahlt ihr.",
      months: 3,
      effects: {
        einstellen: [{ name: "Marie", rolle: "vertrieb", kosten: 6_200 }],
        customers: 3,
        mrr: 2_670,
        investors: 5,
      },
      beats: [
        "Sie kennt die Disponenten beim Vornamen.",
        "6.200 € jeden Monat, ob sie abschließt oder nicht. Dafür ist Jonas zum ersten Mal für etwas anderes frei.",
      ],
    }),
    T({
      id: "hire-eng",
      label: "Sofia für die Entwicklung",
      group: "Team",
      braucht: "entwicklung",
      flavour: "Damit das Matching nachts läuft und nicht, wenn du dran denkst. Und damit du selbst mal etwas anderes machen kannst.",
      impact: { produkt: 5, geld: -4 },
      months: 2,
      effects: {
        einstellen: [{ name: "Sofia", rolle: "entwicklung", kosten: 6_400 }],
        product: 20,
        customers: 1,
        mrr: 890,
      },
      beats: [
        "Das Matching läuft um 4 Uhr, jeden Tag, ohne dass jemand hinschaut.",
        "Kunden merken es in drei Wochen, Investoren in sechs Monaten. Die Gehaltsliste merkt es sofort.",
      ],
    }),
    T({
      id: "hire-ops",
      label: "Timo für alles, was liegen bleibt",
      group: "Team",
      flavour:
        "Angebote, Rechnungen, Onboarding, die Fragen der Steuerberaterin. Zusammen zwei Tage die Woche, die euch beiden fehlen.",
      impact: { team: 4, umsatz: 2, geld: -2 },
      months: 1,
      effects: {
        einstellen: [{ name: "Timo", rolle: "operations", kosten: 3_800 }],
        team: 10,
        mrr: 300,
      },
      beats: [
        "Er räumt in zwei Wochen auf, wofür ihr ein halbes Jahr keine Zeit hattet.",
        "Zwei Rechnungen von März waren nie rausgegangen. Jetzt sind sie es.",
      ],
    }),
    T({
      id: "hire-marketing",
      label: "Nina macht euch sichtbar",
      group: "Team",
      flavour: "Fachpresse, Messeauftritte, eine Website, die erklärt, was ihr tut. Disponenten googeln, bevor sie zurückrufen.",
      impact: { investoren: 4, umsatz: 3, geld: -3 },
      months: 2,
      effects: {
        einstellen: [{ name: "Nina", rolle: "marketing", kosten: 4_900 }],
        investors: 8,
        customers: 1,
        mrr: 890,
      },
      when: (s: GameState) => s.customers >= 3,
      beats: [
        "Zwei Fachartikel und eine Seite, die in einem Satz sagt, was Palettio macht.",
        "Drei Anfragen, die niemand angerufen hat. Zuordnen lässt sich keine davon.",
      ],
    }),
    T({
      id: "werkstudenten",
      label: "Zwei Werkstudenten",
      group: "Team",
      flavour: "Zusammen 1.900 €, kündbar zum Semester. Sie übernehmen Onboarding und Datenpflege.",
      impact: { umsatz: 2, geld: -2, team: -1 },
      preis: "Eingearbeitet wird zweimal im Jahr, und beide sind weg, bevor es sich rechnet.",
      months: 1,
      effects: {
        einstellen: [{ name: "Zwei Werkstudenten", rolle: "operations", kosten: 1_900 }],
        customers: 1,
        mrr: 890,
        team: -3,
      },
      beats: [
        "Sie übernehmen Onboarding und Datenpflege.",
        "Beide sind weg, bevor das, was sie gelernt haben, wichtig wird.",
      ],
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
      when: (s: GameState) => s.leute.length >= 3,
      beats: [
        "Fischbrötchen, drei Stunden Regen.",
        "Danach seid ihr eine Firma und nicht vier Leute mit demselben Kalender.",
      ],
    }),

    /* 5 · Seed */
    T({
      id: "anker-vc",
      label: "Anker-VC: 2,5 Mio. auf 10 Mio.",
      group: "Geld",
      braucht: "vertrieb",
      flavour: "Großer Fonds aus München. Boardsitz, 2× participating.",
      impact: { geld: 5, investoren: 5 },
      preis: "Ein Boardsitz heißt: vier Termine im Jahr, bei denen ihr erklärt, warum der Plan nicht aufging.",
      months: 4,
      effects: {
        cash: 2_500_000,
        equity: -22,
        investors: 12,
        burn: 3_000,
        /* Die Zeile, die beim Verkauf alles entscheidet. */
        runde: { wer: "Anker-VC", betrag: 2_500_000, faktor: 2, participating: true },
      },
      link: { text: "Was eine Runde euch kostet — Dilution Planner", href: "/?tool=planner" },
      alignmentBy: { bootstrap: -12, venture: 10 },
      begriffe: [
        {
          wort: "2× participating",
          erklaerung:
            "Beim Verkauf bekommt der Fonds zuerst das Doppelte seines Einsatzes zurück — und danach trotzdem noch seinen Anteil am Rest. Bei einem mittleren Exit bleibt für euch wenig.",
        },
      ],
      /* Wer sich gegen fremdes Geld entschieden hat, dem liegt es nicht
         weiter im Stapel. */
      when: (s: GameState) => s.kurs !== "bootstrap",
      beats: [
        "Sechs Wochen Exklusivität, vier Wochen Prüfung.",
        "Beim mittleren Exit holen sie ihre 2,5 Mio. doppelt raus, bevor ihr etwas seht.",
      ],
    }),
    T({
      id: "angel-club",
      label: "Angel-Club: 800.000 €",
      group: "Geld",
      braucht: "vertrieb",
      flavour: "Neun Angels, einer spricht für alle. Kein Boardsitz, und beim Verkauf bekommen sie ihren Einsatz einmal zurück — nicht doppelt.",
      begriffe: [
        {
          wort: "Term Sheet",
          erklaerung:
            "Das Angebot eines Investors, meist zwei Seiten: wie viel Geld, für welchen Anteil, und was er darf, wenn es schiefgeht. Es ist noch kein Vertrag, aber danach wird kaum noch verhandelt.",
        },
      ],
      impact: { geld: 4, investoren: 3 },
      months: 3,
      effects: {
        cash: 800_000,
        equity: -15,
        investors: 6,
        burn: 500,
        runde: { wer: "Angel-Club", betrag: 800_000, faktor: 1, participating: false },
      },
      link: { text: "Was eine Runde euch kostet — Dilution Planner", href: "/?tool=planner" },
      /* Wer sich gegen fremdes Geld entschieden hat, dem liegt es nicht
         weiter im Stapel. */
      when: (s: GameState) => s.kurs !== "bootstrap",
      beats: [
        "Term Sheet auf zwei Seiten.",
        "Weniger Geld, saubere Bedingungen — und in achtzehn Monaten müsst ihr wieder los.",
      ],
    }),
    T({
      id: "stratege",
      label: "Strategischer Investor",
      group: "Geld",
      braucht: "vertrieb",
      flavour: "Eine Frachtbörse steigt ein. Geld, Vertrieb — und ein Vorkaufsrecht.",
      impact: { geld: 5, umsatz: 5, investoren: -2 },
      preis: "Das Vorkaufsrecht steht in jedem späteren Datenraum und schreckt jeden anderen Käufer ab.",
      months: 3,
      effects: {
        cash: 1_200_000,
        equity: -18,
        customers: 6,
        mrr: 5_340,
        investors: -6,
        runde: { wer: "Die Frachtbörse", betrag: 1_200_000, faktor: 1, participating: true },
      },
      link: { text: "Was eine Runde euch kostet — Dilution Planner", href: "/?tool=planner" },
      /* Wer sich gegen fremdes Geld entschieden hat, dem liegt es nicht
         weiter im Stapel. */
      when: (s: GameState) => s.kurs !== "bootstrap",
      beats: [
        "1,2 Mio. und vierzig offene Türen im ersten Quartal.",
        "Das Vorkaufsrecht im Vertrag schreckt jeden späteren Käufer ab.",
      ],
    }),
    T({
      id: "runde-schieben",
      label: "Runde schieben, erst Umsatz",
      group: "Vertrieb",
      braucht: "vertrieb",
      flavour: "Sechs Monate bessere Zahlen, schlechtere Nerven.",
      impact: { umsatz: 4, investoren: -3 },
      preis: "Sechs Monate sind in dieser Branche eine Fondsperiode. Zwei der drei Gesprächspartner sind danach weg.",
      months: 6,
      effects: { customers: 4, mrr: 3_560, investors: -8 },
      alignmentBy: { bootstrap: 8, venture: -10 },
      beats: [
        "Der Umsatz steigt, die Bewertung wäre jetzt höher.",
        "Zwei der drei Fonds haben inzwischen woanders investiert. In dieser Branche.",
      ],
    }),
    T({
      id: "bruecke",
      label: "Brücke von Oltmanns",
      group: "Geld",
      braucht: "vertrieb",
      flavour: "Oltmanns, der Reeder, schiebt 150.000 € nach — ein Telefonat, zwei Seiten, der Preis wird erst bei der nächsten Runde festgelegt.",
      impact: { geld: 3, investoren: -1 },
      preis: "Wer eine Brücke braucht, verhandelt bei der nächsten Runde aus der schwächeren Position.",
      months: 1,
      effects: {
        cash: 150_000,
        equity: -5,
        investors: -3,
        runde: { wer: "Brücke von Oltmanns", betrag: 150_000, faktor: 1, participating: false },
      },
      /* Wer sich gegen fremdes Geld entschieden hat, dem liegt es nicht
         weiter im Stapel. */
      when: (s: GameState) => s.kurs !== "bootstrap",
      beats: ["Ein Sonntagstelefonat, zwei Seiten.", "Eine Wette auf sechs bessere Monate."],
    }),

    /* 6 · Skalieren */
    T({
      id: "vertrieb-ausbauen",
      label: "Drei Leute für den Vertrieb",
      group: "Team",
      braucht: "vertrieb",
      flavour: "Marie baut ein Team. Das Geld ist ja da.",
      impact: { umsatz: 5, geld: -5, team: -2 },
      preis: "Die Fixkosten verdreifachen sich an einem Tag. Der Umsatz braucht zwei Quartale.",
      months: 5,
      effects: {
        einstellen: [
          { name: "Deniz", rolle: "vertrieb", kosten: 6_000 },
          { name: "Hannah", rolle: "vertrieb", kosten: 6_000 },
          { name: "Lukas", rolle: "vertrieb", kosten: 6_000 },
        ],
        customers: 12,
        mrr: 10_680,
        team: -6,
      },
      beats: [
        "Drei Einstellungen in drei Monaten.",
        "Die Fixkosten verdreifachen sich an einem Tag. Zwei der drei verkaufen erst im nächsten Quartal etwas.",
      ],
    }),
    T({
      id: "produkt-tiefer",
      label: "Produkt tiefer statt breiter",
      group: "Produkt",
      braucht: "entwicklung",
      flavour: "Abrechnung, Zoll, Telematik. Alles, was sie ohnehin machen.",
      impact: { produkt: 5, umsatz: 4, team: 1 },
      months: 4,
      effects: { product: 18, customers: 4, mrr: 6_230, team: 4 },
      beats: [
        "Abrechnung und Zollpapiere im selben System.",
        "Umsatz je Kunde steigt um ein Drittel, ohne dass jemand verkauft hat.",
      ],
    }),
    T({
      id: "rotterdam",
      label: "Ein Büro in Rotterdam",
      group: "Vertrieb",
      braucht: "vertrieb",
      flavour:
        "Der größte Hafen Europas. Was in Hamburg ankommt, fährt dort weiter — dieselben Speditionen, dreimal so viele Fahrten.",
      impact: { umsatz: 4, investoren: 4, geld: -5, team: -3 },
      preis: "18.000 € für Büro und Anwalt, bevor dort jemand etwas unterschrieben hat.",
      cost: 18_000,
      months: 4,
      effects: { burn: 4_200, customers: 5, mrr: 4_450, investors: 8, team: -8 },
      beats: [
        "Zwei Leute in einem Büro an der Maashaven.",
        "Niederländische Speditionen wollen niederländische Rechnungen. Das stand in keinem Plan.",
      ],
    }),
    T({
      id: "halten",
      label: "Sofia halten",
      group: "Team",
      flavour: "Haulway hat ihr geschrieben. Sie hat es euch gesagt.",
      impact: { team: 5, produkt: 2, geld: -1 },
      months: 1,
      effects: { burn: 1_400, team: 14, product: 6 },
      when: (s: GameState) => s.leute.some((p) => p.name === "Sofia"),
      beats: [
        "Sie zeigt euch die Nachricht selbst. Das ist das Signal.",
        "Mehr Geld, mehr Verantwortung, Anteile am Pool. Sie bleibt.",
      ],
    }),
    T({
      id: "series-a",
      label: "Series A vorbereiten",
      group: "Geld",
      braucht: "vertrieb",
      flavour: "Vier Monate Vorbereitung: alle Unterlagen an einen Ort, die Zahlen sauber aufbereitet, zwölf Erstgespräche.",
      begriffe: [
        {
          wort: "Series A",
          erklaerung:
            "Die Runde nach der Seed-Runde, meist das Fünf- bis Zehnfache an Geld. Dafür wollen Fonds sehen, dass der Umsatz jeden Monat planbar wächst — nicht, dass er groß ist.",
        },
      ],
      impact: { investoren: 5, team: -3, umsatz: -1 },
      preis: "Vier Monate, in denen Jonas nicht verkauft. Das steht hinterher in euren Zahlen.",
      months: 4,
      effects: { investors: 20, team: -8, customers: -1 },
      beats: [
        "Zwölf Erstgespräche, drei zweite.",
        "Vier Monate, in denen niemand verkauft hat. Das steht in euren Zahlen.",
      ],
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
    tactics: ["tabelle", "handarbeit", "routing", "richtig-bauen", "zuhoeren", "vorverkauf", "jonas-fragen", "aufraeumen", "durchatmen"],
    next: "kunden",
  },
  {
    id: "kunden",
    title: "Die ersten zahlenden Kunden",
    blurb: "„Interessant“ sagen alle. Erst wenn jemand eine Rechnung bezahlt, wisst ihr, ob es etwas taugt.",
    image: "first-customer",
    gate: (s) => s.mrr > 0 && s.customers >= 2,
    gateLabel: "Zwei Speditionen zahlen jeden Monat",
    tactics: ["pilot", "warme-kontakte", "kaltakquise", "messe", "boerse", "hoefe", "nachtlauf", "aufraeumen", "durchatmen"],
    onEnter: {
      kicker: "Tarek",
      title: "Jetzt zählt nur, ob jemand zahlt",
      beats: [
        "„Interessant“ habt ihr oft genug gehört. Interessant ist kein Kunde. Ein Kunde ist jemand, der eine Rechnung bezahlt und sich ärgert, wenn es nicht läuft.",
        "Fangt bei Ole an, der kennt euch. Hört aber nicht bei ihm auf — einer, der euch mag, beweist nur, dass er euch mag.",
      ],
      effects: {},
    },
    next: "geld",
  },
  {
    id: "geld",
    title: "Reicht es, oder braucht ihr Geld?",
    blurb: "Entweder ihr holt euch Geld, das nicht von Kunden kommt — oder ihr verkauft so viel, dass ihr keins braucht.",
    image: "angel-cafe",
    gate: (s) => s.cash >= 45_000 || s.mrr >= 3_500,
    gateLabel: "45.000 € auf dem Konto oder 3.500 € Umsatz im Monat",
    tactics: ["exist", "aus-umsatz", "hoefe", "vorkasse", "wandeldarlehen", "angel-40", "fff", "nachtlauf", "aufraeumen", "durchatmen"],
    onEnter: {
      kicker: "Tarek",
      title: "Ab hier gibt es zwei Wege",
      beats: [
        "Entweder ihr holt euch Geld von außen: dann geht alles schneller, und ein Teil der Firma gehört jemandem, der sie in sieben Jahren verkauft sehen will.",
        "Oder ihr wachst aus dem, was Speditionen zahlen. Langsamer, dafür gehört es euch. Beides ist in Ordnung — beides gleichzeitig geht nicht.",
      ],
      effects: {},
    },
    next: "team",
  },
  {
    id: "team",
    title: "Büro und erste Leute",
    blurb: "Zu zweit schafft ihr zwei Sachen gleichzeitig, und jeder nur seine. Jede weitere Person ist eine Sache mehr.",
    image: "first-hire",
    gate: (s) => s.leute.length >= 3 && s.mrr >= 4_000,
    gateLabel: "Drei Leute an Bord und 4.000 € Umsatz im Monat",
    tactics: ["buero", "hire-vertrieb", "hire-eng", "hire-ops", "hire-marketing", "werkstudenten", "ausflug", "hoefe", "aufraeumen", "kampagne", "nachfassen", "durchatmen"],
    onEnter: {
      kicker: "Tarek",
      title: "Die teuerste Unterschrift ist ein Arbeitsvertrag",
      beats: [
        "Eine Einstellung kostet jeden Monat Geld, ob sie etwas bringt oder nicht, und jemanden wieder loszuwerden dauert länger, als euer Konto durchhält.",
        "Stellt für das ein, was euch am meisten fehlt — nicht für das, was ihr am wenigsten gern macht.",
      ],
      effects: {},
    },
    next: "seed",
  },
  {
    id: "seed",
    title: "Die Runde — oder eben nicht",
    blurb: "Mehrere Investoren wollen rein. Was sie verlangen, unterscheidet sich stärker als das, was sie zahlen — und ohne sie geht es auch, nur langsamer.",
    image: "the-round",
    gate: (s) => s.cash >= 400_000 || s.mrr >= 14_000,
    gateLabel: "400.000 € einsammeln — oder 14.000 € Umsatz im Monat",
    tactics: ["anker-vc", "angel-club", "stratege", "runde-schieben", "bruecke", "preise", "hoefe", "produkt-tiefer", "aufraeumen", "kampagne", "nachfassen", "durchatmen"],
    onEnter: {
      kicker: "Tarek",
      title: "Was auf den zwei Seiten steht",
      beats: [
        "Eine Seed-Runde ist die erste große Finanzierung. Was ein Investor anbietet, steht auf zwei Seiten, dem Term Sheet: wie viel Geld, für welchen Anteil, und was er darf, wenn es schiefgeht.",
        "Der Betrag ist die unwichtigste Zahl darauf. Lest den Rest.",
      ],
      effects: {},
      when: (s) => s.kurs !== "bootstrap",
    },
    next: "skalieren",
  },
  {
    id: "skalieren",
    title: "Skalieren",
    blurb: "Mit Geld wachsen ist leicht. Mit Geld wachsen, ohne alles zu verbrennen, ist die Aufgabe.",
    image: "first-hire",
    gate: (s) => s.mrr >= 25_000,
    gateLabel: "25.000 € Umsatz im Monat — dann kommt die Series A",
    tactics: ["vertrieb-ausbauen", "produkt-tiefer", "rotterdam", "halten", "series-a", "preise", "hoefe", "aufraeumen", "kampagne", "nachfassen", "durchatmen"],
    onEnter: {
      kicker: "Tarek",
      title: "Jetzt kann man richtig Geld verbrennen",
      beats: [
        "Mit Geld auf dem Konto wächst jede Firma. Die einzige Frage ist, ob der Umsatz schneller wächst als die Gehaltsliste.",
        "Wenn nicht, heißt die nächste Runde Series A und findet nicht statt.",
      ],
      effects: {},
    },
    next: null,
  },
];

export const MILESTONE_BY_ID = Object.fromEntries(MILESTONES.map((m) => [m.id, m])) as Record<string, Milestone>;

/* ── Erfolge ─────────────────────────────────────────────────── */

/** Die zwei Momente, in denen die Uhr aufhört, gegen euch zu laufen. */
export const ERFOLGE: Erfolg[] = [
  {
    id: "erste-rechnung",
    title: "Die erste Rechnung ist bezahlt",
    beats: [
      "Keine Testphase, keine Absichtserklärung. Eine Spedition überweist Geld für etwas, das ihr gebaut habt.",
      "Ab jetzt kommt jeden Monat etwas rein. Schaut links hin: der grüne Balken ist nicht mehr bei null.",
    ],
    when: (v, n) => v.mrr === 0 && n.mrr > 0,
  },
  {
    id: "traegt-sich",
    title: "Dieser Monat hat sich selbst bezahlt",
    beats: [
      "Zum ersten Mal kommt mehr rein, als rausgeht. Der grüne Balken ist länger als der rote.",
      "Ab hier könnt ihr Nein sagen — zu Investoren, zu Kunden, zu Bedingungen. Das ist der eigentliche Gewinn.",
    ],
    when: (v, n) => saldo(v) < 0 && saldo(n) >= 0,
  },
];

/* ── Entscheidungen ──────────────────────────────────────────── */

/**
 * Die Abende, an denen nicht gearbeitet wird.
 *
 * Gezogen wird die erste Frage, deren Bedingung gilt — die Reihenfolge
 * hier ist also die Reihenfolge im Spiel, und sie ist Absicht: erst
 * wann man überhaupt redet, dann mit wem, dann wem die Firma gehört,
 * dann ob sie existiert, dann wer sie bezahlt.
 */
export const ENTSCHEIDUNGEN: Entscheidung[] = [
  {
    id: "rausgehen",
    art: "weg",
    kicker: "Am Küchentisch",
    title: "Redet ihr schon darüber?",
    beats: [
      "Jonas will zur Branchenveranstaltung in Bremen und erzählen, woran ihr arbeitet. Du hast etwas, das freitags durchläuft, wenn man es anstößt.",
      "Wer früh redet, bekommt Rückmeldung und wird kopiert. Wer wartet, baut vielleicht monatelang am Falschen.",
    ],
    begriffe: [
      {
        wort: "Stealth",
        erklaerung:
          "Heimlich bauen, bis es fertig ist. Schützt vor Nachahmern und kostet genau das, was ihr am dringendsten braucht: Leute, die euch sagen, dass ihr am Falschen baut.",
      },
    ],
    wege: [
      {
        id: "raus",
        label: "Rausgehen und darüber reden",
        hint: "Bremen, vierzig Disponenten, ehrliche Antworten.",
        effects: { investors: 7, product: 5, team: -3 },
        beats: [
          "Jonas erzählt es vierzig Leuten. Zwei lachen, sechs wollen es sehen.",
          "Eine Woche später steht eine Zeile über euch in einem Branchen-Newsletter. In San Francisco liest das niemand — in Bremen schon.",
        ],
      },
      {
        id: "still",
        label: "Still bleiben, bis es läuft",
        hint: "Kein Vortrag, keine Website, kein Name in der Presse.",
        effects: { product: 10, investors: -7 },
        beats: [
          "Ihr sagt ab. Zwei Monate ungestört.",
          "Ihr baut zwei Funktionen fertig, nach denen später niemand fragt. Gemerkt hättet ihr das in Bremen.",
        ],
      },
      {
        id: "leise",
        label: "Nur mit Leuten reden, die ihr kennt",
        hint: "Kein Vortrag, aber zwanzig alte Kollegen am Telefon.",
        effects: { product: 6, team: 4, investors: 1 },
        beats: [
          "Keine Bühne, zwanzig Telefonate.",
          "Ehrliche Antworten ohne Publikum. Dafür weiß in der Branche weiterhin niemand, dass es euch gibt.",
        ],
      },
    ],
    when: (s) => s.product >= 24 && s.customers === 0,
  },
  {
    id: "outreach",
    art: "weg",
    sofort: true,
    kicker: "Bevor ihr loslauft",
    title: "Wie kommt ihr an die ersten Speditionen?",
    beats: [
      "Jonas hat drei Listen vor sich liegen: alte Kollegen, das Branchenverzeichnis, und das Angebot einer Frachtbörse, euch gegen Beteiligung vorzustellen.",
      "Womit ihr anfangt, entscheidet, wie teuer der erste Kunde wird — und wie ehrlich das Feedback ist.",
    ],
    wege: [
      {
        id: "warm",
        label: "Bei alten Kollegen anfangen",
        hint: "Die Liste ist kurz und funktioniert genau einmal.",
        effects: { customers: 1, mrr: 490, investors: 2, team: 5 },
        beats: [
          "Vier Telefonate, ein Ja. Der erste Kunde war ein Kollege von Jonas.",
          "Der billigste Kunde, den ihr je bekommt — und keiner, der beweist, dass Fremde kaufen würden.",
        ],
      },
      {
        id: "kalt",
        label: "Das Branchenverzeichnis von oben",
        hint: "Zweihundert Nummern, niemand kennt euch.",
        effects: { product: 6, investors: 3, team: -8 },
        beats: [
          "Achtzig Anrufe in zwei Wochen, zwei Demos, keine Unterschrift.",
          "Aber ihr wisst jetzt, bei welchem Satz sie auflegen. Das ist mehr wert als der eine warme Kunde.",
        ],
      },
      {
        id: "partner",
        label: "Über eine Frachtbörse gehen",
        hint: "Deren Vertrieb hat die Beziehungen. Dafür wollen sie mitverdienen.",
        effects: { customers: 2, mrr: 980, cash: -2_000, investors: -4 },
        beats: [
          "Zwei Vorstellungen, zwei Unterschriften, 2.000 € Vorkasse.",
          "Ihr habt zwei Kunden und keine Ahnung, wie man selbst welche gewinnt. Das merkt der nächste Investor sofort.",
        ],
      },
    ],
    when: (s) => s.milestoneId === "kunden" && s.customers === 0,
  },
  {
    id: "anteile",
    art: "struktur",
    kicker: "Am Küchentisch",
    title: "Wie teilt ihr die Firma?",
    beats: [
      "Jonas hat das Problem gekannt und bringt die Kunden. Du hast gebaut, was sie benutzen. Wem wie viel gehört, steht bis heute nirgendwo.",
      "Wenn ihr es nicht aufschreibt, schreibt es später jemand anders für euch: ein Investor, ein Anwalt oder ein Gericht.",
    ],
    wege: [
      {
        id: "5050-vesting",
        label: "50/50, über vier Jahre verdient",
        hint: "Gleich viel für beide — behalten darf es, wer bleibt.",
        effects: { team: 8, alignment: 6, investors: 6 },
        beats: [
          "Zwei Seiten, zwei Unterschriften: je die Hälfte, davon Jahr für Jahr ein Viertel endgültig.",
          "Wer im achten Monat aufhört, nimmt nicht die halbe Firma mit. Es fühlt sich an wie Misstrauen und ist genau das Gegenteil.",
        ],
      },
      {
        id: "5050-blank",
        label: "50/50, ohne Bedingungen",
        hint: "Ihr kennt euch seit zehn Jahren. Muss man das aufschreiben?",
        effects: { team: 5, alignment: 4, investors: -9 },
        beats: [
          "Ein Satz, ein Handschlag, zurück an die Arbeit.",
          "Im ersten Term Sheet steht Vesting trotzdem drin. Nur verhandelt ihr es dann gegeneinander statt miteinander.",
        ],
      },
      {
        id: "60-40",
        label: "60 für dich, 40 für Jonas",
        hint: "Ohne Produkt gibt es nichts zu verkaufen.",
        effects: { team: -12, alignment: -10, product: 4 },
        beats: [
          "Jonas sagt Ja. Er sagt sonst nichts dazu.",
          "Zwanzig Punkte Unterschied, die in jedem schwierigen Gespräch der nächsten drei Jahre mit am Tisch sitzen.",
        ],
      },
    ],
    when: (s) => s.product >= 30,
  },
  {
    id: "rollen",
    art: "streit",
    kicker: "Streit",
    title: "Wer von euch sagt eigentlich zu?",
    beats: [
      "Jonas hat Ole versprochen, dass Palettio ab Juni auch Teilladungen kann. Du erfährst es, als Ole dich danach fragt.",
      "Es ist das dritte Mal. Beim ersten Mal war es praktisch, beim zweiten ärgerlich.",
    ],
    wege: [
      {
        id: "aufteilen",
        label: "Aufschreiben, wer was entscheidet",
        hint: "Eine Stunde, zwei Spalten: Produkt bei dir, Kunden bei ihm.",
        effects: { team: 11, alignment: 7 },
        beats: [
          "Produkt und Termine bei dir, Kunden und Preise bei ihm. Eine Seite, zwei Unterschriften.",
          "Für zwei Leute an einem Küchentisch fühlt sich das albern an. Es ist das erste Dokument, das ihr eurer ersten Einstellung zeigen werdet.",
        ],
      },
      {
        id: "weiter-so",
        label: "Weiter wie bisher",
        hint: "Ihr seid zwei. Wer anfängt, macht es fertig.",
        effects: { team: -9, alignment: -5, product: 5 },
        beats: [
          "Keine Sitzung, kein Dokument. Diese Woche wird mehr geschafft als in der davor.",
          "Zwei Wochen später nennt ihr einem Kunden zwei verschiedene Termine. Er sagt es nicht euch, sondern dem Hof nebenan.",
        ],
      },
    ],
    when: (s) => s.customers >= 1,
  },
  {
    id: "weg",
    art: "weg",
    reife: true,
    sofort: true,
    link: { text: "Die fünf Haken im Einzelnen — Ready to Raise", href: "/?tool=ready" },
    kicker: "Die Frage dahinter",
    title: "Wollt ihr überhaupt fremdes Geld?",
    beats: [
      "Oltmanns — ein Hamburger Reeder, der jedes Jahr in acht junge Firmen investiert — fragt, ob ihr Donnerstag Zeit habt. Und unabhängig von ihm steht die Frage im Raum, seit Geld reinkommt: muss das hier groß werden?",
      "Fremdes Geld kauft Tempo und kostet Anteile und Mitbestimmung. Umsatz kostet nur Zeit. Es gibt keinen Weg, der beides hat.",
    ],
    begriffe: [
      {
        wort: "Venture Case",
        erklaerung:
          "Eine Firma, die in sieben Jahren hundertmal so groß sein könnte. Nur solche passen zu Wagniskapital — eine gute Firma mit 2 Mio. Umsatz ist kein schlechterer Plan, aber kein Fall für einen Fonds.",
      },
      {
        wort: "Power Law",
        erklaerung:
          "Ein Fonds rechnet damit, dass neun von zehn Beteiligungen kaum etwas zurückgeben und eine alles. Deshalb ist er nicht zufrieden, wenn ihr solide seid: Solide rettet seinen Fonds nicht.",
      },
    ],
    wege: [
      {
        id: "ja",
        label: "Ja, wir nehmen Geld auf",
        hint: "Tempo kaufen, Anteile und Mitsprache bezahlen.",
        effects: { investors: 12, team: -3 },
        alignmentBy: { bootstrap: -10, venture: 10 },
        setztKurs: "venture",
        beats: [
          "Du schreibst zurück: Donnerstag passt. Daraus werden drei weitere Termine im selben Monat.",
          "Ein Tag jeder Woche gehört ab jetzt Leuten, die nicht zahlen, sondern kaufen wollen. Dafür geht in sechs Monaten mehr, als Umsatz je bezahlen könnte.",
        ],
      },
      {
        id: "nein",
        label: "Nein, es trägt sich selbst oder gar nicht",
        hint: "Keine Anteile, kein Board, kein Termindruck von außen.",
        effects: { investors: -14, team: 6 },
        alignmentBy: { bootstrap: 12, venture: -14 },
        setztKurs: "bootstrap",
        beats: [
          "Du schreibst zurück, dass ihr erst mal weiter verkaufen wollt. Er antwortet freundlich und kurz.",
          "Die Investorenkarten liegen ab jetzt nicht mehr im Stapel. Was ihr verdient, gehört euch — und niemand bezahlt die Monate, in denen Haulway Geld hat und ihr nicht.",
        ],
      },
      {
        id: "zuhoeren",
        label: "Hingehen und nur zuhören",
        hint: "Kennenlernen, nichts zusagen.",
        effects: { investors: 4, team: -2 },
        beats: [
          "Zwei Stunden Kaffee, keine Zusage, abends ein Term Sheet im Anhang „nur zur Info“.",
          "Jetzt wisst ihr, was eine Runde kosten würde. Entschieden ist nichts — die Frage kommt wieder, wenn das Geld knapp wird.",
        ],
      },
    ],
    when: (s) => s.milestoneId === "geld" && s.kurs === "offen",
  },
  {
    id: "rechtsform",
    art: "struktur",
    kicker: "Beim Notar",
    title: "Palettio gibt es offiziell noch nicht",
    beats: [
      "Ole braucht eine Rechnung mit Steuernummer. Bisher ist Palettio zwei Namen, ein gemeinsames Konto und eine Domain.",
      "Was ihr hier wählt, steht in jedem Vertrag der nächsten Jahre — und in jeder Due Diligence.",
    ],
    begriffe: [
      {
        wort: "Due Diligence",
        erklaerung:
          "Die Prüfung vor einer Finanzierung: Anwälte gehen jeden Vertrag, jede Rechnung und jede Zusage durch, die ihr je gemacht habt. Was hier unsauber ist, kostet dort Geld oder den Deal.",
      },
    ],
    wege: [
      {
        id: "gmbh",
        label: "Eine GmbH gründen",
        hint: "25.000 € Stammkapital, die Hälfte davon eingezahlt. Notar, Handelsregister, Buchhaltung.",
        effects: { cash: -2_100, burn: 260, investors: 7, team: 3 },
        beats: [
          "Zwei Notartermine in der Neustadt, drei Wochen bis zum Eintrag, 2.100 € für Notar und Register.",
          "Das Stammkapital bleibt euer Geld — nur eben das der Firma. Dafür haftet ab jetzt sie und nicht ihr, und die Buchhaltung kostet jeden Monat.",
        ],
      },
      {
        id: "ug",
        label: "Eine UG, das reicht erst mal",
        hint: "Geht ab 1 € Stammkapital, sonst fast dasselbe. Schneller und billiger.",
        effects: { cash: -800, burn: 180, investors: -3 },
        beats: [
          "Musterprotokoll, ein Termin, nach zehn Tagen eingetragen.",
          "Auf jedem Briefkopf steht „haftungsbeschränkt“, und ein Viertel vom Gewinn müsst ihr stehen lassen, bis 25.000 € zusammen sind. Ein Einkäufer fragt nach.",
        ],
      },
      {
        id: "gbr",
        label: "Erst mal als GbR weiter",
        hint: "Keine Gründung, keine Kosten. Ihr beide seid die Firma.",
        effects: { investors: -8, team: -3, cash: 400 },
        beats: [
          "Ihr schreibt die Rechnung als Gesellschaft bürgerlichen Rechts. Hat zehn Minuten gedauert und nichts gekostet.",
          "Ihr haftet beide persönlich, mit allem, was ihr habt. Solange nichts passiert, fällt das niemandem auf.",
        ],
      },
    ],
    when: (s) => s.mrr > 0,
  },
  {
    id: "kommunikation",
    art: "streit",
    kicker: "Streit",
    title: "Zwei Wochen nur über Aufgaben geredet",
    beats: [
      "Das letzte Gespräch zwischen euch, in dem es nicht um ein Ticket oder einen Kunden ging, war vor zwei Wochen.",
      "Jonas antwortet seit Tagen kürzer als früher. Du hast es gemerkt und nichts gesagt.",
    ],
    wege: [
      {
        id: "freitags",
        label: "Freitags eine halbe Stunde, fest",
        hint: "Kein Laptop, keine Liste. Nur: wie läuft es.",
        effects: { team: 13, alignment: 8, product: -3 },
        beats: [
          "Freitag 16 Uhr, im Hinterhof, dreißig Minuten.",
          "Am vierten Freitag erzählt er, dass er seit sechs Wochen überlegt aufzuhören. Jetzt weißt du es, solange es noch zu klären ist.",
        ],
      },
      {
        id: "durchziehen",
        label: "Dafür ist gerade keine Zeit",
        hint: "Erst der Pilot, dann reden.",
        effects: { team: -11, product: 7 },
        beats: [
          "Zwei Wochen, in denen mehr fertig wird als im Monat davor.",
          "Dann sagt er einen Kundentermin ab, von dem du nichts wusstest. Gesagt wird weiter nichts.",
        ],
      },
    ],
    when: (s) => s.month >= 7 && s.team < 62,
  },
  {
    id: "holding",
    art: "struktur",
    kicker: "Bei der Steuerberaterin",
    title: "Wem gehören die Anteile?",
    beats: [
      "Sie fragt, ob die Anteile euch persönlich gehören sollen — oder je einer eigenen kleinen Gesellschaft, die nichts tut, außer sie zu halten.",
      "Die Frage ist langweilig und kostet zwei Nachmittage. Sie entscheidet, was bei einem Verkauf in zehn Jahren tatsächlich bei euch ankommt.",
    ],
    wege: [
      {
        id: "holdings",
        label: "Je eine Holding davor",
        hint: "Zwei weitere Gesellschaften, zwei weitere Jahresabschlüsse.",
        effects: { cash: -2_600, burn: 150, investors: 3 },
        beats: [
          "Zwei Notartermine, zwei Eintragungen, 2.600 € und ein verlorener Nachmittag.",
          "Bei einem Verkauf landet der Erlös zuerst in eurer Holding und wird erst versteuert, wenn ihr ihn euch auszahlt. Bis dahin kostet er nur Geld und Papier.",
        ],
      },
      {
        id: "direkt",
        label: "Direkt halten, einfacher",
        hint: "Ihr beide steht persönlich in der Gesellschafterliste.",
        effects: { team: 2 },
        beats: [
          "Keine weitere Gesellschaft, kein weiterer Abschluss, kein weiterer Termin.",
          "Einfacher in jedem Jahr außer einem: dem, in dem verkauft wird. Dann ist alles sofort fällig.",
        ],
      },
    ],
    when: (s) => s.entschieden.includes("rechtsform") && s.cash >= 60_000,
  },
  {
    id: "vsop",
    art: "struktur",
    kicker: "Nach dem Montagstermin",
    title: "Marie fragt, was sie davon hat",
    beats: [
      "„Ich komme von einer Frachtbörse zu vier Leuten in Ottensen. Wenn das hier groß wird — was habe ich davon?“",
      "Sie hat recht, und sie ist nicht die Letzte, die fragt.",
    ],
    begriffe: [
      {
        wort: "VSOP",
        erklaerung:
          "Virtuelle Anteile: ein Vertrag, der sich bei einem Verkauf wie echte Anteile auszahlt, ohne dass jemand zum Notar muss oder mitbestimmen darf. In Deutschland der Normalfall.",
      },
    ],
    wege: [
      {
        id: "pool",
        label: "6 % virtuelle Anteile (VSOP)",
        hint: "Kein Notar, keine Gesellschafterin. Geld gibt es, wenn verkauft wird.",
        effects: { equity: -6, team: 12, investors: 5 },
        beats: [
          "Ein Vertrag pro Person, vier Jahre, ein Jahr Sperrfrist. Marie bekommt 1,5 %.",
          "Sechs Prozent sind weg, bevor ein Investor einen Euro bezahlt hat. Dafür fragt die nächste Kandidatin zuerst nach dem Pool — und bleibt.",
        ],
      },
      {
        id: "echte",
        label: "Echte Anteile: 2 % für Marie",
        hint: "Notartermin, Gesellschafterliste, volles Stimmrecht.",
        effects: { equity: -2, team: 8, investors: -5, cash: -1_300 },
        beats: [
          "Ab Mittwoch steht sie im Handelsregister.",
          "Bei jeder künftigen Runde muss sie mit unterschreiben. Der nächste Konflikt ist kein Personalgespräch mehr, sondern eine Gesellschafterversammlung.",
        ],
      },
      {
        id: "gehalt",
        label: "Mehr Gehalt statt Anteile",
        hint: "900 € mehr im Monat, ab sofort.",
        effects: { burn: 1_400, team: 5 },
        beats: [
          "900 € mehr, zugesagt in zehn Minuten, ohne Notar.",
          "Kostet jeden Monat Geld statt einmal Prozente. Nach achtzehn Monaten habt ihr mehr bezahlt als der Pool gekostet hätte — und sie hat nichts, wenn es gut ausgeht.",
        ],
      },
    ],
    when: (s) => s.leute.length >= 3,
  },
];

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
    beats: [
      "Zweihundert Wörter über Leerfahrten in der größten Branchenzeitung, mit eurem Namen.",
      "Vier Speditionen wollen bis Freitag eine Demo. Eine davon bleibt.",
    ],
    effects: { customers: 1, mrr: 890, investors: 4 },
    /* Kein geschenkter Kunde, bevor ihr selbst einen geholt habt. */
    when: (s) => s.customers >= 1,
  },
  {
    id: "rostock",
    title: "Ein Lkw fährt nach Rostock statt Rotterdam",
    beats: [
      "Ein Rundungsfehler im Matching, ein verlorener Tag.",
      "Jonas entschuldigt sich zwei Stunden lang. Sie bleiben und erzählen es weiter.",
    ],
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
    title: "Die Rechnung für den Nachtlauf",
    beats: ["Der nächtliche Durchlauf ist plötzlich neunmal so teuer.", "Jemand hat eine Schleife drin gelassen. 1.900 €."],
    effects: { cash: -1_900 },
    when: (s) => s.customers >= 2,
  },
  {
    id: "abwerbung",
    title: "Jemand will Jonas abwerben",
    beats: [
      "Ein Berliner Unternehmen bietet ihm 95.000 € und ein Team von sechs Leuten.",
      "Er sagt ab, bevor du davon erfährst. Danach wisst ihr beide, dass er sich entschieden hat — und das merkt man an jedem Montag danach.",
    ],
    effects: { team: 10, alignment: 6 },
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
    title: "Sofia wird abgeworben",
    beats: [
      "Haulway bietet ihr das Doppelte und ein Visum.",
      "Sie geht. Zwei Monate lang weiß niemand mehr, wie der Nachtlauf wirklich funktioniert.",
    ],
    effects: { verlassen: "entwicklung", product: -12, team: -10 },
    when: (s) => s.leute.some((p) => !p.gruender && p.rolle === "entwicklung"),
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

/* ── Übernahmeangebote ───────────────────────────────────────── */

/**
 * Vier Käufer, in der Reihenfolge, in der sie anrufen.
 *
 * Das erste Angebot ist eine Falle, und zwar eine faire: alles, was
 * man braucht, um es zu durchschauen, steht auf der Karte. Eine große
 * Zahl in der Überschrift, davon ein Fünftel in bar, der Rest an
 * Bedingungen geknüpft, die der Käufer selbst festlegt. Wer gelernt
 * hat, zuerst nach dem Betrag am Tag der Unterschrift zu fragen,
 * sieht es sofort. Wer nur „1,4 Mio.“ liest, unterschreibt.
 */
export const ANGEBOTE: Angebot[] = [
  {
    id: "boerse-kauf",
    kaeufer: "Die Frachtbörse",
    kicker: "Ein Anruf am Dienstag",
    beats: [
      "Die Frachtbörse, über die eure Kunden heute Ladungen tauschen, will euch kaufen. Nicht beteiligen — kaufen.",
      "Ihr sitzt zu zweit in einer Küche und hattet 32.000 € Erspartes. Jetzt liegen 750.000 € auf dem Tisch.",
    ],
    warum: "Sie wollen nicht euer Produkt. Sie wollen, dass es das bei niemandem sonst gibt.",
    preis: (s) => Math.max(750_000, arr(s) * 12),
    /* 250.000 von 750.000 — der Rest hängt an ihren Zielen. */
    bar: 1 / 3,
    bedingungen: [
      "250.000 € bei Unterschrift, in bar.",
      "500.000 € als Earn-out über drei Jahre — zahlbar, wenn Umsatzziele erreicht werden, die danach sie festlegen.",
      "Ihr bleibt beide drei Jahre angestellt. Wer früher geht, verliert seinen Anteil am Earn-out.",
      "Das Produkt läuft unter ihrem Namen weiter. Euer Name verschwindet.",
    ],
    tarek: "Das Erste, was ich bei so einem Angebot mache: alles streichen, was nicht am Tag der Unterschrift auf dem Konto liegt. Dann bleiben 250.000 €, geteilt durch zwei, vor Steuern — gut zwei Jahresgehälter. Den Rest zahlt euch jemand, der danach eure Ziele festlegt.",
    absage: [
      "Ihr sagt ab. Jonas rechnet es an dem Abend noch dreimal durch.",
      "Zwei Wochen später erzählt es jemand weiter: Es gibt da zwei in Hamburg, die hatten ein Angebot und haben Nein gesagt. Das hört sich für Investoren anders an als für euch.",
    ],
    absageEffects: { investors: 8, team: -4 },
    link: { text: "Was ein Exit wirklich kostet — Exit Strategies", href: "/?tool=exits" },
    when: (s) => s.customers >= 3 && s.month >= 7,
  },
  {
    id: "konzern-kauf",
    kaeufer: "Eine Logistikgruppe aus Dortmund",
    kicker: "Nach vier Monaten Gesprächen",
    beats: [
      "Zweitausend eigene Lkw, elf Standorte, und seit anderthalb Jahren ein Digitalvorstand, der etwas vorzeigen muss.",
      "Sie haben euch erst als Kunde kennengelernt, dann als Partner. Jetzt liegt ein Term Sheet da.",
    ],
    warum: "Sie könnten es selbst bauen und wissen, dass sie zwei Jahre brauchen würden. Die zwei Jahre kaufen sie.",
    preis: (s) => Math.round(arr(s) * MARKT_VIELFACHES),
    bedingungen: [
      "Vollständig in bar, zahlbar bei Vollzug.",
      "Zwölf Monate Bleibeklausel, danach frei.",
      "Das Produkt läuft weiter, eure Kunden behalten ihre Verträge.",
      "Üblich in dieser Branche: das Sechsfache des Jahresumsatzes, wenn er wächst.",
    ],
    tarek: "Das ist der Preis, der in dieser Branche gezahlt wird. Jetzt die unangenehme Rechnung: schaut rechts, was davon bei euch ankommt, nachdem die Investoren ihre Präferenz genommen haben.",
    absage: [
      "Ihr sagt ab. Der Digitalvorstand nimmt es sportlich und bleibt in Kontakt.",
      "Ein Käufer, der einmal da war, ist der wahrscheinlichste Käufer beim nächsten Mal. Nur ist beim nächsten Mal auch sein Budget ein anderes.",
    ],
    absageEffects: { investors: 6, team: -3 },
    link: { text: "Welche Tür für euch offen ist — Exit Strategies", href: "/?tool=exits" },
    when: (s) => s.mrr >= 8_000 && s.month >= 12,
  },
  {
    id: "haulway-kauf",
    kaeufer: "Haulway",
    kicker: "Aus San Francisco",
    beats: [
      "Die vier aus San Francisco rufen an. Sie haben Geld, einen deutschen Vertrieb und keine deutschen Kunden.",
      "Ihr habt die Kunden. Das ist das ganze Gespräch.",
    ],
    warum: "Sie kaufen die zwei Jahre Vorsprung, die ihr im deutschen Markt habt — und nehmen sich damit den einzigen Wettbewerber vom Hof.",
    preis: (s) => Math.round(arr(s) * 4),
    bar: 2 / 3,
    bedingungen: [
      "Zwei Drittel in bar, ein Drittel in ihren Anteilen — bewertet zu ihrem letzten Preis.",
      "Das Team wird übernommen, das Produkt in achtzehn Monaten abgeschaltet.",
      "Eure Kunden wechseln auf ihr System. Zwei Drittel bleiben, sagen sie.",
    ],
    tarek: "Das Vierfache ist unter Marktpreis, und sie wissen, dass ihr das wisst. Sie bieten es trotzdem, weil sie der einzige Käufer sind, der schneller ist als ihr.",
    absage: [
      "Ihr sagt ab. Am selben Abend steht ihr Stellenangebot für einen Vertriebsleiter Deutschland online.",
      "Jetzt wisst ihr sicher, dass sie kommen. Das ist mehr, als ihr gestern wusstet, und weniger, als ihr gebrauchen könnt.",
    ],
    absageEffects: { investors: -4, team: 5 },
    link: { text: "Der Käufer, der aus einer Beziehung entsteht — Exit Strategies", href: "/?tool=exits" },
    when: (s) => s.rival >= 35 && s.mrr >= 6_000,
  },
  {
    id: "plattform-kauf",
    kaeufer: "Eine europäische Logistikplattform",
    kicker: "Das Angebot, auf das ihr gewartet habt",
    beats: [
      "Sie sind in sechs Ländern, ihr seid in dem einen, das ihnen fehlt. Der Vorstand war selbst in Hamburg.",
      "Sie bieten das Neunfache eures Jahresumsatzes. In bar.",
    ],
    warum: "Ihr seid nicht billig, und darum geht es nicht: Sie kaufen einen Markt, in dem sie sonst bei null anfangen müssten.",
    preis: (s) => Math.round(arr(s) * 9),
    bedingungen: [
      "Vollständig in bar.",
      "Sechs Monate Übergabe, danach seid ihr frei.",
      "Das Produkt wird ihr deutsches Angebot. Eure Leute bekommen Verträge.",
    ],
    tarek: "Das Neunfache zahlt niemand für ein Produkt. Das zahlt jemand für einen Markt, in dem ihr der schnellste Weg hinein seid. Solche Angebote kommen aus Beziehungen, nicht aus Prozessen.",
    absage: [
      "Ihr sagt ab und wollt es allein zu Ende bringen.",
      "Eine mutige Entscheidung, und eine, über die ihr in zwei Jahren entweder lacht oder nicht redet.",
    ],
    absageEffects: { investors: 10, team: -6 },
    link: { text: "Zehn Wege hinaus, und was jeder kostet — Exit Strategies", href: "/?tool=exits" },
    when: (s) => s.mrr >= 18_000,
  },
];

/* ── Haulway, San Francisco ──────────────────────────────────── */

export const RIVAL_STEPS: RivalStep[] = [
  {
    at: 17,
    label: "Haulway kommt bei Y Combinator rein",
    beats: [
      "Die vier aus San Francisco sind im W26-Jahrgang. Y Combinator ist das bekannteste Startup-Programm der Welt.",
      "500.000 $ und drei Monate Training für den Demo Day. Zwei Investoren von eurer Liste kennen sie jetzt schon.",
    ],
    effects: { investors: -6 },
  },
  {
    at: 27,
    label: "Demo Day",
    beats: [
      "Haulway pitcht vor vierhundert Investoren und sammelt 3 Mio. $ ein.",
      "Ihr Blogpost über Leerfahrten in Europa wird in eurer Branche geteilt. Von euren Kunden.",
    ],
    effects: { investors: -5, team: -4 },
  },
  {
    at: 35,
    label: "Haulway eröffnet in Berlin",
    beats: [
      "Zwei Leute, ein WeWork, deutsche Preisliste.",
      "Die Bremer Spedition, um die ihr euch fünf Monate bemüht habt, unterschreibt dort.",
    ],
    effects: { customers: -1, mrr: -890, investors: -7 },
  },
  {
    at: 43,
    label: "Haulway macht eine Series A",
    beats: [
      "18 Mio. $, angeführt von einem Fonds an der Sand Hill Road.",
      "Jedes Investorengespräch beginnt ab jetzt mit derselben Frage, und die handelt nicht von euch.",
    ],
    effects: { investors: -12, team: -6 },
  },
];

/* ── Enden ───────────────────────────────────────────────────── */

/**
 * Die Abrechnung unter dem Schlussbild.
 *
 * Drei Zahlen, in der Reihenfolge, in der sie wehtun: was auf dem
 * Schild stand, was davon wirklich geflossen ist, und was nach den
 * Präferenzen bei euch ankommt.
 */
function beleg(s: GameState): string {
  if (!s.verkauf) return "";
  const { schild, erloest } = s.verkauf;
  const a = erloes(erloest, s);
  const teile = [`${fmtEuro(schild)} stand im Angebot`];
  if (erloest < schild) teile.push(`${fmtEuro(erloest)} sind wirklich geflossen, der Rest hing an ihren Zielen`);
  if (a.praeferenz > 0) teile.push(`${fmtEuro(a.praeferenz)} gingen vorweg an Investoren`);
  teile.push(`bei euch beiden kamen ${fmtEuro(a.gruender)} an`);
  return teile.join(" · ");
}

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
    text: "Vier Gespräche über sechs Wochen, das letzte ist kurz. Er wollte eine andere Firma als die, die ihr gebaut habt — und ohne ihn kennt ihr niemanden in der Branche.",
    payout: () => "Die Kunden waren seine. Allein beendest du das hier nicht.",
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
    /* Jetzt eine echte Rechnung statt eines Satzes: was bei einem
       Verkauf zum Zehnfachen des Jahresumsatzes bei euch ankäme. */
    payout: (s) => {
      const a = erloes(arr(s) * 10, s);
      const gehoert = Math.round(s.equity);
      return `${fmtEuro(s.mrr)} Umsatz im Monat, ${s.customers} Speditionen, ${gehoert} % bei euch. Bei einem Verkauf zum Zehnfachen des Jahresumsatzes — ${fmtEuro(a.preis)} — kämen bei euch ${fmtEuro(a.gruender)} an${a.praeferenz > 0 ? `, weil ${fmtEuro(a.praeferenz)} vorweg an Investoren gehen` : ""}.`;
    },
  },
  {
    id: "profitabel",
    title: "Es trägt sich",
    tone: "win",
    image: "ending-indie",
    text: "Keine Runde nötig, kein Board, keine Frist. Genug Speditionen zahlen genug, dass alle Gehälter durchgehen und die Server langweilig sind. Das ist kein kleineres Ende als die Runde — nur eins, über das niemand schreibt.",
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
    id: "verkauft",
    title: "Verkauft",
    tone: "win",
    image: "ending-round",
    text: "Ein Notartermin, zwei Unterschriften, und eine Firma, die es seit drei Jahren gibt, gehört ab Freitag jemand anderem. Eure Kunden erfahren es am Montag aus einer Mail, die ihr selbst geschrieben habt.",
    payout: (s) => beleg(s),
  },
  {
    id: "verkauft-klein",
    title: "Verkauft, und klein geblieben",
    tone: "mixed",
    image: "ending-round",
    text: "Es ist ein Verkauf, und es ist kein Vermögen. Ihr habt drei Jahre gearbeitet, eine Firma gebaut, die funktioniert, und sie für eine Summe abgegeben, die eure alten Gehälter für ein paar Jahre ersetzt.",
    payout: (s) => beleg(s),
  },
  {
    id: "verkauft-leer",
    title: "Verkauft, und für euch bleibt nichts",
    tone: "loss",
    image: "ending-empty",
    text: "Der Verkauf geht durch, das Geld fließt, und keiner der Euros kommt bei euch an. Die Präferenzen der Investoren sind höher als der Preis — was auf eurem Anteilsschein steht, spielt dann keine Rolle mehr.",
    payout: (s) => beleg(s),
  },
  {
    id: "finanziert",
    title: "Finanziert und am Wachsen",
    tone: "win",
    image: "ending-round",
    text: "Das Geld ist da, die Kurve zeigt nach oben, und der Monat kostet mehr, als er einbringt — so ist das gedacht, solange jemand anders es bezahlt. Die nächste Frage ist dieselbe wie die letzte, nur mit einer Null mehr.",
    payout: (s) =>
      `${fmtEuro(s.mrr)} im Monat, ${s.customers} Speditionen, ${fmtEuro(s.cash)} auf dem Konto — und ${Math.round(s.equity)} % gehören noch euch.`,
  },
  {
    id: "stehen",
    title: "Immer noch da",
    tone: "mixed",
    image: "ending-empty",
    text: "Es läuft, ein paar Speditionen zahlen, und weder der Markt noch ein Investor hat sich zu euch entschieden.",
    payout: (s) =>
      `${s.month} Monate, ${fmtEuro(s.cash)} auf dem Konto, ${s.customers} Kunden. Haulway ist inzwischen ${
        s.rival >= 35 ? "in Berlin und redet mit euren Speditionen" : "finanziert und baut dasselbe"
      }.`,
  },
];

export const ENDING_BY_ID = Object.fromEntries(ENDINGS.map((e) => [e.id, e])) as Record<string, Ending>;

/**
 * Welches Ende zu dieser Partie passt.
 *
 * Vorher hing „Es trägt sich — keine Runde nötig, kein Board“ allein
 * am Umsatz: wer 2,5 Mio. aufgenommen hatte und 22.000 € im Monat
 * verbrannte, bekam trotzdem den Bootstrapper-Abschluss zu lesen und
 * erkannte seine eigene Partie nicht wieder. Jetzt zählt auch, wem die
 * Firma gehört und ob der Monat sich selbst bezahlt.
 */
export function pickEnding(s: GameState): string {
  if (s.cash <= 0) return "insolvent";
  if (s.alignment <= 0 && s.customers === 0) return "split";
  if (s.rival >= UEBERHOLT && s.customers < 6) return "outrun";
  if (s.equity <= 45 && s.mrr >= 8_000) return "acquihire";
  if (s.mrr >= 25_000 && s.investors >= 60) return "seriesa";
  /* „Es trägt sich“ bekommt nur, wer sich wirklich trägt — und wem die
     Firma noch weitgehend gehört. */
  if (saldo(s) >= 0 && s.equity >= 80 && s.mrr >= 10_000) return "profitabel";
  if (s.cash >= 300_000 || s.equity < 80) return "finanziert";
  return "stehen";
}
