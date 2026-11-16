/* ══════════════════════════════════════════════════════════════
   Spielprotokoll.

       node --experimental-strip-types scripts/simulator-protokoll.ts [strategie] [seed]

   Spielt eine ganze Partie und schreibt mit, was ein Spieler sieht:
   jeden Monat die Anzeigen links, die Liste rechts mit Begründung,
   warum etwas gesperrt ist, und jede Karte im Wortlaut.

   Der Balance-Lauf sagt, wie Partien ausgehen. Er sagt nicht, ob die
   Texte in der Reihenfolge, in der sie kommen, einen Sinn ergeben —
   ob erklärt wird, wer Ole ist, bevor er auftaucht, ob ein Abzug
   nachvollziehbar ist, ob man überhaupt eine Wahl hat. Dafür ist das
   hier: ein Mitschrieb zum Lesen, nicht zum Auswerten.

   Die Reihenfolge der Schritte spiegelt die Effekte in Simulator.tsx.
   Weicht sie ab, protokolliert das hier etwas anderes als das Spiel.
   ══════════════════════════════════════════════════════════════ */

import {
  applyEffects,
  beatsOf,
  blockedReason,
  canStart,
  deckFor,
  drawEntscheidung,
  drawEvent,
  entscheiden,
  erfolge,
  eventDue,
  finishTactic,
  fluss,
  fmtEuro,
  fmtEuroExakt,
  forcedEnding,
  frei,
  initialState,
  monateOhneUmsatz,
  rivalMove,
  saldo,
  startTactic,
  tickBoard,
  uhrMonate,
  woranSitzt,
  ROLLE_LABEL,
  type Entscheidung,
  type GameState,
  type Tactic,
  type Weg,
} from "../lib/simulator.ts";
import {
  ENDING_BY_ID,
  ENTSCHEIDUNGEN,
  ERFOLGE,
  EVENTS,
  INTRO,
  MILESTONES,
  MILESTONE_BY_ID,
  ONBOARDING,
  RIVAL_STEPS,
  TACTICS,
  pickEnding,
} from "../lib/simulator-scenes.ts";

const aus: string[] = [];
const schreib = (z = "") => aus.push(z);

/* ── Wie dieser Durchgang spielt ─────────────────────────────── */

type Stil = {
  name: string;
  /** Welche Maßnahme aus den startbaren. */
  waehlt: (deck: Tactic[], s: GameState) => Tactic;
  /** Welcher Weg bei einer Entscheidung. */
  nimmt: (e: Entscheidung, s: GameState) => Weg;
};

const erste = (d: Tactic[]) => d[0];

const STILE: Record<string, Stil> = {
  /* Nimmt, was oben steht. Der ahnungslose Durchgang. */
  oben: { name: "immer die oberste Karte", waehlt: erste, nimmt: (e) => e.wege[0] },
  /* Will kein fremdes Geld und versucht, aus Umsatz zu leben. */
  bootstrap: {
    name: "will ohne Investoren auskommen",
    waehlt: (deck) => {
      /* Keine Anteile, und Dauerkarten erst, wenn nichts anderes offen
         ist — so spielt jemand, der die Liste von oben liest. */
      const ohneAnteile = deck.filter((t) => (t.effects.equity ?? 0) === 0);
      const d = ohneAnteile.length ? ohneAnteile : deck;
      return d.find((t) => !t.repeatable) ?? d[0];
    },
    nimmt: (e) => e.wege.find((w) => /nein|still|warm|aufschreiben|vesting|gbr|direkt|pool/.test(w.id)) ?? e.wege[0],
  },
  /* Will so schnell wie möglich eine Runde. */
  venture: {
    name: "will so schnell wie möglich eine Runde",
    waehlt: (deck) =>
      deck.find((t) => t.group === "Geld" && !t.repeatable) ??
      deck.find((t) => !t.repeatable) ??
      deck[0],
    nimmt: (e) => e.wege.find((w) => /ja|raus|partner|vesting|gmbh|holdings|pool/.test(w.id)) ?? e.wege[0],
  },
};

const stil = STILE[process.argv[2] ?? "oben"] ?? STILE.oben;
const seed = Number(process.argv[3] ?? 7);

/* ── Was links steht ─────────────────────────────────────────── */

