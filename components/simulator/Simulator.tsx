"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import styles from "./Simulator.module.css";
import {
  advance,
  applyChoice,
  applyEffects,
  badges,
  brokeNow,
  drawEvent,
  initialState,
  meterViews,
  tick,
  type Choice,
  type Effects,
  type GameState,
} from "@/lib/simulator";
import { CHAPTERS, ENDING_BY_ID, EVENTS, INTRO, SCENE_BY_ID, pickEnding } from "@/lib/simulator-scenes";

/** One month of game time. Slow enough to read a scene, fast enough
    that reading three of them costs you a quarter. */
const MS_PER_MONTH = 4000;

type Card = {
  kind: "consequence" | "event" | "chapter";
  title?: string;
  beats: { text: string; effects?: Effects }[];
  /** Badges shown on the last beat, for a choice's mechanical result. */
  summary?: Effects;
};

type Phase = "intro" | "play" | "ending";

export default function Simulator() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [state, setState] = useState<GameState>(() => initialState(CHAPTERS[0]));
  const [card, setCard] = useState<Card | null>(null);
  const [beat, setBeat] = useState(0);
  const [paused, setPaused] = useState(false);
  /* The clock keeps running inside cards, as it does in the game this
     is modelled on: reading is not free, and that is the mechanic. */
  const running = phase === "play" && !paused && !state.endingId;
  const tickRef = useRef(0);

  const scene = SCENE_BY_ID[state.sceneId];
  const meters = useMemo(() => meterViews(state), [state]);
  const chapter = CHAPTERS.find((c) => c.number === state.chapter) ?? CHAPTERS[0];
  const ending = state.endingId ? ENDING_BY_ID[state.endingId] : null;

  const finish = useCallback((s: GameState) => ({ ...s, endingId: pickEnding(s) }), []);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setState((s) => {
        const next = tick(s);
        if (brokeNow(next)) return { ...next, endingId: "insolvent" };
        /* The chapter's clock running out is not a loss — it just means
           the next thing happens with whatever you have by then. */
        if (next.left === 0) {
          if (next.chapter >= CHAPTERS.length) return finish(next);
          const nextChapter = CHAPTERS[next.chapter];
          return { ...next, chapter: nextChapter.number, left: nextChapter.months, sceneId: nextChapter.firstScene };
        }
        tickRef.current += 1;
        return next;
      });
    }, MS_PER_MONTH);
    return () => window.clearInterval(id);
  }, [running, finish]);

  /* Events are drawn on the beat rather than at random moments, so the
     rhythm is predictable even though the content is not. */
  useEffect(() => {
    if (!running || card || state.month === 0 || state.month % 3 !== 0) return;
    const ev = drawEvent(state, EVENTS);
    if (!ev) return;
    setState((s) => ({ ...s, fired: [...s.fired, ev.id] }));
    setCard({ kind: "event", beats: ev.beats });
    setBeat(0);
  }, [state, running, card]);

  const choose = (choice: Choice) => {
    const moved = applyChoice(state, choice);
    const crossed = SCENE_BY_ID[choice.next]?.chapter;
    const withChapter =
      crossed && crossed > moved.chapter
        ? { ...moved, chapter: crossed, left: (CHAPTERS.find((c) => c.number === crossed) ?? chapter).months }
        : moved;
    setState(brokeNow(withChapter) ? { ...withChapter, endingId: "insolvent" } : withChapter);
    setCard({ kind: "consequence", beats: choice.beats.map((text) => ({ text })), summary: choice.effects });
    setBeat(0);
  };

  const nextBeat = () => {
    if (!card) return;
    const current = card.beats[beat];
    if (current?.effects) setState((s) => applyEffects(s, current.effects));
    if (beat + 1 < card.beats.length) {
      setBeat(beat + 1);
      return;
    }
    setCard(null);
    setBeat(0);
    setState((s) => {
      if (brokeNow(s)) return { ...s, endingId: "insolvent" };
      if (s.sceneId === "@finale") return finish(s);
      return s;
    });
  };

  useEffect(() => {
    if (state.endingId && !card) setPhase("ending");
  }, [state.endingId, card]);

  const restart = () => {
    setState(initialState(CHAPTERS[0], Math.floor(Math.random() * 100000)));
    setCard(null);
    setBeat(0);
    setPaused(false);
    setPhase("intro");
  };

  /* ── Intro ── */
  if (phase === "intro") {
    return (
      <div className={styles.root}>
        <div className={styles.card}>
          <Scene image={INTRO.image} alt="Lena and Jonas at the kitchen table" />
          <div className={styles.body}>
            <div className={styles.who}>{INTRO.who}</div>
            <h1>You are about to start Palettio</h1>
            {INTRO.lines.map((l) => (
              <p className={styles.text} key={l.slice(0, 24)}>
                {l}
              </p>
            ))}
            <ul className={styles.rules}>
              {INTRO.rules.map((r) => (
                <li key={r.slice(0, 20)}>{r}</li>
              ))}
            </ul>
            <button type="button" className={styles.primary} onClick={() => setPhase("play")}>
              Start the clock
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Ending ── */
  if (phase === "ending" && ending) {
    return (
      <div className={styles.root}>
        <Hud state={state} meters={meters} chapter={chapter} paused onPause={() => {}} hideClock />
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

  /* ── Playing ── */
  return (
    <div className={styles.root}>
      <Hud state={state} meters={meters} chapter={chapter} paused={paused} onPause={() => setPaused((p) => !p)} />

      {card ? (
        <button type="button" className={`${styles.card} ${styles.cardTap}`} onClick={nextBeat}>
          <div className={styles.body}>
            <div className={styles.kicker}>{card.kind === "event" ? "Meanwhile" : "What happened"}</div>
            <p className={styles.beat}>{card.beats[beat]?.text}</p>
            {beat === card.beats.length - 1 && (
              <div className={styles.badges}>
                {badges(card.summary ?? card.beats[beat]?.effects).map((b) => (
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
        scene && (
          <div className={styles.card}>
            <Scene image={scene.image} alt={scene.title} />
            <div className={styles.body}>
              <div className={styles.place}>{scene.place}</div>
              <h2>{scene.title}</h2>
              <p className={styles.text}>
                {scene.speaker && <span className={styles.speaker}>{scene.speaker}</span>}
                {scene.text}
              </p>
              <div className={styles.choices}>
                {scene.choices.map((c) => (
                  <button key={c.id} type="button" className={styles.choice} onClick={() => choose(c)}>
                    <strong>{c.label}</strong>
                    <span>
                      {c.detail}
                      {c.months ? ` · ${c.months} mo` : ""}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
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
 * The HUD.
 *
 * Countdown first and large, because it is the thing creating the
 * pressure; the four meters underneath in one grid, each a label with
 * its number directly beneath it rather than pushed to the far side of
 * the row — which is what made the first version read as four
 * unrelated words and four unrelated numbers.
 */
function Hud({
  state,
  meters,
  chapter,
  paused,
  onPause,
  hideClock,
}: {
  state: GameState;
  meters: ReturnType<typeof meterViews>;
  chapter: (typeof CHAPTERS)[number];
  paused: boolean;
  onPause: () => void;
  hideClock?: boolean;
}) {
  const share = Math.max(0, Math.min(1, state.left / chapter.months));
  return (
    <div className={styles.hud}>
      <div className={styles.hudTop}>
        <div className={styles.chapterLine}>
          <span className={styles.chapterNo}>Chapter {chapter.number}</span>
          <span className={styles.chapterName}>{chapter.title}</span>
        </div>
        {!hideClock && (
          <div className={styles.clockBox}>
            <span className={`${styles.clock} ${state.left <= 3 ? styles.clockLow : ""}`}>{state.left}</span>
            <span className={styles.clockUnit}>months left</span>
            <button type="button" className={styles.pause} onClick={onPause} aria-label={paused ? "Resume" : "Pause"}>
              {paused ? "▶" : "❚❚"}
            </button>
          </div>
        )}
      </div>
      <span className={styles.clockTrack}>
        <span className={styles.clockFill} style={{ width: `${share * 100}%` }} />
      </span>

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
