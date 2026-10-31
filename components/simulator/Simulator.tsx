"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import styles from "./Simulator.module.css";
import {
  START,
  applyChoice,
  effectLines,
  forcedEnding,
  meterViews,
  type Choice,
  type GameState,
} from "@/lib/simulator";
import { CHAPTERS, ENDING_BY_ID, SCENE_BY_ID, pickEnding } from "@/lib/simulator-scenes";

type Phase = "title" | "scene" | "result" | "ending";

/**
 * The founder simulator.
 *
 * Three states and nothing else: you are looking at a situation, you
 * are looking at what your answer did, or you are looking at how it
 * ended. The meters sit above all of them, because the whole design of
 * the thing is that you can see what a choice is costing while you make
 * it — that is the mechanic the Klimakanzler game gets right, and the
 * reason it is uncomfortable in the way the real job is.
 */
export default function Simulator() {
  const [phase, setPhase] = useState<Phase>("title");
  const [state, setState] = useState<GameState>({ ...START, sceneId: CHAPTERS[0].firstScene });
  const [taken, setTaken] = useState<Choice | null>(null);

  const scene = SCENE_BY_ID[state.sceneId];
  const meters = useMemo(() => meterViews(state), [state]);
  const ending = state.endingId ? ENDING_BY_ID[state.endingId] : null;

  const choose = useCallback(
    (choice: Choice) => {
      const next = applyChoice(state, choice);
      const forced = forcedEnding(next);
      setState(forced ? { ...next, endingId: forced } : next);
      setTaken(choice);
      setPhase("result");
    },
    [state],
  );

  /* The result card is a beat of its own rather than a toast over the
     next scene: the sentence about what this does in reality is the
     part of the game that is actually worth something, and it should
     not be competing with the next decision for attention. */
  const advance = useCallback(() => {
    if (state.endingId) {
      setPhase("ending");
      return;
    }
    if (state.sceneId === "@finale") {
      setState((s) => ({ ...s, endingId: pickEnding(s) }));
      setPhase("ending");
      return;
    }
    setTaken(null);
    setPhase("scene");
  }, [state.endingId, state.sceneId]);

  const restart = () => {
    setState({ ...START, sceneId: CHAPTERS[0].firstScene });
    setTaken(null);
    setPhase("title");
  };

  if (phase === "title") {
    return (
      <div className={styles.root}>
        <div className={styles.titleCard}>
          <Scene image="cover" alt="Two founders starting out" />
          <div className={styles.titleBody}>
            <h1>Can you get to an exit?</h1>
            <p>
              You have an idea and a friend who believes in it. From here, every month costs money and every decision
              costs something else — ownership, the patience of people with cheques, or the customers you already have.
              Nine decisions, two chapters, five ways it can end.
            </p>
            <button type="button" className={styles.primary} onClick={() => setPhase("scene")}>
              Start the company
            </button>
            <p className={styles.smallprint}>
              A game, not advice. Every choice carries a note on what it does in reality, and a link to the tool on this
              site that works it out properly for your own numbers.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "ending" && ending) {
    return (
      <div className={styles.root}>
        <Meters meters={meters} month={state.month} chapter={2} />
        <div className={styles.card}>
          <Scene image={ending.image} alt={ending.title} />
          <div className={styles.body}>
            <div className={`${styles.endingTag} ${styles[ending.tone]}`}>
              {ending.tone === "win" ? "An ending worth having" : ending.tone === "loss" ? "It ends here" : "Somewhere in between"}
            </div>
            <h2>{ending.title}</h2>
            <p className={styles.text}>{ending.text}</p>
            {ending.payout && <p className={styles.payout}>{ending.payout(state)}</p>}
            <div className={styles.endActions}>
              <button type="button" className={styles.primary} onClick={restart}>
                Play it differently
              </button>
              <a className={styles.secondary} href="/">
                Open the tools
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "result" && taken) {
    const lines = effectLines(taken);
    return (
      <div className={styles.root}>
        <Meters meters={meters} month={state.month} chapter={scene?.chapter ?? 2} />
        <div className={styles.card}>
          <div className={styles.body}>
            <div className={styles.chose}>You chose</div>
            <h2 className={styles.choseWhat}>{taken.label}</h2>
            {lines.length > 0 && (
              <div className={styles.deltas}>
                {lines.map((l) => (
                  <span key={l.label} className={`${styles.delta} ${l.up ? styles.up : styles.down}`}>
                    {l.label} <strong>{l.delta}</strong>
                  </span>
                ))}
                <span className={styles.delta}>
                  Time <strong>{taken.months ?? 1} mo</strong>
                </span>
              </div>
            )}
            <div className={styles.realityTag}>What that does in reality</div>
            <p className={styles.text}>{taken.reality}</p>
            {taken.tool && (
              <a className={styles.toolLink} href={`/?tool=${taken.tool.id}`}>
                {taken.tool.label} →
              </a>
            )}
            <button type="button" className={styles.primary} onClick={advance}>
              {state.endingId ? "See how it ended" : "Carry on"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!scene) return null;

  return (
    <div className={styles.root}>
      <Meters meters={meters} month={state.month} chapter={scene.chapter} />
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
                {c.detail && <span>{c.detail}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The scene image.
 *
 * Illustrations are generated assets and may simply not be there yet,
 * so the frame carries its own colour and the image sits on top of it.
 * A missing file leaves a coloured band rather than a broken layout.
 */
function Scene({ image, alt }: { image: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={styles.scene}>
      {!failed && (
        <Image
          src={`/game/${image}.jpg`}
          alt={alt}
          fill
          sizes="(max-width: 760px) 100vw, 700px"
          className={styles.sceneImg}
          onError={() => setFailed(true)}
          priority
        />
      )}
    </div>
  );
}

function Meters({
  meters,
  month,
  chapter,
}: {
  meters: ReturnType<typeof meterViews>;
  month: number;
  chapter: number;
}) {
  return (
    <div className={styles.hud}>
      <div className={styles.chapters}>
        {CHAPTERS.map((c) => (
          <span key={c.number} className={`${styles.chapterBar} ${chapter >= c.number ? styles.chapterOn : ""}`}>
            <em>{c.title}</em>
          </span>
        ))}
        <span className={styles.month}>month {month}</span>
      </div>
      <div className={styles.meters}>
        {meters.map((m) => (
          <div key={m.key} className={styles.meter} title={m.help}>
            <div className={styles.meterTop}>
              <span>{m.label}</span>
              <strong className={styles[m.tone]}>{m.value}</strong>
            </div>
            <span className={styles.meterTrack}>
              <span className={`${styles.meterFill} ${styles[`fill_${m.tone}`]}`} style={{ width: `${m.fill}%` }} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