function anzeigen(s: GameState): string {
  const f = fluss(s);
  const u = uhrMonate(s);
  const posten = [
    ["Leben", f.leben],
    ["Gehälter", f.gehaelter],
    ["Kunden betreuen", f.betreuung],
    ["Server & Büro", f.sonstiges],
  ]
    .filter(([, v]) => (v as number) > 0)
    .map(([k, v]) => `${k} ${fmtEuro(v as number)}`)
    .join(" · ");
  const leute = s.leute
    .map((p) => {
      const r = woranSitzt(s, p);
      return `${p.name} (${ROLLE_LABEL[p.rolle]}, ${r ? `${TACTICS[r.id]?.label ?? r.id}, noch ${r.left}` : "frei"})`;
    })
    .join(" | ");
  return [
    `   UHR    ${u.monate}${u.gedeckelt ? "+" : ""} Monate Geld` +
      (f.rein > 0 ? `   · ohne Umsatz ${monateOhneUmsatz(s)} Monate` : ""),
    `   KONTO  ${fmtEuroExakt(s.cash)}   raus ${fmtEuro(f.raus)} · rein ${f.rein > 0 ? fmtEuro(f.rein) : "nichts"} · Saldo ${saldo(s) >= 0 ? "+" : "−"}${fmtEuro(Math.abs(saldo(s)))}`,
    `          ${posten}`,
    `   TEAM   ${leute}`,
    `   STAND  Produkt ${Math.round(s.product)}/100 · Kunden ${s.customers} · Stimmung ${Math.round(s.team)}/100 · Investoren ${Math.round(s.investors)}/100 · euch gehören ${Math.round(s.equity)} % · Haulway ${Math.round(s.rival)} %`,
  ].join("\n");
}

function liste(s: GameState, m: (typeof MILESTONES)[number]): string {
  const deck = deckFor(s, m, TACTICS);
  const zeilen = deck.map((t) => {
    const laeuft = s.running.find((r) => r.id === t.id);
    if (laeuft) return `   [läuft, noch ${laeuft.left}] ${t.label}`;
    if (!canStart(s, t)) return `   [gesperrt: ${blockedReason(s, t)}] ${t.label}`;
    const wer = t.braucht ? `${ROLLE_LABEL[t.braucht]} · ` : "";
    return `   [wählbar] ${t.label} — ${wer}${t.months} Mon.${t.cost ? ` · ${fmtEuro(t.cost)}` : " · kostet kein Geld"}`;
  });
  const freie = frei(s);
  const offen = deck.filter((t) => canStart(s, t));
  const warnung =
    freie.length && !offen.length
      ? `   !! ${freie.map((p) => p.name).join(", ")} ${freie.length === 1 ? "ist" : "sind"} frei, aber nichts ist wählbar\n`
      : "";
  return warnung + zeilen.join("\n");
}

/* ── Karten ──────────────────────────────────────────────────── */

function karte(kicker: string, titel: string | null, beats: string[], zusatz?: string) {
  schreib();
  schreib(`   ┌─ KARTE · ${kicker}`);
  if (titel) schreib(`   │  ${titel}`);
  for (const b of beats) if (b) schreib(`   │  „${b}“`);
  if (zusatz) schreib(`   │  ${zusatz}`);
  schreib(`   └─ [Weiterspielen]`);
  schreib();
}

const wirkung = (e: Record<string, unknown> | undefined) =>
  e
    ? Object.entries(e)
        .filter(([, v]) => v !== undefined && v !== 0)
        .map(([k, v]) => `${k} ${typeof v === "number" && v > 0 ? "+" : ""}${JSON.stringify(v)}`)
        .join(", ")
    : "";

/* ── Die Partie ──────────────────────────────────────────────── */

schreib("═".repeat(72));
schreib(`SPIELPROTOKOLL · ${stil.name} · Seed ${seed}`);
schreib("═".repeat(72));
schreib();
schreib("TITELBILDSCHIRM");
schreib(`   ${INTRO.who}`);
schreib("   Jede vierte Rückfahrt ist leer");
for (const l of INTRO.lines) schreib(`   ${l}`);
schreib();
schreib("ONBOARDING (Tarek, 7 Karten)");
ONBOARDING.forEach((z, i) => schreib(`   ${i + 1}. ${z.text}`));
schreib();

let s = initialState(seed);
let m = MILESTONE_BY_ID[s.milestoneId];
schreib("─".repeat(72));
schreib(`PHASE 1 VON ${MILESTONES.length}: ${m.title}`);
schreib(`   ${m.blurb}`);
schreib(`   Ziel: ${m.gateLabel}.`);
schreib("─".repeat(72));

