"use client";

import { useMemo, useState } from "react";
import { ArcElement, Chart as ChartJS, Tooltip, type ChartOptions } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import styles from "./EquitySplit.module.css";
import {
  DEFAULT_SPLIT,
  FACTORS,
  PRACTICE,
  PRESETS,
  SRC,
  computeSplit,
  newFounder,
  type FactorKey,
  type SplitInputs,
} from "@/lib/equity-split";

ChartJS.register(ArcElement, Tooltip);

const BAR = ["#2200FF", "#a8cf12", "#00B5AD", "#7c3aed", "#d85a30", "#0091EA"];
/* Forfeited slices are drawn hollow rather than in a colour of their own:
   they are the absence of a claim, not a party to the split. */
const FORFEIT = "rgba(138,136,128,0.22)";

export default function EquitySplit() {
  const [s, setS] = useState<SplitInputs>(DEFAULT_SPLIT);
  const r = useMemo(() => computeSplit(s), [s]);

  const set = <K extends keyof SplitInputs>(k: K, v: SplitInputs[K]) => setS((p) => ({ ...p, [k]: v }));
  const setScore = (id: string, key: FactorKey, v: number) =>
    setS((p) => ({
      ...p,
      founders: p.founders.map((f) => (f.id === id ? { ...f, scores: { ...f.scores, [key]: v } } : f)),
    }));
  const patchFounder = (id: string, patch: Partial<(typeof s.founders)[number]>) =>
    setS((p) => ({ ...p, founders: p.founders.map((f) => (f.id === id ? { ...f, ...patch } : f)) }));

  const equalPct = s.founders.length ? 100 / s.founders.length : 0;
  const totalVested = r.founders.reduce((a, f) => a + f.keptShare, 0);

  /* Two concentric rings on one figure: what was agreed, and what is actually
     earned so far. Chart.js draws dataset 0 as the outer ring, so the agreed
     split goes first and the vested breakdown sits inside it. The inner ring
     alternates kept and forfeited per founder, which keeps each pair radially
     under its own outer slice. */
  const pieData = {
    labels: r.founders.map((f, i) => f.name || `Founder ${i + 1}`),
    datasets: [
      {
        data: r.founders.map((f) => f.share * 100),
        backgroundColor: r.founders.map((_, i) => BAR[i % BAR.length]),
        borderWidth: 0,
        spacing: 2,
        weight: 1.4,
      },
      {
        data: r.founders.flatMap((f) => [f.keptShare * 100, f.forfeitedShare * 100]),
        backgroundColor: r.founders.flatMap((_, i) => [BAR[i % BAR.length], FORFEIT]),
        borderWidth: 0,
        spacing: 1,
        weight: 1,
      },
    ],
  };

  const pieOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "42%",
    animation: { animateRotate: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed;
            if (ctx.datasetIndex === 0) return `${ctx.label}: ${v.toFixed(1)} % of the company`;
            // The inner ring runs kept, forfeited, kept, forfeited …
            const who = r.founders[Math.floor(ctx.dataIndex / 2)];
            const name = who?.name || `Founder ${Math.floor(ctx.dataIndex / 2) + 1}`;
            return ctx.dataIndex % 2 === 0
              ? `${name} has earned ${v.toFixed(1)} %`
              : `${name} would forfeit ${v.toFixed(1)} %`;
          },
        },
      },
    },
  };

  return (
    <section className={styles.root} aria-label="Co-founder equity split">
      <header className={styles.head}>
        <h2>Who should get how much?</h2>
        <p>
          Roughly three quarters of founding teams split equally, usually within a month of starting. The research
          does not say that is wrong — plenty of equal splits are correct. It says that teams who arrived there{" "}
          <em>by default</em> rather than by argument were far likelier to be unhappy with it later, and much less
          able to change it once it mattered. So this makes the factors explicit and shows what they imply.
        </p>
      </header>

      {/* ── The answer ── */}
      <div className={styles.result}>
        <div className={styles.cake}>
          <div className={styles.pieWrap}>
            <Doughnut data={pieData} options={pieOptions} />
            <div className={styles.pieCentre}>
              <strong>{Math.round(totalVested * 100)} %</strong>
              <span>vested by month {s.departureMonth}</span>
            </div>
          </div>
          <p className={styles.pieNote}>
            The outer ring is the agreed split. The inner ring is how much of it each founder would actually own if
            they walked in month {s.departureMonth} — the hollow part has not been earned yet and returns to everyone
            who stayed.
          </p>
        </div>

        <div className={styles.bars}>
        {r.founders.map((f, i) => (
          <div key={f.id} className={styles.slice}>
            <div className={styles.sliceHead}>
              <span className={styles.sliceName}>{f.name || `Founder ${i + 1}`}</span>
              <strong className={styles.slicePct}>{(f.share * 100).toFixed(1)} %</strong>
            </div>
            <div className={styles.track}>
              <div
                className={styles.fill}
                style={{ width: `${f.share * 100}%`, background: BAR[i % BAR.length] }}
              />
              <div className={styles.equalMark} style={{ left: `${equalPct}%` }} title="An equal split" />
            </div>
            <div className={styles.sliceFoot}>
              <span>
                {f.vsEqual >= 0 ? "+" : ""}
                {f.vsEqual.toFixed(1)} pts vs equal
              </span>
              <span>{Math.round(f.points)} points</span>
            </div>
          </div>
        ))}
        <p className={styles.resultNote}>
          The hairline on each bar is where an equal split would sit. A split you can defend line by line survives a
          bad year; a quick handshake often does not.
        </p>
        </div>
      </div>

      <div className={styles.layout}>
        {/* ── Factors and founders ── */}
        <div className={styles.mainCol}>
          <div className={styles.groupTitle}>How much each factor matters here</div>
          <div className={styles.presets}>
            {PRESETS.map((p) => {
              const on = FACTORS.every((f) => s.weights[f.key] === p.weights[f.key]);
              return (
                <button
                  key={p.key}
                  type="button"
                  aria-pressed={on}
                  className={`${styles.preset}${on ? ` ${styles.presetOn}` : ""}`}
                  onClick={() => set("weights", { ...p.weights })}
                  title={p.note}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <p className={styles.presetNote}>
            {PRESETS.find((p) => FACTORS.every((f) => s.weights[f.key] === p.weights[f.key]))?.note ??
              "Custom weighting."}
          </p>

          <div className={styles.factorScroll}>
            <table className={styles.grid}>
              <thead>
                <tr>
                  <th>Factor</th>
                  <th className={styles.weightCol}>Weight</th>
                  {s.founders.map((f, i) => (
                    <th key={f.id} style={{ color: BAR[i % BAR.length] }}>
                      {f.name || `Founder ${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FACTORS.map((factor) => (
                  <tr key={factor.key}>
                    <td className={styles.factorCell}>
                      <span className={styles.factorLabel}>{factor.label}</span>
                      <span className={styles.factorNote}>{factor.note}</span>
                    </td>
                    <td className={styles.weightCol}>
                      <input
                        className={styles.num}
                        type="number"
                        min={0}
                        max={10}
                        step={1}
                        value={s.weights[factor.key]}
                        onChange={(e) =>
                          set("weights", { ...s.weights, [factor.key]: clamp(+e.target.value, 0, 10) })
                        }
                        aria-label={`Weight for ${factor.label}`}
                      />
                    </td>
                    {s.founders.map((f) => (
                      <td key={f.id}>
                        <input
                          className={styles.num}
                          type="number"
                          min={0}
                          max={10}
                          step={1}
                          value={f.scores[factor.key]}
                          onChange={(e) => setScore(f.id, factor.key, clamp(+e.target.value, 0, 10))}
                          aria-label={`${f.name || "Founder"} on ${factor.label}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className={styles.nameRow}>
                  <td className={styles.factorCell}>
                    <span className={styles.factorLabel}>Name & months already in</span>
                  </td>
                  <td className={styles.weightCol} />
                  {s.founders.map((f) => (
                    <td key={f.id}>
                      <input
                        className={styles.nameInput}
                        type="text"
                        value={f.name}
                        placeholder="Name"
                        onChange={(e) => patchFounder(f.id, { name: e.target.value })}
                        aria-label="Founder name"
                      />
                      <input
                        className={styles.num}
                        type="number"
                        min={0}
                        step={1}
                        value={f.monthsServed}
                        onChange={(e) => patchFounder(f.id, { monthsServed: Math.max(0, +e.target.value) })}
                        aria-label="Months already served"
                      />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className={styles.founderBtns}>
            <button
              type="button"
              className={styles.addBtn}
              onClick={() => set("founders", [...s.founders, newFounder(`Founder ${s.founders.length + 1}`)])}
            >
              + Add a founder
            </button>
            {s.founders.length > 2 && (
              <button
                type="button"
                className={styles.addBtn}
                onClick={() => set("founders", s.founders.slice(0, -1))}
              >
                − Remove the last
              </button>
            )}
          </div>
        </div>

        {/* ── Vesting ── */}
        <div className={styles.sideCol}>
          <div className={styles.groupTitle}>Vesting</div>
          <Field label="Vesting period" hint="Four years is the convention investors expect">
            <input
              className={styles.num}
              type="number"
              min={0}
              step={1}
              value={s.vesting.years}
              onChange={(e) => set("vesting", { ...s.vesting, years: Math.max(0, +e.target.value) })}
              aria-label="Vesting years"
            />
            <span className={styles.unit}>years</span>
          </Field>
          <Field label="Cliff" hint="Nothing vests before it, then it pays out at once">
            <input
              className={styles.num}
              type="number"
              min={0}
              step={1}
              value={s.vesting.cliffMonths}
              onChange={(e) => set("vesting", { ...s.vesting, cliffMonths: Math.max(0, +e.target.value) })}
              aria-label="Cliff months"
            />
            <span className={styles.unit}>months</span>
          </Field>
          <Field label="Credit for past work" hint="Months counted as already vested on day one">
            <input
              className={styles.num}
              type="number"
              min={0}
              step={3}
              value={s.vesting.creditMonths}
              onChange={(e) => set("vesting", { ...s.vesting, creditMonths: Math.max(0, +e.target.value) })}
              aria-label="Credited months"
            />
            <span className={styles.unit}>months</span>
          </Field>

          <div className={styles.groupTitle}>If someone leaves</div>
          <Field label="They walk in month">
            <input
              className={styles.range}
              type="range"
              min={0}
              max={Math.max(12, s.vesting.years * 12 + 12)}
              step={1}
              value={s.departureMonth}
              onChange={(e) => set("departureMonth", +e.target.value)}
              aria-label="Departure month"
            />
            <span className={styles.rangeVal}>{s.departureMonth}</span>
          </Field>

          <div className={styles.leaveList}>
            {r.founders.map((f, i) => (
              <div key={f.id} className={styles.leaveRow}>
                <span className={styles.leaveName} style={{ color: BAR[i % BAR.length] }}>
                  {f.name || `Founder ${i + 1}`}
                </span>
                <span className={styles.leaveNums}>
                  keeps <strong>{(f.keptShare * 100).toFixed(1)} %</strong>
                  {f.forfeitedShare > 0.0005 && (
                    <>
                      {" "}
                      · forfeits {(f.forfeitedShare * 100).toFixed(1)} %
                    </>
                  )}
                </span>
                <span className={styles.leaveBar}>
                  <span
                    className={styles.leaveFill}
                    style={{ width: `${f.vestedFraction * 100}%`, background: BAR[i % BAR.length] }}
                  />
                </span>
              </div>
            ))}
          </div>
          <p className={styles.leaveNote}>
            What is forfeited returns to the company and lifts everyone who stayed. This row is the reason vesting
            exists — run the slider back to month six and look at it.
          </p>
        </div>
      </div>

      {/* ── What to watch ── */}
      {r.warnings.length > 0 && (
        <div className={styles.warnings}>
          <div className={styles.groupTitle}>Worth checking</div>
          {r.warnings.map((w) => (
            <div key={w.key} className={`${styles.warn} ${w.level === "warn" ? styles.warnHard : styles.warnSoft}`}>
              <p>{w.text}</p>
              <Sources ids={w.sources} />
            </div>
          ))}
        </div>
      )}

      {/* ── How this is done in practice ──
          The arithmetic above settles the number. These are the questions
          that come immediately after it, and the ones founders tend not to
          ask until the answer has already cost them something. */}
      <div className={styles.practice}>
        <div className={styles.groupTitle}>How this is done in practice</div>
        <div className={styles.practiceGrid}>
          {PRACTICE.map((n) => (
            <details key={n.id} className={styles.pItem}>
              <summary>
                {n.question}
                {n.rule && <span className={styles.pRule}>{n.rule}</span>}
              </summary>
              <p>{n.answer}</p>
              <Sources ids={n.sources} />
            </details>
          ))}
        </div>
        <p className={styles.practiceNote}>
          Conventions, not law — and the German notes are specific to a GmbH. Anything you are about to sign is worth
          an hour of a lawyer who does this weekly; this is for knowing what to ask them.
        </p>
      </div>

      <details className={styles.biblio}>
        <summary>References ({Object.keys(SRC).length})</summary>
        <ol>
          {Object.keys(SRC).map((id) => (
            <li key={id}>
              <a href={SRC[id][1]} target="_blank" rel="noopener noreferrer" dangerouslySetInnerHTML={{ __html: SRC[id][0] }} />
            </li>
          ))}
        </ol>
        <p className={styles.caveat}>
          The weighted-factor method cannot tell you the right answer, because there isn&apos;t one — it turns a
          disagreement about fairness into a disagreement about numbers, which is a great deal easier to have. Score
          each other rather than yourselves, do it separately first, and compare. Where you differ is the actual
          conversation.
        </p>
      </details>
    </section>
  );
}

/** Renders whatever it can resolve. A source key that does not exist is a
    typo, not a reason for the page to stop rendering. */
function Sources({ ids }: { ids: string[] }) {
  const found = ids.filter((id) => SRC[id]);
  if (!found.length) return null;
  return (
    <div className={styles.warnSrc}>
      {found.map((id) => (
        <a
          key={id}
          href={SRC[id][1]}
          target="_blank"
          rel="noopener noreferrer"
          dangerouslySetInnerHTML={{ __html: SRC[id][0] }}
        />
      ))}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>
        {label}
        {hint && <span className={styles.fieldHint}>{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
