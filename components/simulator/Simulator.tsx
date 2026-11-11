"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import styles from "./Simulator.module.css";
import {
  applyEffects,
  badges,
  beatsOf,
  blockedReason,
  canStart,
  capacity,
  deckFor,
  drawEntscheidung,
  drawEvent,
  entscheiden,
  entscheidungDue,
  erfolge,
  eventDue,
  finishTactic,
  fluss,
  fmtEuro,
  fmtEuroExakt,
  forcedEnding,
  geldSkala,
  initialState,
  meterViews,
  reifegrad,
  rivalMove,
  runway,
  runwayFill,
  saldo,
  startTactic,
  tickBoard,
  type Effects,
  type Entscheidung,
  type GameState,
  type Running,
  type Tactic,
  type Weg,
} from "@/lib/simulator";
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
} from "@/lib/simulator-scenes";

/** Ein Spielmonat in Echtzeit. Die Uhr läuft, während du die Liste
    liest — das ist der Druck. Elf Sekunden, weil die Liste kurz ist. */
const MS_PER_MONTH = 11_000;

/* Der Zeiger dreht genau eine Runde pro Spielmonat. Die Uhr muss sich
   bewegen, während man liest — eine Zahl, die alle elf Sekunden
   umspringt, sieht nicht aus wie Zeitdruck. */
const TAKT = { "--monat": `${MS_PER_MONTH}ms` } as React.CSSProperties;

type Card = {
  /** Eindeutig pro Vorkommnis. Dieselbe Karte kommt damit nie zweimal. */
  key: string;
  kind: "ergebnis" | "ereignis" | "phase" | "rivale" | "erfolg";
  kicker: string;
  title?: string;
  image?: string;
  beats: string[];
  summary?: Effects;
};

type Phase = "titel" | "onboarding" | "spiel" | "ende";

const GROUPS = ["Produkt", "Vertrieb", "Team", "Geld"];

/* Jede Gruppe hat ihr eigenes Bild, sonst sieht die Detailkarte aus
   wie die Phasenkarte davor und man hält sie für dieselbe Karte. */
const GRUPPENBILD: Record<string, string> = {
  Produkt: "kitchen-night",
  Vertrieb: "first-customer",
  Team: "first-hire",
  Geld: "angel-cafe",
};

/** Was auf der Zeile steht: wie lange es dauert und was es kostet. */
function metaVon(t: Tactic, laeuft?: Running): string {
  if (laeuft) return `noch ${laeuft.left} ${laeuft.left === 1 ? "Monat" : "Monate"}`;
  const dauer = `${t.months} ${t.months === 1 ? "Monat" : "Monate"}`;
  return t.cost ? `${dauer} · ${fmtEuro(t.cost)}` : `${dauer} · kostet kein Geld`;
}

