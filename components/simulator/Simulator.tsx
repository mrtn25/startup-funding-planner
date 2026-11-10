"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  eventDue,
  finishTactic,
  fmtEuro,
  forcedEnding,
  initialState,
  meterViews,
  rivalMove,
  runway,
  startTactic,
  tickBoard,
  type Effects,
  type GameState,
  type Tactic,
} from "@/lib/simulator";
import {
  ENDING_BY_ID,
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

type Card = {
  kind: "ergebnis" | "ereignis" | "phase" | "rivale";
  kicker: string;
  title?: string;
  image?: string;
  beats: string[];
  summary?: Effects;
};

type Phase = "titel" | "onboarding" | "spiel" | "ende";

const GROUPS = ["Produkt", "Vertrieb", "Team", "Geld"];

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
      <div className={styles.app}>
        <div className={styles.blurred} aria-hidden="true">
          <Board
            state={state}
            months={months}
            milestone={milestone}
            index={index}
            deck={deck}
            paused
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
    <div className={styles.app}>
      <Board
        state={state}
        months={months}
        milestone={milestone}
        index={index}
        deck={deck}
        paused={paused}
        onPause={() => setPaused((p) => !p)}
        onPick={(t) => setDetail(t)}
      />

      {detail && (
        <div className={styles.overlay}>
          <div className={styles.detail}>
            <Bild src={milestone.image} alt="" className={styles.detailBild} />
            <div className={styles.detailBody}>
              <h3>{detail.label}</h3>
              <p>{detail.flavour}</p>
              <Wirkung t={detail} />
              <div className={styles.detailMeta}>
                <span>{detail.months} Mon.</span>
                {detail.cost ? <span className={styles.kosten}>{fmtEuro(detail.cost)}</span> : null}
              </div>
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
          <button type="button" className={styles.karte} onClick={weiter}>
            {card.image && <Bild src={card.image} alt="" className={styles.karteBild} />}
            <div className={styles.karteBody}>
              <div className={`${styles.kicker} ${card.kind === "ereignis" ? styles.kickerEvent : ""} ${card.kind === "rivale" ? styles.kickerRival : ""}`}>
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
              <span className={styles.tapHint}>{beat + 1 < card.beats.length ? "Weiter" : "Weiterspielen"}</span>
            </div>
          </button>
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
  onPause,
  onPick,
}: {
  state: GameState;
  months: number;
  milestone: (typeof MILESTONES)[number];
  index: number;
  deck: Tactic[];
  paused: boolean;
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
          <div className={styles.clockWrap}>
            <span className={`${styles.clock} ${knapp ? styles.clockLow : ""}`}>{isFinite(months) ? months : "∞"}</span>
            <span className={styles.clockUnit}>{isFinite(months) ? "Monate Geld" : "Gehalt läuft"}</span>
          </div>

          <div className={styles.stats}>
            {meterViews(state).map((v) => (
              <Stat key={v.key} view={v} />
            ))}
          </div>

          <button type="button" className={styles.pause} onClick={onPause} aria-label={paused ? "Weiter" : "Pause"}>
            {paused ? "▶" : "❚❚"}
          </button>
          <span className={styles.railFoot}>
            Monat {state.month} · {fmtEuro(state.cash)}
          </span>
        </aside>

        <div className={styles.list}>
          <div className={styles.listHead}>
            <strong>{milestone.gateLabel}</strong>
            <span>{frei > 0 ? `${frei} von ${capacity(state)} frei` : "alle beschäftigt"}</span>
          </div>

          {gruppen.map((g) => (
            <div key={g.name} className={styles.group}>
              <div className={styles.groupName}>{g.name}</div>
              {g.karten.map((t) => {
                const laeuft = state.running.find((r) => r.id === t.id);
                const fertig = state.used.includes(t.id) && !laeuft;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`${styles.item} ${fertig ? styles.itemDone : ""}`}
                    onClick={() => !fertig && onPick(t)}
                    disabled={fertig}
                  >
                    <Ring laeuft={laeuft} fertig={fertig} />
                    <span className={styles.itemLabel}>{t.label}</span>
                    {laeuft && <span className={styles.itemLeft}>{laeuft.left}</span>}
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

/** Der Kreis links neben jeder Maßnahme: leer, laufend, erledigt. */
function Ring({ laeuft, fertig }: { laeuft?: { left: number; total: number }; fertig: boolean }) {
  const anteil = laeuft ? 1 - laeuft.left / laeuft.total : 0;
  return (
    <span className={`${styles.ring} ${fertig ? styles.ringDone : ""} ${laeuft ? styles.ringRun : ""}`} aria-hidden="true">
      {laeuft && (
        <svg viewBox="0 0 36 36">
          <circle className={styles.ringTrack} cx="18" cy="18" r="15" />
          <circle
            className={styles.ringFill}
            cx="18"
            cy="18"
            r="15"
            style={{ strokeDasharray: `${anteil * 94.2} 94.2` }}
          />
        </svg>
      )}
      {fertig && <span className={styles.check}>✓</span>}
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
