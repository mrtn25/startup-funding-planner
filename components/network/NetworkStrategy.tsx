"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import styles from "./NetworkStrategy.module.css";
import {
  compute,
  IK,
  INFO,
  MK,
  NAMES,
  NEG_COLOR,
  POS_COLOR,
  PRESETS,
  SK,
  SRC,
  W1,
  W1_SRC,
  W2,
  W2_SRC,
  type InputKey,
  type MechKey,
  type NodeId,
  type StratKey,
} from "@/lib/network-strategy";

/* All HTML passed to dangerouslySetInnerHTML below comes from the static
   constants in lib/network-strategy.ts — citations and prose written into
   the repo, never user input. */

type Edge = {
  id: string;
  d: string;
  color: string;
  weight: number;
  /** Source layer: input edges are on/off, mechanism edges scale by activation. */
  src: { kind: "in"; key: InputKey } | { kind: "mec"; key: MechKey };
};

type Anchor = { left: number; right: number; mid: number };

const DEFAULT_PANEL = {
  k: "How to read this",
  t: "Three layers, not a black box",
  b: "<p>Nothing on the left acts directly on a strategy. Every attribute works through one of five <strong>mechanisms</strong> the research literature actually identifies &mdash; that middle column is the explanation, not decoration.</p><p>Click any node to see what the evidence says, which papers it comes from, and what it implies for how you should approach investors.</p><p><strong>Click a strategy on the right</strong> for a step-by-step playbook of what to actually do.</p>",
  i: null as string | null,
  s: [] as string[],
  do: undefined as string[] | undefined,
};