export default function Simulator() {
  const [phase, setPhase] = useState<Phase>("titel");
  const [step, setStep] = useState(0);
  const [state, setState] = useState<GameState>(() => initialState(Date.now() % 1000));
  const [cards, setCards] = useState<Card[]>([]);
  const [beat, setBeat] = useState(0);
  const [detail, setDetail] = useState<Tactic | null>(null);
  const [wahl, setWahl] = useState<Entscheidung | null>(null);
  const [paused, setPaused] = useState(false);

  const card = cards[0] ?? null;
  const milestone = MILESTONE_BY_ID[state.milestoneId] ?? MILESTONES[0];
  const index = MILESTONES.findIndex((m) => m.id === milestone.id);
  const deck = useMemo(() => deckFor(state, milestone, TACTICS), [state, milestone]);
  const months = runway(state);
  const ending = state.endingId ? ENDING_BY_ID[state.endingId] : null;
  const running = phase === "spiel" && !paused && !card && !detail && !wahl && !state.endingId;

  /* Jeder Kartenschlüssel kommt genau einmal durch — und das ist keine
     Vorsicht, sondern die Reparatur: `reactStrictMode` ruft jeden
     State-Updater zweimal auf, und im Updater stand ein `setCards`.
     Ergebnis war, dass man „Weiterspielen“ drückte und dieselbe Karte
     noch einmal las. Seitdem wird vor dem Updater gerechnet und hier
     angehängt. */
  const gezeigt = useRef<Set<string>>(new Set());
  const zeigen = useCallback((neue: Card[]) => {
    const frisch = neue.filter((c) => !gezeigt.current.has(c.key));
    if (!frisch.length) return;
    for (const c of frisch) gezeigt.current.add(c.key);
    setCards((cs) => [...cs, ...frisch]);
  }, []);

  const phasenKarte = useCallback((id: string): Card => {
    const m = MILESTONE_BY_ID[id];
    return {
      key: `phase:${id}`,
      kind: "phase",
      kicker: `Phase ${MILESTONES.findIndex((x) => x.id === id) + 1} von ${MILESTONES.length}`,
      title: m.title,
      image: m.image,
      beats: [m.blurb, `Ziel: ${m.gateLabel}.`],
    };
  }, []);

  /* Die Uhr. Der Intervall-Callback tut genau eine Sache: einen Monat
     weiterschalten. Alles, was daraus folgt, passiert im Effekt darunter. */
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setState((s) => tickBoard(s).state), MS_PER_MONTH);
    return () => window.clearInterval(id);
  }, [running]);

  /* Was fertig geworden ist: auflösen und erzählen. Gerechnet wird vor
     dem setState, nicht darin — ein Updater mit Seiteneffekt wird im
     Strict Mode zweimal ausgeführt. */
  useEffect(() => {
    if (!state.justDone.length) return;
    let next: GameState = { ...state, justDone: [] };
    const neue: Card[] = [];
    for (const id of state.justDone) {
      const t = TACTICS[id];
      if (!t) continue;
      next = finishTactic(next, t);
      neue.push({
        key: `ergebnis:${id}@${state.month}`,
        kind: "ergebnis",
        kicker: t.label,
        beats: [...beatsOf(t, next.stance)],
        summary: { ...t.effects, cash: (t.effects.cash ?? 0) - (t.cost ?? 0) || undefined },
      });
    }
    setState(next);
    zeigen(neue);
  }, [state, zeigen]);

  /* Tor und Ende werden nach jeder Änderung geprüft, nicht nur wenn
     eine Maßnahme fertig wird. Vorher konnte ein Ereignis den zweiten
     Kunden bringen und das Brett blieb trotzdem in der alten Phase
     stehen, bis zufällig etwas anderes auslief. */
  useEffect(() => {
    if (phase !== "spiel" || state.endingId || state.justDone.length) return;
    const tot = forcedEnding(state);
    if (tot) {
      setState((s) => ({ ...s, endingId: tot }));
      return;
    }
    const m = MILESTONE_BY_ID[state.milestoneId];
    if (!m || !m.gate(state)) return;
    if (!m.next) {
      setState((s) => ({ ...s, endingId: pickEnding(s) }));
      return;
    }
    const bei = MILESTONE_BY_ID[m.next].onEnter;
    const feuert = !!bei && (!bei.when || bei.when(state));
    setState((s) => ({ ...(feuert ? applyEffects(s, bei!.effects) : s), milestoneId: m.next! }));
    zeigen([
      phasenKarte(m.next),
      ...(feuert
        ? [
            {
              key: `enter:${m.next}`,
              kind: "ereignis" as const,
              kicker: "Montagmorgen",
              title: bei!.title,
              beats: [...bei!.beats],
              summary: bei!.effects,
            },
          ]
        : []),
    ]);
  }, [state, phase, zeigen, phasenKarte]);

  /* Haulway meldet sich selbst — kein Dauerbalken oben. */
  useEffect(() => {
    if (!running) return;
    const zug = rivalMove(state, RIVAL_STEPS);
    if (!zug) return;
    setState((s) => applyEffects({ ...s, rivalSeen: [...s.rivalSeen, zug.at] }, zug.effects));
    zeigen([
      { key: `rivale:${zug.at}`, kind: "rivale", kicker: "San Francisco", title: zug.label, image: "sf", beats: [...zug.beats], summary: zug.effects },
    ]);
    setBeat(0);
  }, [state, running, zeigen]);

  /* Entscheidungen haben Vorrang vor Ereignissen: eine Frage, die man
     beantworten muss, ist wichtiger als ein Zufall, der einem zustößt. */
  useEffect(() => {
    if (!running || wahl || !entscheidungDue(state)) return;
    const e = drawEntscheidung(state, ENTSCHEIDUNGEN);
    if (e) setWahl(e);
  }, [state, running, wahl]);

  useEffect(() => {
    if (!running || !eventDue(state)) return;
    if (entscheidungDue(state) && drawEntscheidung(state, ENTSCHEIDUNGEN)) return;
    const e = drawEvent(state, EVENTS);
    if (!e) return;
    setState((s) => applyEffects({ ...s, drawn: [...s.drawn, e.id], lastEvent: s.month }, e.effects));
    zeigen([{ key: `ereignis:${e.id}`, kind: "ereignis", kicker: "Dazwischen", title: e.title, beats: [...e.beats], summary: e.effects }]);
    setBeat(0);
  }, [state, running, zeigen]);

  /* Erfolge: Übergänge, nicht Zustände. Deshalb der Vergleich mit dem
     vorigen Zustand statt einer Bedingung im Tick — die erste bezahlte
     Rechnung kann aus einer Maßnahme kommen, aus einem Ereignis oder
     aus einer Phase, und sie soll in allen drei Fällen gefeiert werden. */
  const vorher = useRef(state);
  useEffect(() => {
    const treffer = erfolge(vorher.current, state, ERFOLGE);
    vorher.current = state;
    if (!treffer.length) return;
    setState((s) => ({ ...s, gefeiert: [...s.gefeiert, ...treffer.map((e) => e.id)] }));
    zeigen(treffer.map((e) => ({ key: `erfolg:${e.id}`, kind: "erfolg" as const, kicker: "Geschafft", title: e.title, beats: [...e.beats] })));
  }, [state, zeigen]);

  const starten = (t: Tactic) => {
    setDetail(null);
    setState((s) => startTactic(s, t));
  };

  /* Einen Weg nehmen. Die Folge steht auf einer Karte wie jede andere,
     damit eine Entscheidung sich nicht beiläufiger anfühlt als eine
     Maßnahme, die zwei Monate gelaufen ist. */
  const nehmen = (e: Entscheidung, w: Weg) => {
    setWahl(null);
    setState((s) => entscheiden(s, e, w));
    zeigen([
      { key: `wahl:${e.id}`, kind: "ergebnis", kicker: e.title, title: w.label, beats: [...w.beats], summary: w.effects },
    ]);
    setBeat(0);
  };

  const weiter = () => {
    if (!card) return;
    if (beat + 1 < card.beats.length) {
      setBeat(beat + 1);
      return;
    }
    setCards((cs) => cs.slice(1));
    setBeat(0);
  };

  useEffect(() => {
    if (state.endingId && !card) setPhase("ende");
  }, [state.endingId, card]);

  const neustart = () => {
    gezeigt.current = new Set();
    setState(initialState(Math.floor(Math.random() * 1000)));
    setCards([]);
    setBeat(0);
    setStep(0);
    setDetail(null);
    setWahl(null);
    setPaused(false);
    setPhase("titel");
  };

  /* ── Titel ── */
  if (phase === "titel") {
    return (
      <div className={styles.app}>
        <div className={styles.sheet}>
          <Bild src="kitchen-night" alt="Lena und Jonas" className={styles.titelBild} />
          <div className={styles.sheetBody}>
            <div className={styles.who}>{INTRO.who}</div>
            <h1>Jede vierte Rückfahrt ist leer</h1>
            {INTRO.lines.map((l) => (
              <p key={l.slice(0, 16)}>{l}</p>
            ))}
            <button type="button" className={styles.primary} onClick={() => setPhase("onboarding")}>
              Los geht&apos;s
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Onboarding ── */
  if (phase === "onboarding") {
    const satz = ONBOARDING[step];
    const letzter = step === ONBOARDING.length - 1;
    return (
      <div className={styles.app} style={TAKT}>
        <div className={styles.blurred} aria-hidden="true">
          <Board
            state={state}
            months={months}
            milestone={milestone}
            index={index}
            deck={deck}
            paused
            tickt={false}
            onPause={() => {}}
            onPick={() => {}}
          />
        </div>
        <button
          type="button"
          className={styles.coach}
          onClick={() => {
            if (!letzter) return setStep(step + 1);
            setCards([phasenKarte(MILESTONES[0].id)]);
            setBeat(0);
            setPhase("spiel");
          }}
        >
          <span className={styles.coachFigure}>
            <Image src="/game/mentor.jpg" alt="Tarek" fill sizes="300px" className={styles.coachImg} priority />
          </span>
          <span className={styles.bubble}>
            {satz.highlight ? (
              <>
                {satz.text.split(satz.highlight)[0]}
                <em>{satz.highlight}</em>
                {satz.text.split(satz.highlight)[1]}
              </>
            ) : (
              satz.text
            )}
          </span>
          <span className={styles.coachHint}>{letzter ? "Tippen und anfangen" : `Weiter · ${step + 1}/${ONBOARDING.length}`}</span>
        </button>
      </div>
    );
  }

  /* ── Ende ── */
  if (phase === "ende" && ending) {
    return (
      <div className={styles.app}>
        <div className={styles.sheet}>
          <Bild src={ending.image} alt={ending.title} className={styles.titelBild} />
          <div className={styles.sheetBody}>
            <div className={`${styles.tag} ${styles[ending.tone]}`}>
              {ending.tone === "win" ? "Gutes Ende" : ending.tone === "loss" ? "Hier ist Schluss" : "Dazwischen"}
            </div>
            <h2>{ending.title}</h2>
            <p>{ending.text}</p>
            {ending.payout && <p className={styles.payout}>{ending.payout(state)}</p>}
            <button type="button" className={styles.primary} onClick={neustart}>
              Nochmal, anders
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Brett ── */
  return (
    <div className={styles.app} style={TAKT}>
      <Board
        state={state}
        months={months}
        milestone={milestone}
        index={index}
        deck={deck}
        paused={paused}
        tickt={running}
        onPause={() => setPaused((p) => !p)}
        onPick={(t) => setDetail(t)}
      />

      {detail && (
        <div className={styles.overlay}>
          <div className={styles.detail}>
            <Bild src={GRUPPENBILD[detail.group] ?? milestone.image} alt="" className={styles.detailBild} />
            <div className={styles.detailBody}>
              <h3>{detail.label}</h3>
              <p>{detail.flavour}</p>
              <div className={styles.detailMeta}>
                <span className={styles.dauer}>
                  Dauer: {detail.months} {detail.months === 1 ? "Monat" : "Monate"}
                </span>
                {detail.cost ? (
                  <span className={styles.kosten}>Kosten: {fmtEuro(detail.cost)}</span>
                ) : (
                  <span className={styles.gratis}>Kostet kein Geld</span>
                )}
              </div>
              <Wirkung t={detail} />
              <div className={styles.detailActions}>
                <button type="button" className={styles.ghost} onClick={() => setDetail(null)}>
                  Zurück
                </button>
                <button
                  type="button"
                  className={styles.primary}
                  disabled={!canStart(state, detail)}
                  onClick={() => starten(detail)}
                >
                  {canStart(state, detail) ? "Starten" : (blockedReason(state, detail) ?? "Geht nicht")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {wahl && !card && (
        <div className={styles.overlay}>
          <div className={styles.detail}>
            <div className={styles.detailBody}>
              <div className={`${styles.kicker} ${wahl.art === "streit" ? styles.kickerEvent : ""}`}>{wahl.kicker}</div>
              <h3>{wahl.title}</h3>
              {wahl.beats.map((b) => (
                <p key={b.slice(0, 20)}>{b}</p>
              ))}

              {/* Bei der Frage nach fremdem Geld steht daneben, was davon
                  heute schon stimmt. „Sind wir bereit“ ist in Wahrheit
                  fünf Fragen, und die beantwortet man nicht im Gefühl. */}
              {wahl.art === "weg" && (
                <div className={styles.reife}>
                  <strong>Was Oltmanns sehen wird</strong>
                  {reifegrad(state).map((p) => (
                    <span key={p.label} className={p.ok ? styles.reifeJa : styles.reifeNein}>
                      <i aria-hidden="true">{p.ok ? "✓" : "–"}</i>
                      {p.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Was ein Weg kostet, steht drauf — und wenn das Geld
                  dafür nicht reicht, ist er zu. In jeder Frage gibt es
                  mindestens einen Weg, der nichts kostet. */}
              <div className={styles.wege}>
                {wahl.wege.map((w) => {
                  const preis = w.effects.cash ?? 0;
                  const zuTeuer = preis < 0 && state.cash + preis <= 0;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      className={styles.wegBtn}
                      disabled={zuTeuer}
                      onClick={() => nehmen(wahl, w)}
                    >
                      <strong>
                        {w.label}
                        {preis < 0 && <em className={styles.wegPreis}>−{fmtEuro(Math.abs(preis))}</em>}
                      </strong>
                      <span>{zuTeuer ? "Dafür reicht das Geld nicht." : w.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {card && (
        <div className={styles.overlay}>
          <div className={styles.karte} onClick={weiter} role="presentation">
            {card.image && <Bild src={card.image} alt="" className={styles.karteBild} />}
            <div className={styles.karteBody}>
              <div
                className={`${styles.kicker} ${card.kind === "ereignis" ? styles.kickerEvent : ""} ${
                  card.kind === "rivale" ? styles.kickerRival : ""
                } ${card.kind === "erfolg" ? styles.kickerGut : ""}`}
              >
                {card.kicker}
              </div>
              {card.title && <h3>{card.title}</h3>}
              <p>{card.beats[beat]}</p>
              {beat === card.beats.length - 1 && card.summary && (
                <div className={styles.badges}>
                  {badges(card.summary).map((b) => (
                    <span key={b.label} className={`${styles.badge} ${b.up ? styles.up : styles.down}`}>
                      {b.label}
                    </span>
                  ))}
                </div>
              )}
              <button
                type="button"
                className={styles.weiterBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  weiter();
                }}
              >
                {beat + 1 < card.beats.length ? "Weiter" : "Weiterspielen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Das Brett: links die Anzeigen, rechts die Liste ─────────── */

function Board({
  state,
  months,
  milestone,
  index,
  deck,
  paused,
  tickt,
  onPause,
  onPick,
}: {
  state: GameState;
  months: number;
  milestone: (typeof MILESTONES)[number];
  index: number;
  deck: Tactic[];
  paused: boolean;
  tickt: boolean;
  onPause: () => void;
  onPick: (t: Tactic) => void;
}) {
  const knapp = isFinite(months) && months <= 6;
  const frei = capacity(state) - state.running.length;
  const gruppen = GROUPS.map((g) => ({ name: g, karten: deck.filter((t) => t.group === g) })).filter((g) => g.karten.length);

  return (
    <div className={styles.board}>
      <div className={styles.phases}>
        {MILESTONES.map((m, i) => (
          <span key={m.id} className={`${styles.phaseBar} ${i < index ? styles.phaseDone : ""} ${i === index ? styles.phaseNow : ""}`}>
            <em>{i === index ? m.title : ""}</em>
          </span>
        ))}
      </div>

      <div className={styles.boardMain}>
        <aside className={styles.rail}>
          <Uhr months={months} fill={runwayFill(state)} knapp={knapp} tickt={tickt} />
          <Geld state={state} tickt={tickt} />

          <div className={styles.stats}>
            {meterViews(state).map((v) => (
              <Stat key={v.key} view={v} />
            ))}
          </div>

          <button type="button" className={styles.pause} onClick={onPause} aria-label={paused ? "Weiter" : "Pause"}>
            {paused ? "▶" : "❚❚"}
          </button>
        </aside>

        <div className={styles.list}>
          <div className={styles.listHead}>
            <strong>{milestone.gateLabel}</strong>
            <span>
              {frei > 0
                ? `${frei} von ${capacity(state)} ${capacity(state) === 1 ? "Kopf" : "Köpfen"} frei`
                : "Beide beschäftigt — erst muss etwas fertig werden"}
            </span>
          </div>

          {gruppen.map((g) => (
            <div key={g.name} className={styles.group}>
              <div className={styles.groupName}>{g.name}</div>
              {g.karten.map((t) => {
                const laeuft = state.running.find((r) => r.id === t.id);
                const fertig = state.used.includes(t.id) && !laeuft;
                const gesperrt = !laeuft && !fertig && !canStart(state, t);
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`${styles.item} ${fertig ? styles.itemDone : ""} ${gesperrt ? styles.itemLocked : ""}`}
                    onClick={() => !fertig && onPick(t)}
                    disabled={fertig}
                  >
                    <Ring laeuft={laeuft} fertig={fertig} />
                    <span className={styles.itemText}>
                      <span className={styles.itemLabel}>{t.label}</span>
                      <span className={styles.itemMeta}>
                        {gesperrt ? (blockedReason(state, t) ?? metaVon(t)) : metaVon(t, laeuft)}
                      </span>
                    </span>
                    {laeuft && <span className={styles.itemLeft}>läuft</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Die große Uhr.
 *
 * Der Ring zeigt, wie viel Luft noch da ist, der Zeiger dreht sich in
 * Echtzeit, damit sichtbar Zeit vergeht, und in der Mitte steht, wie
 * viele Monate das Geld noch reicht. Was das Geld selbst tut, steht
 * darunter — siehe `Geld`.
 */
function Uhr({ months, fill, knapp, tickt }: { months: number; fill: number; knapp: boolean; tickt: boolean }) {
  const UMFANG = 2 * Math.PI * 42;
  const anteil = Math.max(0, Math.min(1, fill));
  const waechst = !isFinite(months);
  const striche = Array.from({ length: 12 }, (_, i) => {
    const w = (i * Math.PI) / 6;
    return { x1: 50 + 35 * Math.sin(w), y1: 50 - 35 * Math.cos(w), x2: 50 + 39 * Math.sin(w), y2: 50 - 39 * Math.cos(w) };
  });
  return (
    <div className={styles.uhr}>
      <div className={`${styles.zifferblatt} ${tickt ? "" : styles.uhrStop}`}>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="42" className={styles.uhrBahn} />
          <circle
            cx="50"
            cy="50"
            r="42"
            className={`${styles.uhrArc} ${waechst ? styles.uhrGut : knapp ? styles.uhrKnapp : ""}`}
            strokeDasharray={UMFANG}
            strokeDashoffset={UMFANG * (1 - anteil)}
          />
          {striche.map((st, i) => (
            <line key={i} {...st} className={styles.strich} />
          ))}
          <g className={styles.zeiger}>
            <line x1="50" y1="50" x2="50" y2="17" />
            <circle cx="50" cy="50" r="3.2" />
          </g>
        </svg>
        <span className={styles.uhrText}>
          <span className={`${styles.clock} ${knapp && !waechst ? styles.clockLow : ""}`}>{isFinite(months) ? months : "∞"}</span>
          <span className={styles.clockUnit}>
            Monate
            <br />
            Geld
          </span>
        </span>
      </div>
    </div>
  );
}

/**
 * Der Monatsfortschritt, 0 bis 1.
 *
 * Zurückgesetzt wird er am Monatswechsel, nicht beim Einhängen — so
 * bleibt er auf den echten Monat geheftet, statt langsam davonzulaufen.
 * Ein Intervall und kein `requestAnimationFrame`, weil die Vorschau in
 * einem versteckten Reiter läuft und rAF dort stillsteht; vier Schritte
 * pro Sekunde reichen für eine Zahl, die man beim Lesen fallen sieht.
 */
function useMonatsFluss(monat: number, tickt: boolean): number {
  const [p, setP] = useState(0);
  useEffect(() => {
    setP(0);
    if (!tickt) return;
    const start = Date.now();
    const id = window.setInterval(() => setP(Math.min(1, (Date.now() - start) / MS_PER_MONTH)), 250);
    return () => window.clearInterval(id);
  }, [monat, tickt]);
  return p;
}

/**
 * Das Geld.
 *
 * Die Uhr sagt, wie lange es noch reicht — nicht, dass gerade welches
 * weggeht. Also läuft die Zahl hier mit: sie zählt den Monat über nach
 * unten, Euro für Euro, und sobald Speditionen zahlen, zählt sie nach
 * oben und der Balken wird grün. Darunter steht beides getrennt, weil
 * „2.520 € weniger“ nicht erklärt, wofür — und weil man sehen soll,
 * dass der erste Kunde die Richtung ändert und nicht bloß eine Zahl.
 */
function Geld({ state, tickt }: { state: GameState; tickt: boolean }) {
  const p = useMonatsFluss(state.month, tickt);
  const { raus, rein } = fluss(state);
  const saldoWert = saldo(state);
  const waechst = saldoWert >= 0;
  /* Zwischen zwei Monatswechseln interpoliert: bei p = 1 steht genau
     der Betrag, mit dem der nächste Monat anfängt. */
  const jetzt = Math.max(0, state.cash + saldoWert * p);
  const anteil = Math.max(0.5, Math.min(100, (jetzt / geldSkala(state.cash)) * 100));

  return (
    <div className={styles.geld}>
      <div className={styles.geldKopf}>
        <span className={styles.geldLabel}>Konto</span>
        <span className={styles.geldMonat}>Monat {state.month}</span>
      </div>
      <strong className={`${styles.geldZahl} ${waechst ? styles.geldZahlAuf : ""}`}>{fmtEuroExakt(jetzt)}</strong>
      <div className={styles.geldBahn}>
        <i className={`${styles.geldFuellung} ${waechst ? styles.geldAuf : styles.geldAb}`} style={{ width: `${anteil}%` }} />
      </div>
      <div className={styles.fluss}>
        <span>
          <i className={styles.flussRaus} aria-hidden="true" />− {fmtEuro(raus)}
        </span>
        <span>
          <i className={styles.flussRein} aria-hidden="true" />
          {rein > 0 ? `+ ${fmtEuro(rein)}` : "nichts"}
        </span>
      </div>
      <div className={`${styles.saldo} ${waechst ? styles.saldoAuf : styles.saldoAb}`}>
        <strong>
          {waechst ? "+" : "−"}
          {fmtEuro(Math.abs(saldoWert))} im Monat
        </strong>
        <span>{waechst ? "mehr rein als raus" : "jeden Monat weniger"}</span>
      </div>
    </div>
  );
}

/** Der Kreis links neben jeder Maßnahme: leer, laufend, erledigt. */
function Ring({ laeuft, fertig }: { laeuft?: { left: number; total: number }; fertig: boolean }) {
  const UMFANG = 2 * Math.PI * 15;
  const anteil = laeuft ? Math.max(0, Math.min(1, 1 - laeuft.left / laeuft.total)) : 0;
  return (
    <span className={`${styles.ring} ${fertig ? styles.ringDone : ""} ${laeuft ? styles.ringRun : ""}`}>
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r="15" className={styles.ringBahn} />
        {laeuft && (
          <circle
            cx="18"
            cy="18"
            r="15"
            className={styles.ringFill}
            strokeDasharray={UMFANG}
            strokeDashoffset={UMFANG * (1 - anteil)}
          />
        )}
      </svg>
      {fertig && <span className={styles.check}>✓</span>}
      {laeuft && <span className={styles.ringZahl}>{laeuft.left}</span>}
    </span>
  );
}

function Stat({ view }: { view: ReturnType<typeof meterViews>[number] }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{view.label}</span>
      <strong className={`${styles.statValue} ${styles[view.tone]}`}>{view.value}</strong>
      {view.punkte !== undefined && (
        <span className={styles.punkteReihe} aria-hidden="true">
          {[1, 2, 3, 4, 5].map((i) => (
            <i key={i} className={i <= (view.punkte ?? 0) ? styles.punktAn : ""} />
          ))}
        </span>
      )}
      {view.note && <span className={styles.statNote}>{view.note}</span>}
    </div>
  );
}

/** Wirkung als Balken statt als Satz. */
function Wirkung({ t }: { t: Tactic }) {
  const labels: Record<string, string> = {
    produkt: "Produkt",
    umsatz: "Umsatz",
    geld: "Geld",
    team: "Team",
    investoren: "Investoren",
  };
  const eintraege = Object.entries(t.impact) as [string, number][];
  if (!eintraege.length) return null;
  return (
    <div className={styles.wirkung}>
      {eintraege.map(([k, n]) => (
        <div key={k} className={styles.wirkungZeile}>
          <span>{labels[k] ?? k}</span>
          <span className={styles.punkte}>
            {[1, 2, 3, 4, 5].map((i) => (
              <i key={i} className={i <= n ? styles.punktAn : ""} />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

function Bild({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={className} />;
  return (
    <div className={className}>
      <Image src={`/game/${src}.jpg`} alt={alt} fill sizes="(max-width: 700px) 100vw, 620px" className={styles.bildImg} onError={() => setFailed(true)} priority />
    </div>
  );
}
