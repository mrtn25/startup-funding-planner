"use client";

import { useMemo, useState } from "react";
import { CategoryScale, Chart as ChartJS, Filler, LineElement, LinearScale, PointElement, Tooltip, type ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";
import styles from "./RecurringCalc.module.css";
import { fmtMoney } from "@/lib/recurring";
import {
  BILLINGS,
  DEFAULT_LAND_EXPAND,
  computeLandExpand,
  type Billing,
  type LandExpandInputs,
  type PilotMode,
} from "@/lib/land-expand";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const ACCENT = "#2200FF";
const LIME = "#8fae0f";
const GREY = "#9a978d";
const AXIS = "#8a8880";

const num1 = (v: number) => (v >= 10 ? Math.round(v).toString() : v.toFixed(1));

/**
 * Land and expand, in ACV.
 *
 * The tool next door assumes everything already recurs. This one starts
 * where a lot of B2B software actually starts — with a paid project that
 * the recurring contract is meant to grow out of — and keeps the two kinds
 * of money apart, because only one of them is ARR.
 */
export default function LandExpand() {
  const [s, setS] = useState<LandExpandInputs>(DEFAULT_LAND_EXPAND);
  const r = useMemo(() => computeLandExpand(s), [s]);

  const set = <K extends keyof LandExpandInputs>(k: K, v: LandExpandInputs[K]) =>
    setS((p) => ({ ...p, [k]: v }));

  const isSub = s.pilotMode === "subscription";
  const m = r.months;

  const chart = {
    labels: m.map((x) => `M${x.month}`),
    datasets: [
      {
        label: "Platform ARR",
        data: m.map((x) => x.platformArr),
        borderColor: ACCENT,
        backgroundColor: "rgba(34,0,255,0.10)",
        borderWidth: 2,
        pointRadius: 0,
        fill: "origin",
        tension: 0.2,
        order: 2,
      },
      ...(isSub
        ? [
            {
              label: "Pilot ARR",
              data: m.map((x) => x.arr),
              borderColor: LIME,
              backgroundColor: "rgba(143,174,15,0.14)",
              borderWidth: 2,
              pointRadius: 0,
              fill: "-1" as const,
              tension: 0.2,
              order: 3,
            },
          ]
        : []),
      {
        label: "Revenue × 12 — not ARR",
        data: m.map((x) => x.recognised * 12),
        borderColor: GREY,
        borderDash: [4, 3],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        tension: 0.2,
        order: 1,
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
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtMoney(ctx.parsed.y ?? 0)}` } },
    },
    scales: {
      x: { ticks: { font: { size: 10 }, color: AXIS, maxRotation: 0, autoSkipPadding: 18 }, grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: { font: { size: 10 }, color: AXIS, callback: (v) => fmtMoney(Number(v)) },
        grid: { color: "rgba(128,128,128,0.08)" },
      },
    },
  };

  /* The twelve-month bridge, which is what NRR is actually computed on. */
  const from = Math.max(0, m.length - 13);
  const base = m[from].arr;
  let bNew = 0;
  let bExp = 0;
  let bChurn = 0;
  for (let k = from + 1; k < m.length; k++) {
    bNew += m[k].newArr;
    bExp += m[k].expansionArr;
    bChurn += m[k].churnedArr;
  }
  const widest = Math.max(bNew, bExp, bChurn, 1);

  return (
    <>
      <div className={styles.modes} role="group" aria-label="What the first engagement is">
        <span className={styles.modesLabel}>The first engagement is</span>
        {(
          [
            ["oneOff", "A one-off project", "Paid once, has to be won again"],
            ["subscription", "A small subscription", "Recurring from the start, at a lower price"],
          ] as [PilotMode, string, string][]
        ).map(([key, label, hint]) => (
          <button
            key={key}
            type="button"
            className={`${styles.mode}${s.pilotMode === key ? ` ${styles.modeOn}` : ""}`}
            aria-pressed={s.pilotMode === key}
            onClick={() => set("pilotMode", key)}
          >
            <strong>{label}</strong>
            <span>{hint}</span>
          </button>
        ))}
      </div>

      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>ARR in month {r.final.month}</div>
          <div className={styles.kpiValue}>{fmtMoney(r.final.arr)}</div>
          <div className={styles.kpiSub}>{num1(r.final.platformCustomers)} platform contracts</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>ACV</div>
          <div className={styles.kpiValue}>{fmtMoney(r.acv)}</div>
          <div className={styles.kpiSub}>
            {s.contractYears > 1 ? `TCV ${fmtMoney(r.tcv)} over ${s.contractYears} years` : "per platform licence, per year"}
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Net revenue retention</div>
          <div className={`${styles.kpiValue} ${r.nrr >= 1 ? styles.ok : styles.warnTxt}`}>
            {Math.round(r.nrr * 100)} %
          </div>
          <div className={styles.kpiSub}>gross {Math.round(r.grr * 100)} %, trailing 12 months</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Deferred revenue</div>
          <div className={styles.kpiValue}>{fmtMoney(r.final.deferred)}</div>
          <div className={styles.kpiSub}>billed, not yet earned</div>
        </div>
      </div>

      {/* The whole point of the mode switch, stated in numbers. */}
      <div className={styles.gap}>
        <div>
          Booked as {isSub ? "a subscription" : "a one-off project"}, an upgrade lands as{" "}
          <strong>{isSub ? "expansion" : "new ARR"}</strong> and net retention reads{" "}
          <strong>{Math.round(r.nrr * 100)} %</strong>. Book the identical business the other way and it reads{" "}
          <strong className={styles.gapBad}>{Math.round(r.nrrIfOther * 100)} %</strong>. Same customers, same cash,
          same product — the difference is what the first contract says. Neither number is a lie; only one of them
          will match the data room, so it is worth knowing which one you are quoting.
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.mainCol}>
          <div className={styles.groupTitle}>What is contracted, and what only looks like it</div>
          <div className={styles.chartBox}>
            <Line data={chart} options={options} />
          </div>
          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <i style={{ background: ACCENT }} /> Platform ARR
            </span>
            {isSub && (
              <span className={styles.legendItem}>
                <i style={{ background: LIME }} /> Pilot ARR
              </span>
            )}
            <span className={styles.legendItem}>
              <i className={styles.legendDash} /> Revenue × 12 — not ARR
            </span>
          </div>
          <p className={styles.chartFoot}>
            {isSub
              ? "Both bands are contracted, so both are ARR. The dashed line sits on top of them only where a project fee is still being earned."
              : "The gap between the filled band and the dashed line is the project work. It is money, often the best money a young company has, and it is not ARR — every one of those has to be sold again."}
          </p>

          <div className={styles.groupTitle}>Month by month</div>
          <div className={styles.planScroll}>
            <table className={`${styles.planTable} ${styles.tight}`}>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>New pilots</th>
                  <th>Pilots live</th>
                  <th>Upgrades</th>
                  <th>Platform</th>
                  <th>ARR</th>
                  <th>{isSub ? "Pilot ARR" : "Project revenue"}</th>
                  <th>Billed</th>
                  <th>Deferred</th>
                </tr>
              </thead>
              <tbody>
                {m.map((x) => (
                  <tr key={x.month} className={x.upgrades > 0 && x.month === s.upgradeLagMonths ? styles.rowMark : undefined}>
                    <td>M{x.month}</td>
                    <td>{num1(x.newProjects)}</td>
                    <td>{num1(x.pilotCustomers)}</td>
                    <td>{num1(x.upgrades)}</td>
                    <td>{num1(x.platformCustomers)}</td>
                    <td className={styles.calc}>{fmtMoney(x.arr)}</td>
                    <td className={styles.calc}>{fmtMoney(isSub ? x.pilotArr : x.projectRevenue)}</td>
                    <td className={styles.calc}>{fmtMoney(x.billings)}</td>
                    <td className={styles.calc}>{fmtMoney(x.deferred)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.groupTitle}>The last twelve months, as a bridge</div>
          <p className={styles.bridgeIntro}>
            Retention is computed on the base that existed twelve months ago — new business is not retention. In a
            land-and-expand model the two move in opposite directions, which is why the gross number is worth reading
            beside the net one.
          </p>
          <div className={styles.bridge}>
            <BridgeRow label={`ARR in month ${from}`} value={base} width={0} tone="base" />
            <BridgeRow label="New" value={bNew} width={bNew / widest} tone="up" />
            <BridgeRow label="Expansion" value={bExp} width={bExp / widest} tone="up" />
            <BridgeRow label="Churn at renewal" value={-bChurn} width={bChurn / widest} tone="down" />
            <BridgeRow label={`ARR in month ${r.final.month}`} value={r.final.arr} width={0} tone="base" />
          </div>
        </div>

        <div className={styles.controlCol}>
          <div className={styles.groupTitle}>Land</div>
          <Num label="Pilots won in month 0" v={s.projectsMonth1} set={(v) => set("projectsMonth1", v)} step={1} unit="/ mo" />
          <Pct label="The win rate itself grows" hint="Per month — the curve of the land motion" v={s.projectGrowth} set={(v) => set("projectGrowth", v)} max={0.3} />
          {isSub ? (
            <Num label="Pilot ACV" hint="Annualised — this counts as ARR while it runs" v={s.pilotAcv} set={(v) => set("pilotAcv", v)} step={1000} unit="€ / yr" />
          ) : (
            <>
              <Num label="Project fee" hint="Charged once, per pilot" v={s.projectFee} set={(v) => set("projectFee", v)} step={1000} unit="€" />
              <Num label="Delivered over" hint="What the fee is earned across" v={s.projectMonths} set={(v) => set("projectMonths", Math.max(1, v))} step={1} unit="months" />
            </>
          )}

          <div className={styles.groupTitle}>Expand</div>
          <Pct label="Pilots that step up" hint="One decision per cohort — those who don't, don't later either" v={s.upgradeShare} set={(v) => set("upgradeShare", v)} />
          <Num label="Decision lands after" v={s.upgradeLagMonths} set={(v) => set("upgradeLagMonths", v)} step={1} unit="months" />
          <Num label="Platform ACV" hint="Annual value of the full licence" v={s.platformAcv} set={(v) => set("platformAcv", v)} step={5000} unit="€ / yr" />
          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              Billed
              <span className={styles.fieldHint}>Annual upfront collects the year on day one</span>
            </span>
            <select className={styles.select} value={s.billing} onChange={(e) => set("billing", e.target.value as Billing)} aria-label="Billing">
              {BILLINGS.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <Num label="Contract term" hint="TCV is this times the ACV — and TCV is not ARR" v={s.contractYears} set={(v) => set("contractYears", Math.min(5, Math.max(1, v)))} step={1} unit="years" />
          <Num label="Bought outright" hint="Customers who skip the pilot entirely" v={s.directWinsPerMonth} set={(v) => set("directWinsPerMonth", v)} step={0.5} unit="/ mo" />

          <div className={styles.groupTitle}>At renewal</div>
          <Pct label="Price and seat uplift" hint="Per year, applied when the contract renews" v={s.annualUplift} set={(v) => set("annualUplift", v)} max={0.5} />
          <Pct label="Not renewing" hint="Per year. An annual contract cannot churn mid-term" v={s.annualChurn} set={(v) => set("annualChurn", v)} max={0.6} />
          <Num label="Horizon" v={s.horizonMonths} set={(v) => set("horizonMonths", Math.min(72, Math.max(12, v)))} step={6} unit="months" />

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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function BridgeRow({ label, value, width, tone }: { label: string; value: number; width: number; tone: "base" | "up" | "down" }) {
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
  unit = "€",
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

function Pct({
  label,
  hint,
  v,
  set,
  max = 1,
}: {
  label: string;
  hint?: string;
  v: number;
  set: (v: number) => void;
  max?: number;
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
        max={Math.round(max * 100)}
        step={1}
        value={Math.round(v * 100)}
        onChange={(e) => set(Math.min(max, Math.max(0, +e.target.value / 100)))}
        aria-label={label}
      />
      <span className={styles.unit}>%</span>
    </label>
  );
}
