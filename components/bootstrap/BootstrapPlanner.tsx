"use client";

import { useMemo, useState } from "react";
import styles from "./BootstrapPlanner.module.css";
import {
  assess,
  byFundability,
  CONDITIONS,
  EMPTY,
  FACT_LABEL,
  FACT_TEXT,
  factScore,
  MODEL_BY_ID,
  SRC,
  TECHNIQUES,
  type Archetype,
  type BootstrapState,
  type CondId,
  type Facts,
  type ModelId,
} from "@/lib/bootstrap";
import type { ToolId } from "@/lib/tools";

/* Prose in the model module is authored in this repo, never user input,
   so the dangerouslySetInnerHTML use in the bibliography is safe. */

const FACT_ORDER: (keyof Facts)[] = ["firstEuro", "upfront", "margin", "terms"];

/**
 * Can this business pay for itself?
 *
 * The old version asked for seventeen numbers and drew a cash curve
 * from them — a forecast nobody has at the point where this question
 * matters. Whether a business can fund itself is decided almost
 * entirely by four structural facts, and those come with the kind of
 * business you picked. So: choose the model, tick what is already
 * true, and get the one condition that is in the way.
 */
export default function BootstrapPlanner({ onOpenTool }: { onOpenTool?: (id: ToolId) => void }) {
  const [s, setS] = useState<BootstrapState>(EMPTY);
  const modelle = useMemo(() => byFundability(), []);
  const r = useMemo(() => assess(s), [s]);
  const model = MODEL_BY_ID[s.model];

  const toggle = (id: CondId) =>
    setS((p) => ({ ...p, ticked: p.ticked.includes(id) ? p.ticked.filter((x) => x !== id) : [...p.ticked, id] }));

  return (
    <section className={styles.root} aria-label="Bootstrap check">
      <header className={styles.head}>
        <h2>Can this pay for itself?</h2>
        <p className={styles.lead}>
          Bootstrapping is not a personality. Whether a company can grow on what customers pay is mostly decided by four
          facts about the business — how soon you can invoice, how much has to be spent first, how much of each sale
          survives delivering it, and whether the money arrives before or sixty days after the work. Pick what you are
          building, tick what is already true, and the answer falls out.
        </p>
      </header>

      <ol className={styles.steps}>
        <li>
          <h3>
            <span className={styles.step}>1</span> What are you building?
          </h3>
          <p className={styles.note}>Ordered by how well each one funds itself. Consulting is top for a reason.</p>
          <ul className={styles.models}>
            {modelle.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className={`${styles.model} ${s.model === m.id ? styles.modelOn : ""}`}
                  onClick={() => setS((p) => ({ ...p, model: m.id as ModelId }))}
                  aria-pressed={s.model === m.id}
                >
                  <span className={styles.modelTop}>
                    <strong>{m.label}</strong>
                    <Meter value={factScore(m.facts)} />
                  </span>
                  <span className={styles.modelWhat}>{m.what}</span>
                  <span className={styles.chips}>
                    {FACT_ORDER.map((k) => (
                      <i key={k} className={`${styles.chip} ${styles[m.facts[k]] ?? ""}`}>
                        {short(k, m.facts[k])}
                      </i>
                    ))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </li>

        <li>
          <h3>
            <span className={styles.step}>2</span> What is already true?
          </h3>
          <p className={styles.note}>Only tick what is true today. Intentions are what this tool exists to test.</p>
          <ul className={styles.conds}>
            {CONDITIONS.map((c) => {
              const on = s.ticked.includes(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`${styles.cond} ${on ? styles.condOn : ""}`}
                    onClick={() => toggle(c.id)}
                    aria-pressed={on}
                  >
                    <span className={styles.box} aria-hidden="true">
                      {on ? "✓" : ""}
                    </span>
                    <span>
                      <strong>{c.label}</strong>
                      <em>{c.hint}</em>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </li>
      </ol>

      <div className={`${styles.verdict} ${styles[r.verdict]}`}>
        <div className={styles.verdictHead}>
          <span className={styles.verdictTag}>
            {r.verdict === "yes" ? "Fundable by its customers" : r.verdict === "maybe" ? "On a knife edge" : "Needs outside money"}
          </span>
          <strong>{r.headline}</strong>
        </div>

        <div className={styles.verdictBody}>
          <p className={styles.modelNote}>{model.note}</p>

          {r.weakFact && (
            <p className={styles.structural}>
              <span>The model&apos;s own limit</span>
              {FACT_LABEL[r.weakFact.key]}: {FACT_TEXT[r.weakFact.key][r.weakFact.value].toLowerCase()}. {model.lever}
            </p>
          )}

          {r.blocker ? (
            <div className={styles.blocker}>
              <span>What is in the way right now</span>
              <strong>{r.blocker.label}</strong>
              <p>{r.blocker.fix}</p>
            </div>
          ) : (
            <div className={styles.blocker}>
              <span>Nothing left to tick</span>
              <strong>Every condition holds.</strong>
              <p>
                Then the question is no longer whether you can bootstrap, but whether you want to grow at the speed your
                own revenue allows.
              </p>
            </div>
          )}

          {r.open.length > 1 && (
            <ul className={styles.openList}>
              {r.open.slice(1).map((c) => (
                <li key={c.id}>
                  <strong>{c.label}</strong> — {c.fix}
                </li>
              ))}
            </ul>
          )}

          {r.verdict === "no" && onOpenTool && (
            <button type="button" className={styles.link} onClick={() => onOpenTool("ready")}>
              If it needs outside money, check whether you are ready to ask →
            </button>
          )}
        </div>
      </div>

      <div className={styles.techniques}>
        <h3>Ways to get money in now</h3>
        <p className={styles.note}>
          What founders actually do when the money is short, from Winborg and Landström&apos;s catalogue. Roughly in the
          order you will need them: customer money first if you can get it, your own money last.
        </p>
        <ul>
          {TECHNIQUES.map((t) => (
            <li key={t.id}>
              <span className={styles.family}>{t.family}</span>
              <strong>{t.label}</strong>
              <p>{t.what}</p>
              <span className={styles.speed}>{t.speed}</span>
            </li>
          ))}
        </ul>
      </div>

      <Bibliography />
    </section>
  );
}

function short(k: keyof Facts, v: string): string {
  const map: Record<string, string> = {
    none: "no capital",
    small: "some capital",
    heavy: "heavy capital",
    now: "invoice in weeks",
    months: "months first",
    years: "years first",
    high: "high margin",
    mixed: "mixed margin",
    thin: "thin margin",
    upfront: "paid up front",
    "on-delivery": "paid on delivery",
    late: "paid late",
  };
  return map[v] ?? `${k}: ${v}`;
}

function Meter({ value }: { value: number }) {
  return (
    <span className={styles.meter} aria-label={`Funds itself: ${Math.round(value * 100)} of 100`}>
      <i style={{ width: `${Math.round(value * 100)}%` }} />
    </span>
  );
}

function Bibliography() {
  const used = new Set<string>();
  byFundability().forEach((m: Archetype) => m.sources.forEach((x) => used.add(x)));
  CONDITIONS.forEach((c) => c.sources.forEach((x) => used.add(x)));
  TECHNIQUES.forEach((t) => t.sources.forEach((x) => used.add(x)));

  return (
    <details className={styles.biblio}>
      <summary>References ({[...used].length})</summary>
      <ol>
        {Object.keys(SRC)
          .filter((id) => used.has(id))
          .map((id) => (
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
      <p className={styles.caveat}>
        The four facts and the conditions come from the cited studies; the weights between them are set by hand, not
        fitted to data — no dataset exists on which a model like this has been estimated. The business models are a
        structuring of those same four facts, not a finding of their own: a real company can sit between two of them, and
        the one you pick should be the one whose cash behaves like yours. Read the output as an argument about where your
        constraint is, not as a prediction.
      </p>
    </details>
  );
}
