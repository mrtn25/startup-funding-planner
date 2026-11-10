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
  drawEvent,
  erfolge,
  eventDue,
  finishTactic,
  fmtEuro,
  forcedEnding,
  initialState,
  meterViews,
  rivalMove,
  runway,
  runwayFill,
  saldo,
  startTactic,
  tickBoard,
  type Effects,
  type GameState,
  type Running,
  type Tactic,
} from "@/lib/simulator";
import {
  ENDING_BY_ID,
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
  const [paused, setPaused] = useState(false);

  const card = cards[0] ?? null;
  const milestone = MILESTONE_BY_ID[state.milestoneId] ?? MILESTONES[0];
  const index = MILESTONES.findIndex((m) => m.id === milestone.id);
  const deck = useMemo(() => deckFor(state, milestone, TACTICS), [state, milestone]);
  const months = runway(state);
  const ending = state.endingId ? ENDING_BY_ID[state.endingId] : null;
  const running = phase === "spiel" && !paused && !card && !detail && !state.endingId;

  const phasenKarte = useCallback((id: string): Card => {
    const m = MILESTONE_BY_ID[id];
    return {
      kind: "phase",
      kicker: `Phase ${MILESTONES.findIndex((x) => x.id === id) + 1} von ${MILESTONES.length}`,
      title: m.title,
      image: m.image,
      beats: [m.blurb, `Ziel: ${m.gateLabel}.`],
    };
  }, []);

  const weiterSchalten = useCallback(
    (s: GameState): { state: GameState; karten: Card[] } => {
      const karten: Card[] = [];
      const m = MILESTONE_BY_ID[s.milestoneId];
      if (!m || !m.gate(s)) return { state: s, karten };
      if (!m.next) return { state: { ...s, endingId: pickEnding(s) }, karten };
      const naechste = MILESTONE_BY_ID[m.next];
      const bei = naechste.onEnter;
      const feuert = bei && (!bei.when || bei.when(s));
      karten.push(phasenKarte(m.next));
      if (feuert) {
        karten.push({ kind: "ereignis", kicker: "Montagmorgen", title: bei!.title, beats: [...bei!.beats], summary: bei!.effects });
      }
      return { state: { ...(feuert ? applyEffects(s, bei!.effects) : s), milestoneId: m.next }, karten };
    },
    [phasenKarte],
  );

  /* Die Uhr. Der Intervall-Callback tut genau eine Sache: einen Monat
     weiterschalten. Alles, was daraus folgt, passiert im Effekt darunter. */
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setState((s) => tickBoard(s).state), MS_PER_MONTH);
    return () => window.clearInterval(id);
  }, [running]);

  /* Was fertig geworden ist: auflösen, Karten zeigen, Phase prüfen. */
  useEffect(() => {
    if (!state.justDone.length) return;
    setState((s) => {
      let next = { ...s, justDone: [] as string[] };
      const neue: Card[] = [];
      for (const id of s.justDone) {
        const t = TACTICS[id];
        if (!t) continue;
        next = finishTactic(next, t);
        neue.push({
          kind: "ergebnis",
          kicker: t.label,
          beats: [...beatsOf(t, next.stance)],
          summary: { ...t.effects, cash: (t.effects.cash ?? 0) - (t.cost ?? 0) || undefined },
        });
      }
      const tot = forcedEnding(next);
      if (tot) {
        queueMicrotask(() => setCards((cs) => [...cs, ...neue]));
        return { ...next, endingId: tot };
      }
      const { state: weiter, karten } = weiterSchalten(next);
      queueMicrotask(() => setCards((cs) => [...cs, ...neue, ...karten]));
      return weiter;
    });
  }, [state.justDone, weiterSchalten]);

  /* Haulway meldet sich selbst — kein Dauerbalken oben. */
  useEffect(() => {
    if (!running) return;
    const zug = rivalMove(state, RIVAL_STEPS);
    if (!zug) return;
    setState((s) => applyEffects({ ...s, rivalSeen: [...s.rivalSeen, zug.at] }, zug.effects));
    setCards((cs) => [
      ...cs,
      { kind: "rivale", kicker: "San Francisco", title: zug.label, image: "sf", beats: [...zug.beats], summary: zug.effects },
    ]);
    setBeat(0);
  }, [state, running]);

  useEffect(() => {
    if (!running || !eventDue(state)) return;
    const e = drawEvent(state, EVENTS);
    if (!e) return;
    setState((s) => applyEffects({ ...s, drawn: [...s.drawn, e.id], lastEvent: s.month }, e.effects));
    setCards((cs) => [...cs, { kind: "ereignis", kicker: "Dazwischen", title: e.title, beats: [...e.beats], summary: e.effects }]);
    setBeat(0);
  }, [state, running]);

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
    setCards((cs) => [...cs, ...treffer.map((e) => ({ kind: "erfolg" as const, kicker: "Geschafft", title: e.title, beats: [...e.beats] }))]);
  }, [state]);

  const starten = (t: Tactic) => {
    setDetail(null);
    setState((s) => startTactic(s, t));
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
    setState(initialState(Math.floor(Math.random() * 1000)));
    setCards([]);
    setBeat(0);
    setStep(0);
    setDetail(null);
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
          <Uhr months={months} fill={runwayFill(state)} cash={state.cash} monat={state.month} saldoWert={saldo(state)} knapp={knapp} tickt={tickt} />

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
 * Drei Dinge auf einmal, weil sie zusammengehören: der Ring zeigt, wie
 * viel Luft noch da ist, der Zeiger dreht sich in Echtzeit, damit man
 * sieht, dass gerade Zeit vergeht, und darunter steht als eine Zahl,
 * ob der Monat gegen euch läuft oder für euch. Das Letzte fehlte: ein
 * Runway von neun Monaten sagt nicht, ob er steigt oder fällt, und der
 * erste zahlende Kunde war dadurch unsichtbar.
 */
function Uhr({
  months,
  fill,
  cash,
  monat,
  saldoWert,
  knapp,
  tickt,
}: {
  months: number;
  fill: number;
  cash: number;
  monat: number;
  saldoWert: number;
  knapp: boolean;
  tickt: boolean;
}) {
  const UMFANG = 2 * Math.PI * 42;
  const anteil = Math.max(0, Math.min(1, fill));
  const waechst = saldoWert >= 0;
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
      <div className={`${styles.saldo} ${waechst ? styles.saldoAuf : styles.saldoAb}`}>
        <strong>
          {waechst ? "+" : "−"}
          {fmtEuro(Math.abs(saldoWert))}
        </strong>
        <span>{waechst ? "mehr rein als raus" : "jeden Monat weniger"}</span>
      </div>
      <div className={styles.konto}>
        {fmtEuro(cash)} · Monat {monat}
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
