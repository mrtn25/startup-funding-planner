"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import styles from "./Simulator.module.css";
import {
  applyEffects,
  badges,
  beatsOf,
  deckFor,
  drawEvent,
  eventDue,
  fmtEuro,
  forcedEnding,
  initialState,
  meterViews,
  rivalMove,
  runTactic,
  runway,
  tick,
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

/** Ein Spielmonat, während du nur nachdenkst. Zwanzig Sekunden: die Uhr
    muss sichtbar laufen, ohne Lesen zu bestrafen. Die Monate, die
    wehtun, kommen von den Karten. */
const MS_PER_MONTH = 20_000;

type Card = {
  kind: "ergebnis" | "ereignis" | "phase" | "retoura";
  kicker: string;
  title?: string;
  image?: string;
  beats: string[];
  summary?: Effects;
};

type Phase = "titel" | "onboarding" | "spiel" | "ende";

export default function Simulator() {
  const [phase, setPhase] = useState<Phase>("titel");
  const [step, setStep] = useState(0);
  const [state, setState] = useState<GameState>(() => initialState(Date.now() % 1000));
  const [cards, setCards] = useState<Card[]>([]);
  const [beat, setBeat] = useState(0);
  const [paused, setPaused] = useState(false);

  const card = cards[0] ?? null;
  const milestone = MILESTONE_BY_ID[state.milestoneId] ?? MILESTONES[0];
  const index = MILESTONES.findIndex((m) => m.id === milestone.id);
  const deck = useMemo(() => deckFor(state, milestone, TACTICS), [state, milestone]);
  const meters = useMemo(() => meterViews(state), [state]);
  const months = runway(state);
  const ending = state.endingId ? ENDING_BY_ID[state.endingId] : null;
  const running = phase === "spiel" && !paused && !card && !state.endingId;

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

  /* Die Uhr läuft, solange das Brett vor dir liegt, und steht, während
     eine Karte spricht. Eine Karte ist keine Entscheidung. */
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setState((s) => {
        const next = tick(s);
        const tot = forcedEnding(next);
        return tot ? { ...next, endingId: tot } : next;
      });
    }, MS_PER_MONTH);
    return () => window.clearInterval(id);
  }, [running]);

  /* Retoura zieht von allein weiter und meldet sich, wenn sie vorbeiziehen. */
  useEffect(() => {
    if (!running) return;
    const zug = rivalMove(state, RIVAL_STEPS);
    if (!zug) return;
    setState((s) => applyEffects({ ...s, rivalSeen: [...s.rivalSeen, zug.at] }, zug.effects));
    setCards((cs) => [
      ...cs,
      { kind: "retoura", kicker: "Rotterdam", title: zug.label, beats: [...zug.beats], summary: zug.effects },
    ]);
    setBeat(0);
  }, [state, running]);

  /* Ereigniskarten: höchstens alle drei Monate eine, jede nur einmal. */
  useEffect(() => {
    if (!running || !eventDue(state)) return;
    const e = drawEvent(state, EVENTS);
    if (!e) return;
    setState((s) => applyEffects({ ...s, drawn: [...s.drawn, e.id], lastEvent: s.month }, e.effects));
    setCards((cs) => [
      ...cs,
      { kind: "ereignis", kicker: "Dazwischen", title: e.title, beats: [...e.beats], summary: e.effects },
    ]);
    setBeat(0);
  }, [state, running]);

  const spielen = (t: Tactic) => {
    const danach = runTactic(state, t);
    const queue: Card[] = [
      {
        kind: "ergebnis",
        kicker: t.label,
        beats: [...beatsOf(t, state.stance)],
        summary: { ...t.effects, cash: (t.effects.cash ?? 0) - (t.cost ?? 0) || undefined },
      },
    ];
    const tot = forcedEnding(danach);
    if (tot) {
      setState({ ...danach, endingId: tot });
    } else if (milestone.gate(danach) && milestone.next) {
      const naechste = MILESTONE_BY_ID[milestone.next];
      const bei = naechste.onEnter;
      const feuert = bei && (!bei.when || bei.when(danach));
      setState({ ...(feuert ? applyEffects(danach, bei!.effects) : danach), milestoneId: milestone.next });
      queue.push(phasenKarte(milestone.next));
      if (feuert) {
        queue.push({ kind: "ereignis", kicker: "Montagmorgen", title: bei!.title, beats: [...bei!.beats], summary: bei!.effects });
      }
    } else if (milestone.gate(danach) && !milestone.next) {
      setState({ ...danach, endingId: pickEnding(danach) });
    } else {
      setState(danach);
    }
    setCards(queue);
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
    setState(initialState(Math.floor(Math.random() * 1000)));
    setCards([]);
    setBeat(0);
    setStep(0);
    setPaused(false);
    setPhase("titel");
  };

  /* ── Titel ── */
  if (phase === "titel") {
    return (
      <div className={styles.root}>
        <div className={styles.card}>
          <Scene image={INTRO.image} alt="Lena im Dispositionsbüro" />
          <div className={styles.body}>
            <div className={styles.who}>{INTRO.who}</div>
            <h1>Jede vierte Rückfahrt ist leer</h1>
            {INTRO.lines.map((l) => (
              <p className={styles.text} key={l.slice(0, 18)}>
                {l}
              </p>
            ))}
            <button type="button" className={styles.primary} onClick={() => setPhase("onboarding")}>
              Los geht's
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Onboarding: das Brett liegt schon da, unscharf, und Tarek erklärt ── */
  if (phase === "onboarding") {
    const satz = ONBOARDING[step];
    const letzter = step === ONBOARDING.length - 1;
    return (
      <div className={styles.root}>
        <div className={styles.blurred} aria-hidden="true">
          <Hud state={state} meters={meters} months={months} paused onPause={() => {}} index={0} />
          <div className={styles.goal}>
            <div className={styles.goalLabel}>Phase 1</div>
            <h2>{MILESTONES[0].title}</h2>
            <p>{MILESTONES[0].gateLabel}</p>
          </div>
          <div className={styles.deck}>
            {MILESTONES[0].tactics.slice(0, 3).map((id) => (
              <div key={id} className={styles.tactic}>
                <strong>{TACTICS[id].label}</strong>
                <span className={styles.flavour}>{TACTICS[id].flavour}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          className={styles.coach}
          onClick={() => (letzter ? (setCards([phasenKarte(MILESTONES[0].id)]), setBeat(0), setPhase("spiel")) : setStep(step + 1))}
        >
          <span className={styles.coachFigure}>
            <Image src="/game/mentor.jpg" alt="Tarek, Gründungsberater" fill sizes="340px" className={styles.coachImg} priority />
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
          <span className={styles.coachHint}>
            {letzter ? "Tippen und anfangen" : `Weiter · ${step + 1}/${ONBOARDING.length}`}
          </span>
        </button>
      </div>
    );
  }

  /* ── Ende ── */
  if (phase === "ende" && ending) {
    return (
      <div className={styles.root}>
        <div className={styles.card}>
          <Scene image={ending.image} alt={ending.title} />
          <div className={styles.body}>
            <div className={`${styles.tag} ${styles[ending.tone]}`}>
              {ending.tone === "win" ? "Ein gutes Ende" : ending.tone === "loss" ? "Hier ist Schluss" : "Irgendwo dazwischen"}
            </div>
            <h2>{ending.title}</h2>
            <p className={styles.text}>{ending.text}</p>
            {ending.payout && <p className={styles.payout}>{ending.payout(state)}</p>}
            <button type="button" className={styles.primary} onClick={neustart}>
              Nochmal, anders
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Das Brett ── */
  return (
    <div className={styles.root}>
      <Hud state={state} meters={meters} months={months} paused={paused} onPause={() => setPaused((p) => !p)} index={index} />

      {card ? (
        <button type="button" className={`${styles.card} ${styles.cardTap}`} onClick={weiter}>
          {card.image && <Scene image={card.image} alt={card.title ?? ""} />}
          <div className={styles.body}>
            <div className={`${styles.kicker} ${card.kind === "ereignis" ? styles.kickerEvent : ""}`}>{card.kicker}</div>
            {card.title && <h2 className={styles.cardTitle}>{card.title}</h2>}
            <p className={styles.beat}>{card.beats[beat]}</p>
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
      ) : (
        <>
          <div className={styles.goal}>
            <div className={styles.goalLabel}>
              Phase {index + 1} von {MILESTONES.length}
            </div>
            <h2>{milestone.title}</h2>
            <p>{milestone.gateLabel}</p>
          </div>

          <div className={styles.deck}>
            {deck.map((t) => (
              <button key={t.id} type="button" className={styles.tactic} onClick={() => spielen(t)}>
                <strong>{t.label}</strong>
                <span className={styles.flavour}>{t.flavour}</span>
                <span className={styles.price}>
                  <em>
                    {t.months} {t.months === 1 ? "Monat" : "Monate"}
                  </em>
                  {t.cost ? <em className={styles.cost}>{fmtEuro(t.cost)}</em> : null}
                </span>
              </button>
            ))}
            {!deck.length && <p className={styles.empty}>Hier ist nichts mehr zu holen. Es läuft nur noch die Uhr.</p>}
          </div>
        </>
      )}
    </div>
  );
}

function Scene({ image, alt }: { image: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={styles.scene}>
      {!failed && (
        <Image
          src={`/game/${image}.jpg`}
          alt={alt}
          fill
          sizes="(max-width: 700px) 100vw, 620px"
          className={styles.sceneImg}
          onError={() => setFailed(true)}
          priority
        />
      )}
    </div>
  );
}

function Hud({
  state,
  meters,
  months,
  paused,
  onPause,
  index,
}: {
  state: GameState;
  meters: ReturnType<typeof meterViews>;
  months: number;
  paused: boolean;
  onPause: () => void;
  index: number;
}) {
  const knapp = isFinite(months) && months <= 6;
  return (
    <div className={styles.hud}>
      {/* Acht Felder, eins pro Phase: der Fortschritt muss zu sehen sein,
          sonst fühlt sich eine Stunde Spiel an wie eine Stelle. */}
      <div className={styles.phases}>
        {MILESTONES.map((m, i) => (
          <span
            key={m.id}
            className={`${styles.phaseBar} ${i < index ? styles.phaseDone : ""} ${i === index ? styles.phaseNow : ""}`}
            title={m.title}
          />
        ))}
      </div>

      <div className={styles.hudTop}>
        <div className={styles.clockBox}>
          <span className={`${styles.clock} ${knapp ? styles.clockLow : ""}`}>{isFinite(months) ? months : "∞"}</span>
          <span className={styles.clockUnit}>
            {isFinite(months) ? (
              <>
                Monate
                <br />
                Runway
              </>
            ) : (
              <>
                Runway,
                <br />
                solange du angestellt bist
              </>
            )}
          </span>
          <button type="button" className={styles.pause} onClick={onPause} aria-label={paused ? "Weiter" : "Pause"}>
            {paused ? "▶" : "❚❚"}
          </button>
        </div>

        <div className={styles.rival}>
          <div className={styles.rivalTop}>
            <span>Retoura · Rotterdam</span>
            <strong>{Math.round(state.rival)}%</strong>
          </div>
          <span className={styles.rivalTrack}>
            <span className={styles.rivalFill} style={{ width: `${Math.min(100, state.rival)}%` }} />
          </span>
          <span className={styles.rivalNote}>
            Monat {state.month} · {fmtEuro(state.cash)} auf dem Konto
          </span>
        </div>
      </div>

      <div className={styles.meters}>
        {meters.map((m) => (
          <div key={m.key} className={styles.meter}>
            <span className={styles.meterLabel}>{m.label}</span>
            <strong className={`${styles.meterValue} ${styles[m.tone]}`}>{m.value}</strong>
            <span className={styles.meterTrack}>
              <span className={`${styles.meterFill} ${styles[`fill_${m.tone}`]}`} style={{ width: `${m.fill}%` }} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