export default function NetworkStrategy() {
  const [on, setOn] = useState<Partial<Record<InputKey, boolean>>>({});
  const [focus, setFocus] = useState<NodeId | null>(null);

  const modelRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLElement>());
  const setNodeRef = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) nodeRefs.current.set(key, el);
      else nodeRefs.current.delete(key);
    },
    [],
  );

  const { activation, score, order, anyOn } = useMemo(() => compute(on), [on]);

  const [edges, setEdges] = useState<Edge[]>([]);
  const [viewBox, setViewBox] = useState("0 0 0 0");

  /**
   * The edge layer is drawn from measured node positions, so it has to be
   * rebuilt whenever geometry changes: on resize, when the strategy column
   * reorders by score, and when the panel becomes visible again after the
   * other tool was showing (hidden elements measure as 0×0).
   */
  useLayoutEffect(() => {
    const model = modelRef.current;
    if (!model) return;

    const build = () => {
      const box = model.getBoundingClientRect();
      if (!box.width) return; // hidden — keep the previous edges rather than clearing

      const anchor = (key: string): Anchor | null => {
        const el = nodeRefs.current.get(key);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { right: r.right - box.left, left: r.left - box.left, mid: r.top - box.top + r.height / 2 };
      };

      const curve = (a: Anchor, b: Anchor) => {
        const dx = Math.max(24, (b.left - a.right) * 0.55);
        return `M${a.right.toFixed(1)} ${a.mid.toFixed(1)} C${(a.right + dx).toFixed(1)} ${a.mid.toFixed(1)} ${(
          b.left - dx
        ).toFixed(1)} ${b.mid.toFixed(1)} ${b.left.toFixed(1)} ${b.mid.toFixed(1)}`;
      };

      const next: Edge[] = [];

      IK.forEach((k) => {
        const a = anchor(`in:${k}`);
        if (!a) return;
        (Object.keys(W1[k]) as MechKey[]).forEach((m) => {
          const w = W1[k][m]!;
          const b = anchor(`me:${m}`);
          if (!b) return;
          next.push({
            id: `${k}>${m}`,
            d: curve(a, b),
            color: w > 0 ? POS_COLOR : NEG_COLOR,
            weight: Math.abs(w),
            src: { kind: "in", key: k },
          });
        });
      });

      MK.forEach((m) => {
        const a = anchor(`me:${m}`);
        if (!a) return;
        SK.forEach((s) => {
          const w = W2[s][m];
          if (!w) return;
          const b = anchor(`st:${s}`);
          if (!b) return;
          next.push({
            id: `${m}>${s}`,
            d: curve(a, b),
            color: w > 0 ? POS_COLOR : NEG_COLOR,
            weight: Math.abs(w),
            src: { kind: "mec", key: m },
          });
        });
      });

      setViewBox(`0 0 ${Math.round(box.width)} ${Math.round(box.height)}`);
      setEdges(next);
    };

    build();

    // Fires both on genuine resizes and when the panel is un-hidden (0×0 → real).
    const ro = new ResizeObserver(build);
    ro.observe(model);
    window.addEventListener("resize", build);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", build);
    };
  }, [order]);

  const info = focus ? INFO[focus] : null;
  const panel = info ?? DEFAULT_PANEL;

  const toggle = (k: InputKey) => {
    setOn((prev) => ({ ...prev, [k]: !prev[k] }));
    setFocus(`in:${k}`);
  };

  const applyPreset = (keys: InputKey[]) => {
    const next: Partial<Record<InputKey, boolean>> = {};
    keys.forEach((k) => (next[k] = true));
    setOn(next);
  };

  const summary = (() => {
    if (!anyOn) return null;
    const best = order[0];
    const worst = order[order.length - 1];
    const identityFlag = (on.fem || on.eth) && order.indexOf("iden") < 2;
    return { best, worst, identityFlag };
  })();

  return (
    <section className={styles.root} aria-label="Network strategy model">
      <header className={styles.head}>
        <h2>Which network strategy fits your profile?</h2>
        <p>
          A weighted, three-layer model built from the empirical fundraising literature. Toggle your attributes on the
          left. Click any node to see the evidence behind it.
        </p>
      </header>

      <div className={styles.presets}>
        {PRESETS.map((p) => (
          <button
            type="button"
            key={p.id}
            className={`${styles.btn}${p.quiet ? ` ${styles.btnQuiet}` : ""}`}
            onClick={() => applyPreset(p.keys)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className={styles.layout}>
        <div>
          <div className={styles.labels}>
            <span>Your profile</span>
            <span>Mechanism</span>
            <span>Strategy</span>
          </div>

          <div className={styles.model} ref={modelRef}>
            <svg className={styles.edges} viewBox={viewBox} preserveAspectRatio="none" aria-hidden="true">
              {edges.map((e) => {
                const a = e.src.kind === "in" ? (on[e.src.key] ? 1 : 0) : activation[e.src.key] || 0;
                return (
                  <path
                    key={e.id}
                    d={e.d}
                    fill="none"
                    stroke={e.color}
                    strokeWidth={(e.weight * 2.1).toFixed(2)}
                    strokeLinecap="round"
                    opacity={(Math.min(1, a * e.weight) * 0.7).toFixed(2)}
                  />
                );
              })}
            </svg>

            <div className={styles.col}>
              {IK.map((k) => (
                <button
                  type="button"
                  key={k}
                  ref={setNodeRef(`in:${k}`)}
                  className={`${styles.node} ${styles.in}${on[k] ? ` ${styles.isOn}` : ""}${
                    focus === `in:${k}` ? ` ${styles.isFocus}` : ""
                  }`}
                  aria-pressed={!!on[k]}
                  onClick={() => toggle(k)}
                >
                  <span className={styles.dot} />
                  {NAMES[k]}
                </button>
              ))}
            </div>

            <div className={`${styles.col} ${styles.colMec}`}>
              {MK.map((m) => (
                <button
                  type="button"
                  key={m}
                  ref={setNodeRef(`me:${m}`)}
                  className={`${styles.node} ${styles.mec}${focus === `me:${m}` ? ` ${styles.isFocus}` : ""}`}
                  onClick={() => setFocus(`me:${m}`)}
                >
                  <span className={styles.mlabel}>{NAMES[m]}</span>
                  <span className={styles.bar}>
                    <span className={styles.fill} style={{ width: `${Math.round(activation[m] * 100)}%` }} />
                  </span>
                </button>
              ))}
            </div>

            <div className={`${styles.col} ${styles.colStr}`}>
              {order.map((s, i) => (
                <button
                  type="button"
                  key={s}
                  ref={setNodeRef(`st:${s}`)}
                  className={`${styles.node} ${styles.str}${anyOn && i === 0 ? ` ${styles.isTop}` : ""}${
                    focus === `st:${s}` ? ` ${styles.isFocus}` : ""
                  }`}
                  onClick={() => setFocus(`st:${s}`)}
                >
                  <span className={styles.sname}>{NAMES[s]}</span>
                  <span className={styles.score}>{score[s]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.legend}>
            <span>
              <i className={`${styles.lineSwatch} ${styles.pos}`} />
              positive weight
            </span>
            <span>
              <i className={`${styles.lineSwatch} ${styles.neg}`} />
              negative weight
            </span>
            <span>edge opacity = |weight| × activation</span>
          </div>

          <p className={styles.summary}>
            {summary ? (
              <>
                Top strategy: <strong>{NAMES[summary.best]}</strong> ({score[summary.best]}) · weakest:{" "}
                {NAMES[summary.worst]} ({score[summary.worst]}).
                {summary.identityFlag && (
                  <span className={styles.flag}>
                    {" "}
                    ▲ Identity match ranks high here — the best-documented door-opener and the best-documented downside.
                  </span>
                )}
              </>
            ) : (
              "Toggle attributes on the left, or pick a preset."
            )}
          </p>
        </div>

        <aside className={styles.panel} aria-live="polite">
          <div className={styles.kicker}>{panel.k}</div>
          <h3>{panel.t}</h3>
          <div className={styles.body}>
            <div dangerouslySetInnerHTML={{ __html: panel.b }} />
            {panel.i && (
              <div className={styles.implic}>
                <div className={styles.kicker}>What it implies</div>
                <p dangerouslySetInnerHTML={{ __html: panel.i }} />
              </div>
            )}
          </div>

          {panel.do && panel.do.length > 0 && (
            <div className={styles.playbook}>
              <div className={styles.kicker}>Playbook — do this</div>
              <ol className={styles.steps}>
                {panel.do.map((step, i) => (
                  <li key={i} dangerouslySetInnerHTML={{ __html: step }} />
                ))}
              </ol>
            </div>
          )}
          {panel.s.length > 0 && (
            <div className={styles.sources}>
              <div className={styles.kicker}>Sources</div>
              <ul>
                {panel.s.map((id) => (
                  <li key={id}>
                    <a
                      href={SRC[id][1]}
                      target="_blank"
                      rel="noopener noreferrer"
                      dangerouslySetInnerHTML={{ __html: SRC[id][0] }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      <WeightsTable />
      <Bibliography />
    </section>
  );
}

function WeightRow({ from, to, w, sid }: { from: string; to: string; w: number; sid?: string }) {
  return (
    <tr>
      <td>{from}</td>
      <td>{to}</td>
      <td className={`${styles.num} ${w > 0 ? styles.wPos : styles.wNeg}`}>
        {w > 0 ? "+" : ""}
        {w.toFixed(1)}
      </td>
      <td>
        {sid ? (
          <a
            href={SRC[sid][1]}
            target="_blank"
            rel="noopener noreferrer"
            dangerouslySetInnerHTML={{ __html: SRC[sid][0] }}
          />
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}

function WeightsTable() {
  return (
    <details className={styles.weights}>
      <summary>Show every weight and the paper behind it</summary>
      <div className={styles.tablewrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>From</th>
              <th>To</th>
              <th className={styles.num}>Weight</th>
              <th>Grounded in</th>
            </tr>
          </thead>
          <tbody>
            {IK.flatMap((k) =>
              (Object.keys(W1[k]) as MechKey[]).map((m) => (
                <WeightRow
                  key={`w1-${k}-${m}`}
                  from={NAMES[k]}
                  to={NAMES[m]}
                  w={W1[k][m]!}
                  sid={W1_SRC[`${k}>${m}`]}
                />
              )),
            )}
            {SK.flatMap((s) =>
              (Object.keys(W2[s]) as MechKey[]).map((m) => (
                <WeightRow
                  key={`w2-${s}-${m}`}
                  from={NAMES[m]}
                  to={NAMES[s]}
                  w={W2[s][m]!}
                  sid={W2_SRC[`${s}>${m}`]}
                />
              )),
            )}
          </tbody>
        </table>
      </div>
      <p className={styles.caveat}>
        Weights are set by hand from the cited literature, not estimated on data — no dataset exists on which a model
        like this has been fitted. The mechanism layer comes from the papers; the wiring between layers is an
        interpretive synthesis. Treat the output as a structured argument, not a prediction.
      </p>
    </details>
  );
}

function Bibliography() {
  return (
    <div className={styles.biblio}>
      <h4>References</h4>
      <ol>
        {Object.keys(SRC).map((id) => (
          <li key={id}>
            <a
              href={SRC[id][1]}
              target="_blank"
              rel="noopener noreferrer"
              dangerouslySetInnerHTML={{ __html: SRC[id][0] }}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

// Referenced for type completeness of the strategy ordering.
export type { StratKey };
