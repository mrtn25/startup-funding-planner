"use client";

import { useMemo, useState } from "react";
import { BarElement, CategoryScale, Chart as ChartJS, Filler, LineElement, LinearScale, PointElement, Tooltip, type ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";
import styles from "./RecurringCalc.module.css";
import LandExpand from "./LandExpand";
import {
  DEFAULT_RECURRING,
  SRC,
  TERMS,
  computeRecurring,
  fmtMoney,
  newPlan,
  type RecurringInputs,
  type Term,
} from "@/lib/recurring";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip);

const ACCENT = "#2200FF";
const AXIS = "#8a8880";

type Mode = "plans" | "landExpand";

export default function RecurringCalc() {
  /* Two shapes of the same question. The plan-and-bridge view assumes
     everything already recurs; a lot of B2B software starts with a paid
     project instead, and that case needs its own arithmetic rather than a
     row in the plan table. */
  const [mode, setMode] = useState<Mode>("plans");
  const [s, setS] = useState<RecurringInputs>(DEFAULT_RECURRING);
  const r = useMemo(() => computeRecurring(s), [s]);

  const set = <K extends keyof RecurringInputs>(k: K, v: RecurringInputs[K]) => setS((p) => ({ ...p, [k]: v }));
  const patchPlan = (id: string, patch: Partial<(typeof s.plans)[number]>) =>
    setS((p) => ({ ...p, plans: p.plans.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));

  const chart = {
    labels: r.projection.map((p) => `M${p.month}`),
    datasets: [
      {
        label: "ARR",
        data: r.projection.map((p) => p.arr),
        borderColor: ACCENT,
        backgroundColor: "rgba(34,0,255,0.08)",
        borderWidth: 2,
        pointRadius: 0,
        fill: true,
        tension: 0.25,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `ARR: ${fmtMoney(ctx.parsed.y ?? 0)}` } },
    },
    scales: {
      x: { ticks: { font: { size: 10 }, color: AXIS, maxRotation: 0 }, grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: { font: { size: 10 }, color: AXIS, callback: (v) => fmtMoney(Number(v)) },
        grid: { color: "rgba(128,128,128,0.08)" },
      },
    },
  };

  const b = r.bridge;
  /* The bridge bars are drawn against the largest single movement, so the
     small ones stay visible instead of collapsing to a hairline. */
  const widest = Math.max(b.newMrr, b.expansionMrr, b.contractionMrr, b.churnedMrr, 1);

  return (
    <section className={styles.root} aria-label="ARR and MRR calculator">
      <header className={styles.head}>
        <h2>What is actually recurring?</h2>
        <p>
          The arithmetic is trivial. What is not, and what costs founders credibility in diligence, is deciding what
          may be counted. ARR is contracted recurring revenue annualised — not last month times twelve. Setup fees,
          services and usage above a committed floor are revenue and are not ARR, and an investor will strip them out
          whether or not you did.
        </p>
      </header>

      <div className={styles.toolModes} role="tablist" aria-label="Revenue shape">
        {(
          [
            ["plans", "Plans & bridge"],
            ["landExpand", "Land → expand (ACV)"],
          ] as [Mode, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            className={`${styles.toolMode}${mode === key ? ` ${styles.toolModeOn}` : ""}`}
            onClick={() => setMode(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "landExpand" && <LandExpand />}

      {mode === "plans" && (
      <>
      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>MRR</div>
          <div className={styles.kpiValue}>{fmtMoney(r.mrr)}</div>
          <div className={styles.kpiSub}>contracted, this month</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>ARR</div>
          <div className={styles.kpiValue}>{fmtMoney(r.arr)}</div>
          <div className={styles.kpiSub}>MRR × 12 — the defensible number</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Net revenue retention</div>
          <div className={`${styles.kpiValue} ${r.nrr >= 1 ? styles.ok : styles.warnTxt}`}>
            {Math.round(r.nrr * 100)} %
          </div>
          <div className={styles.kpiSub}>gross {Math.round(r.grr * 100)} %</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Growth</div>
          <div className={`${styles.kpiValue} ${r.monthlyGrowth >= 0 ? styles.ok : styles.warnTxt}`}>
            {(r.monthlyGrowth * 100).toFixed(1)} %
          </div>
          <div className={styles.kpiSub}>per month, from the bridge</div>
        </div>
      </div>

      {r.nonRecurring > 0 && (
        <div className={styles.gap}>
          <div>
            <strong>{fmtMoney(r.arr)}</strong> is your ARR.{" "}
            <strong className={styles.gapBad}>{fmtMoney(r.inflatedArr)}</strong> is what annualising every euro that
            landed this month would claim — a gap of {fmtMoney(r.inflationGap)}. The difference is{" "}
            {fmtMoney(r.nonRecurring)} a month of setup, services and overage: real revenue, not contracted, and the
            first thing diligence removes.
          </div>
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.mainCol}>
          <div className={styles.groupTitle}>Where the recurring revenue comes from</div>
          <div className={styles.planScroll}>
            <table className={styles.planTable}>
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Price</th>
                  <th>Billed</th>
                  <th>Customers</th>
                  <th>MRR</th>
                  <th>ARR</th>
                  <th aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {s.plans.map((p, i) => {
                  const line = r.lines[i];
                  return (
                    <tr key={p.id}>
                      <td>
                        <input
                          className={styles.text}
                          value={p.name}
                          placeholder={`Plan ${i + 1}`}
                          onChange={(e) => patchPlan(p.id, { name: e.target.value })}
                          aria-label="Plan name"
                        />
                      </td>
                      <td>
                        <input
                          className={styles.num}
                          type="number"
                          min={0}
                          step={50}
                          value={p.price}
                          onChange={(e) => patchPlan(p.id, { price: Math.max(0, +e.target.value) })}
                          aria-label="Price"
                        />
                      </td>
                      <td>
                        <select
                          className={styles.select}
                          value={p.term}
                          onChange={(e) => patchPlan(p.id, { term: e.target.value as Term })}
                          aria-label="Billing term"
                        >
                          {TERMS.map((t) => (
                            <option key={t.key} value={t.key}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          className={styles.num}
                          type="number"
                          min={0}
                          step={1}
                          value={p.customers}
                          onChange={(e) => patchPlan(p.id, { customers: Math.max(0, +e.target.value) })}
                          aria-label="Customers"
                        />
                      </td>
                      <td className={styles.calc}>{fmtMoney(line.mrr)}</td>
                      <td className={styles.calc}>
                        {fmtMoney(line.arr)}
                        <span className={styles.shareBar}>
                          <span style={{ width: `${line.shareOfArr * 100}%` }} />
                        </span>
                      </td>
                      <td>
                        {s.plans.length > 1 && (
                          <button
                            type="button"
                            className={styles.rowBtn}
                            onClick={() => set("plans", s.plans.filter((x) => x.id !== p.id))}
                            aria-label={`Remove ${p.name || "plan"}`}
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>Total</td>
                  <td className={styles.calc}>{fmtMoney(r.mrr)}</td>
                  <td className={styles.calc}>{fmtMoney(r.arr)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <button type="button" className={styles.addBtn} onClick={() => set("plans", [...s.plans, newPlan()])}>
            + Add a plan
          </button>

          <div className={styles.groupTitle}>The bridge — this month</div>
          <p className={styles.bridgeIntro}>
            Two companies with identical growth can have completely different bridges, and the bridge is what the next
            round is priced on. Retention counts the existing base only; new business is not retention.
          </p>
          <div className={styles.bridge}>
            <BridgeRow label="Starting MRR" value={b.startMrr} width={0} tone="base" />
            <BridgeRow label="New" value={b.newMrr} width={b.newMrr / widest} tone="up" />
            <BridgeRow label="Expansion" value={b.expansionMrr} width={b.expansionMrr / widest} tone="up" />
            <BridgeRow label="Contraction" value={-b.contractionMrr} width={b.contractionMrr / widest} tone="down" />
            <BridgeRow label="Churn" value={-b.churnedMrr} width={b.churnedMrr / widest} tone="down" />
            <BridgeRow label="Ending MRR" value={b.endMrr} width={0} tone="base" />
          </div>

          <div className={styles.chartBox}>
            <Line data={chart} options={options} />
          </div>
          <p className={styles.chartFoot}>
            ARR carried forward at the growth the current bridge implies — {(r.monthlyGrowth * 100).toFixed(1)} % a
            month. A straight line off one month, not a forecast: the point is what today&apos;s retention compounds
            to, not what will happen.
          </p>
        </div>

        <div className={styles.controlCol}>
          <div className={styles.groupTitle}>Movements this month</div>
          <Num label="New MRR" hint="From customers who were not there last month" v={s.newMrr} set={(v) => set("newMrr", v)} />
          <Num label="Expansion MRR" hint="Upgrades within the existing base" v={s.expansionMrr} set={(v) => set("expansionMrr", v)} />
          <Num label="Contraction MRR" hint="Downgrades that did not cancel" v={s.contractionMrr} set={(v) => set("contractionMrr", v)} />
          <Num label="Churned MRR" hint="Customers who left entirely" v={s.churnedMrr} set={(v) => set("churnedMrr", v)} />

          <div className={styles.groupTitle}>Revenue that is not ARR</div>
          <Num label="Setup / onboarding fees" v={s.setupFees} set={(v) => set("setupFees", v)} />
          <Num label="Services" hint="Anything re-won each time" v={s.servicesRevenue} set={(v) => set("servicesRevenue", v)} />
          <Num label="Usage above the floor" v={s.overageRevenue} set={(v) => set("overageRevenue", v)} />

          <div className={styles.groupTitle}>Projection</div>
          <Num label="Months" v={s.horizonMonths} set={(v) => set("horizonMonths", Math.min(60, Math.max(3, v)))} step={6} unit="months" />

          {r.verdicts.length > 0 && (
            <div className={styles.verdicts}>
              {r.verdicts.map((v) => (
                <div
                  key={v.key}
                  className={`${styles.verdict} ${
                    v.level === "warn" ? styles.vWarn : v.level === "ok" ? styles.vOk : styles.vNote
                  }`}
                >
                  <p>{v.text}</p>
                  {v.sources.filter((id) => SRC[id]).map((id) => (
                    <a
                      key={id}
                      href={SRC[id][1]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.src}
                      dangerouslySetInnerHTML={{ __html: SRC[id][0] }}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </section>
  );
}

function BridgeRow({
  label,
  value,
  width,
  tone,
}: {
  label: string;
  value: number;
  width: number;
  tone: "base" | "up" | "down";
}) {
  return (
    <div className={`${styles.bRow} ${tone === "base" ? styles.bBase : ""}`}>
      <span className={styles.bLabel}>{label}</span>
      <span className={styles.bTrack}>
        {tone !== "base" && (
          <span className={`${styles.bFill} ${tone === "up" ? styles.bUp : styles.bDown}`} style={{ width: `${width * 100}%` }} />
        )}
      </span>
      <span className={`${styles.bValue} ${tone === "down" ? styles.warnTxt : tone === "up" ? styles.ok : ""}`}>
        {value > 0 && tone === "up" ? "+" : ""}
        {fmtMoney(value)}
      </span>
    </div>
  );
}

function Num({
  label,
  hint,
  v,
  set,
  step = 100,
  unit = "€ / mo",
}: {
  label: string;
  hint?: string;
  v: number;
  set: (v: number) => void;
  step?: number;
  unit?: string;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>
        {label}
        {hint && <span className={styles.fieldHint}>{hint}</span>}
      </span>
      <input
        className={styles.num}
        type="number"
        min={0}
        step={step}
        value={v}
        onChange={(e) => set(Math.max(0, +e.target.value))}
        aria-label={label}
      />
      <span className={styles.unit}>{unit}</span>
    </label>
  );
}
