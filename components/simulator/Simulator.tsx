"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import styles from "./Simulator.module.css";
import {
  applyEffects,
  badges,
  beatsOf,
  deckFor,
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
  INTRO,
  MILESTONES,
  MILESTONE_BY_ID,
  RIVAL_STEPS,
  TACTICS,
  pickEnding,
} from "@/lib/simulator-scenes";

/** One month of game time while you are only thinking. Twenty seconds:
    the clock has to be visibly moving — that is the whole point of
    having one — without charging rent on reading a card. The months
    that actually hurt come from the cards you commit to. */
const MS_PER_MONTH = 20_000;

type Card = {
  kind: "result" | "rival" | "milestone";
  kicker: string;
  title?: string;
  image?: string;
  beats: string[];
  summary?: Effects;
};

type Phase = "intro" | "play" | "ending";

export default function Simulator() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [state, setState] = useState<GameState>(() => initialState(Date.now() % 1000));
  const [cards, setCards] = useState<Card[]>([]);
  const [beat, setBeat] = useState(0);
  const [paused, setPaused] = useState(false);

  const card = cards[0] ?? null;
  const milestone = MILESTONE_BY_ID[state.milestoneId] ?? MILESTONES[0];
  const deck = useMemo(() => deckFor(state, milestone, TACTICS), [state, milestone]);
  const meters = useMemo(() => meterViews(state), [state]);
  const months = runway(state);
  const ending = state.endingId ? ENDING_BY_ID[state.endingId] : null;
  const running = phase === "play" && !paused && !card && !state.endingId;

  const milestoneCard = useCallback((id: string): Card => {
    const m = MILESTONE_BY_ID[id];
    return {
      kind: "milestone",
      kicker: `Milestone ${MILESTONES.findIndex((x) => x.id === id) + 1} of ${MILESTONES.length}`,
      title: m.title,
      image: m.image,
      beats: [m.blurb, `What you need: ${m.gateLabel.toLowerCase()}.`],
    };
  }, []);

  /* The clock. It runs while the board is in front of you and stops
     while the game is talking, because a card is not a decision. */
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setState((s) => settle(s)), MS_PER_MONTH);
    return () => window.clearInterval(id);
  }, [running]);

  /** One month of drift, then everything that falls out of it. */
  const settle = (s: GameState): GameState => {
    const next = tick(s);
    const dead = forcedEnding(next);
    return dead ? { ...next, endingId: dead } : next;
  };

  /* Retoura moves on its own clock, and says so when it passes you. */
  useEffect(() => {
    if (!running) return;
    const move = rivalMove(state, RIVAL_STEPS);
    if (!move) return;
    setState((s) => applyEffects({ ...s, rivalSeen: [...s.rivalSeen, move.at] }, move.effects));
    setCards((cs) => [...cs, { kind: "rival", kicker: "Rotterdam", title: move.label, beats: [...move.beats] }]);
    setBeat(0);
  }, [state, running]);

  const commit = (t: Tactic) => {
    const after = runTactic(state, t);
    const queue: Card[] = [
      {
        kind: "result",
        kicker: t.label,
        beats: [...beatsOf(t, state.stance)],
        summary: { ...t.effects, cash: (t.effects.cash ?? 0) - (t.cost ?? 0) || undefined },
      },
    ];
    const done = forcedEnding(after);
    if (done) {
      setState({ ...after, endingId: done });
    } else if (milestone.gate(after) && milestone.next) {
      const next = MILESTONE_BY_ID[milestone.next];
      const enter = next.onEnter;
      const fires = enter && (!enter.when || enter.when(after));
      setState({ ...(fires ? applyEffects(after, enter!.effects) : after), milestoneId: milestone.next });
      queue.push(milestoneCard(milestone.next));
      if (fires) {
        queue.push({ kind: "rival", kicker: "Monday morning", title: enter!.title, beats: [...enter!.beats], summary: enter!.effects });
      }
    } else if (milestone.gate(after) && !milestone.next) {
      setState({ ...after, endingId: pickEnding(after) });
    } else {
      setState(after);
    }
    setCards(queue);
    setBeat(0);
  };

  const nextBeat = () => {
    if (!card) return;
    if (beat + 1 < card.beats.length) {
      setBeat(beat + 1);
      return;
    }
    setCards((cs) => cs.slice(1));
    setBeat(0);
  };

  useEffect(() => {
    if (state.endingId && !card) setPhase("ending");
  }, [state.endingId, card]);

  const start = () => {
    setCards([milestoneCard(MILESTONES[0].id)]);
    setBeat(0);
    setPhase("play");
  };

  const restart = () => {
    setState(initialState(Math.floor(Math.random() * 1000)));
    setCards([]);
    setBeat(0);
    setPaused(false);
    setPhase("intro");
  };

  if (phase === "intro") {
    return (
      <div className={styles.root}>
        <div className={styles.card}>
          <Scene image={INTRO.image} alt="Lena in the dispatch office" />
          <div className={styles.body}>
            <div className={styles.who}>{INTRO.who}</div>
            <h1>Thirty-one percent of your trucks come home empty</h1>
            {INTRO.lines.map((l) => (
              <p className={styles.text} key={l.slice(0, 20)}>
                {l}
              </p>
            ))}
            <ul className={styles.rules}>
              {INTRO.rules.map((r) => (
                <li key={r.slice(0, 18)}>{r}</li>
              ))}
            </ul>
            <button type="button" className={styles.primary} onClick={start}>
              Start the clock
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "ending" && ending) {
    return (
      <div className={styles.root}>
        <div className={styles.card}>
          <Scene image={ending.image} alt={ending.title} />
          <div className={styles.body}>
            <div className={`${styles.tag} ${styles[ending.tone]}`}>
              {ending.tone === "win" ? "An ending worth having" : ending.tone === "loss" ? "It ends here" : "Somewhere in between"}
            </div>
            <h2>{ending.title}</h2>
            <p className={styles.text}>{ending.text}</p>
            {ending.payout && <p className={styles.payout}>{ending.payout(state)}</p>}
            <button type="button" className={styles.primary} onClick={restart}>
              Play it differently
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <Hud state={state} meters={meters} months={months} paused={paused} onPause={() => setPaused((p) => !p)} />

      {card ? (
        <button type="button" className={`${styles.card} ${styles.cardTap}`} onClick={nextBeat}>
          {card.image && <Scene image={card.image} alt={card.title ?? ""} />}
          <div className={styles.body}>
            <div className={styles.kicker}>{card.kicker}</div>
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
            <span className={styles.tapHint}>{beat + 1 < card.beats.length ? "Tap to continue" : "Tap to carry on"}</span>
          </div>
        </button>
      ) : (
        <>
          <div className={styles.goal}>
            <div className={styles.goalLabel}>Milestone {MILESTONES.findIndex((m) => m.id === milestone.id) + 1}</div>
            <h2>{milestone.title}</h2>
            <p>{milestone.gateLabel}</p>
          </div>

          <div className={styles.deck}>
            {deck.map((t) => (
              <button key={t.id} type="button" className={styles.tactic} onClick={() => commit(t)}>
                <strong>{t.label}</strong>
                <span className={styles.flavour}>{t.flavour}</span>
                <span className={styles.price}>
                  <em>{t.months} {t.months === 1 ? "month" : "months"}</em>
                  {t.cost ? <em className={styles.cost}>{fmtEuro(t.cost)}</em> : null}
                </span>
              </button>
            ))}
            {!deck.length && <p className={styles.empty}>Nothing left to try here. The clock is the only thing still moving.</p>}
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

/**
 * The runway, large, with Retoura beside it.
 *
 * Two kinds of pressure on one line: the number that goes down on its
 * own, and the company that goes up on its own. Everything else is a
 * thin bar underneath, because five meters shouting at once is five
 * meters nobody reads.
 */
function Hud({
  state,
  meters,
  months,
  paused,
  onPause,
}: {
  state: GameState;
  meters: ReturnType<typeof meterViews>;
  months: number;
  paused: boolean;
  onPause: () => void;
}) {
  const low = isFinite(months) && months <= 6;
  return (
    <div className={styles.hud}>
      <div className={styles.hudTop}>
        <div className={styles.clockBox}>
          <span className={`${styles.clock} ${low ? styles.clockLow : ""}`}>{isFinite(months) ? months : "∞"}</span>
          <span className={styles.clockUnit}>
            {isFinite(months) ? (
              <>
                months
                <br />
                of runway
              </>
            ) : (
              /* An infinity sign on its own reads as "no clock". It is a
                 clock that has not started: the salary is still paying. */
              <>
                runway
                <br />
                while you are employed
              </>
            )}
          </span>
          <button type="button" className={styles.pause} onClick={onPause} aria-label={paused ? "Resume" : "Pause"}>
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
          <span className={styles.rivalNote}>month {state.month} · {fmtEuro(state.cash)} in the bank</span>
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