let schutz = 0;
while (!s.endingId && schutz++ < 200) {
  m = MILESTONE_BY_ID[s.milestoneId];
  schreib();
  schreib(`▸ MONAT ${s.month} — ${m.title}`);
  schreib(anzeigen(s));
  schreib(liste(s, m));

  /* Entscheidung? Die blockiert alles andere, wie im Spiel. */
  const wahl = drawEntscheidung(s, ENTSCHEIDUNGEN);
  if (wahl) {
    schreib();
    schreib(`   ╔═ ENTSCHEIDUNG · ${wahl.kicker}`);
    schreib(`   ║  ${wahl.title}`);
    for (const b of wahl.beats) schreib(`   ║  „${b}“`);
    for (const b of wahl.begriffe ?? []) schreib(`   ║  [${b.wort}] ${b.erklaerung}`);
    for (const w of wahl.wege) {
      const preis = (w.effects.cash ?? 0) < 0 ? ` (${fmtEuro(w.effects.cash ?? 0)})` : "";
      schreib(`   ║   ( ) ${w.label}${preis} — ${w.hint}`);
    }
    const weg = stil.nimmt(wahl, s);
    schreib(`   ╚═ gewählt: ${weg.label}`);
    s = entscheiden(s, wahl, weg);
    karte(wahl.title, weg.label, [...weg.beats], `Wirkung: ${wirkung(weg.effects as Record<string, unknown>)}`);
    continue;
  }

  /* Eine Maßnahme starten, wenn jemand frei ist und etwas offen. */
  const startbar = deckFor(s, m, TACTICS).filter((t) => canStart(s, t));
  if (startbar.length) {
    const t = stil.waehlt(startbar, s) ?? startbar[0];
    schreib();
    schreib(`   → DETAILKARTE: ${t.label}`);
    schreib(`     ${t.flavour}`);
    schreib(
      `     ${t.braucht ? ROLLE_LABEL[t.braucht] : "irgendwer"} · ${t.months} Monate · ${t.cost ? fmtEuro(t.cost) : "kostet kein Geld"}`,
    );
    for (const b of t.begriffe ?? []) schreib(`     [${b.wort}] ${b.erklaerung}`);
    schreib(`     Wirkung laut Balken: ${Object.entries(t.impact).map(([k, v]) => `${k} ${v}/5`).join(", ")}`);
    if (t.preis) schreib(`     Preis: ${t.preis}`);
    schreib(`     → [Starten]`);
    s = startTactic(s, t);
    continue;
  }

  if (!s.running.length) {
    schreib("   !! nichts läuft und nichts ist startbar — das Spiel steht");
    break;
  }

  /* Ein Monat vergeht. */
  const vorher = s;
  const { state, done } = tickBoard(s);
  s = state;

  for (const id of done) {
    const t = TACTICS[id];
    if (!t) continue;
    s = finishTactic(s, t);
    karte(t.label, null, [...beatsOf(t, s.stance)], `Wirkung: ${wirkung(t.effects as Record<string, unknown>)}`);
  }

  const tot = forcedEnding(s);
  if (tot) {
    s = { ...s, endingId: tot };
    break;
  }

  /* Phasenwechsel. */
  const jetzt = MILESTONE_BY_ID[s.milestoneId];
  if (jetzt.gate(s)) {
    if (!jetzt.next) {
      s = { ...s, endingId: pickEnding(s) };
      break;
    }
    const naechste = MILESTONE_BY_ID[jetzt.next];
    s = { ...s, milestoneId: jetzt.next };
    const nr = MILESTONES.findIndex((x) => x.id === jetzt.next) + 1;
    karte(`Phase ${nr} von ${MILESTONES.length}`, naechste.title, [naechste.blurb, `Ziel: ${naechste.gateLabel}.`]);
  }

  /* Haulway. */
  const zug = rivalMove(s, RIVAL_STEPS);
  if (zug) {
    s = applyEffects({ ...s, rivalSeen: [...s.rivalSeen, zug.at] }, zug.effects);
    karte("San Francisco", zug.label, [...zug.beats], `Wirkung: ${wirkung(zug.effects as Record<string, unknown>)}`);
  }

  /* Ereignis, aber nur wenn keine Entscheidung ansteht. */
  if (eventDue(s) && !drawEntscheidung(s, ENTSCHEIDUNGEN)) {
    const e = drawEvent(s, EVENTS);
    if (e) {
      s = applyEffects({ ...s, drawn: [...s.drawn, e.id], lastEvent: s.month }, e.effects);
      karte("Dazwischen", e.title, [...e.beats], `Wirkung: ${wirkung(e.effects as Record<string, unknown>)}`);
    }
  }

  /* Erfolge. */
  for (const e of erfolge(vorher, s, ERFOLGE)) {
    s = { ...s, gefeiert: [...s.gefeiert, e.id] };
    karte("Geschafft", e.title, [...e.beats]);
  }
}

const ende = ENDING_BY_ID[s.endingId ?? pickEnding(s)];
schreib();
schreib("═".repeat(72));
schreib(`ENDE: ${ende.title} (${ende.tone})`);
schreib(`   ${ende.text}`);
if (ende.payout) schreib(`   ${ende.payout(s)}`);
schreib(`   nach ${s.month} Monaten`);
schreib("═".repeat(72));

console.log(aus.join("\n"));
