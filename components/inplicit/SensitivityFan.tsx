"use client";

import { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { computePlan, fmtK, fmtPct, type Customer, type PlanInputs } from "@/lib/inplicit/plan";
import styles from "./RevenuePlanner.module.css";

/** The assumptions worth fanning out — each one a single number the whole
    plan hangs off. */
const KNOBS = [
  { key: "cvDemoToPilot", label: "Conversion Demo → Pilot", lo: 0.05, hi: 0.6, pct: true },
  { key: "cvPilotToSub", label: "Conversion Pilot → Abo", lo: 0.1, hi: 0.9, pct: true },
  { key: "postDemos", label: "Demo-Calls nach der Runde", lo: 8, hi: 45, pct: false },
  { key: "pilotPriceList", label: "Pilot-Listenpreis", lo: 8, hi: 40, pct: false },
  { key: "subACV", label: "Abo-ACV", lo: 12, hi: 90, pct: false },
] as const satisfies readonly { key: keyof PlanInputs; label: string; lo: number; hi: number; pct: boolean }[];

const STEPS = 5;
/* Light to full accent: the fan reads as one variable, not five series. */
const SHADES = ["#c9c2ff", "#9a8cff", "#6a55ff", "#3d1fff", "#2200FF"];

type Props = { inputs: PlanInputs; customers: Customer[] };

export default function SensitivityFan({ inputs, customers }: Props) {
  const [knobKey, setKnobKey] = useState<(typeof KNOBS)[number]["key"]>("cvDemoToPilot");
  const knob = KNOBS.find((k) => k.key === knobKey)!;

  const { labels, series } = useMemo(() => {
    const values = Array.from({ length: STEPS }, (_, i) => knob.lo + ((knob.hi - knob.lo) * i) / (STEPS - 1));
    const runs = values.map((v) => ({
      value: v,
      months: computePlan({ ...inputs, [knob.key]: v }, customers).months,
    }));
    return {
      labels: runs[0].months.map((m) => m.label),
      series: runs.map((r, i) => ({
        label: knob.pct ? fmtPct(r.value, 0) : String(Math.round(r.value)),
        // Annualised recurring revenue, month by month — the shape of the ARR
        // build, not just its end point.
        data: r.months.map((m) => (m.revSub + m.revChannel) * 12),
        borderColor: SHADES[i],
        backgroundColor: "transparent",
        borderWidth: i === STEPS - 1 || i === 0 ? 2 : 1.5,
        pointRadius: 0,
        tension: 0.25,
      })),
    };
  }, [inputs, customers, knob]);

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtK(ctx.parsed.y ?? 0)} ARR` } },
    },
    scales: {
      x: { ticks: { font: { size: 10 }, color: "#8a8880", maxRotation: 0 }, grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: { font: { size: 10 }, color: "#8a8880", callback: (v) => fmtK(Number(v)) },
        grid: { color: "rgba(128,128,128,0.08)" },
      },
    },
  };

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHead}>
        <span className={styles.chartTitle}>ARR-Fächer</span>
        <select
          className={styles.custSelect}
          value={knobKey}
          onChange={(e) => setKnobKey(e.target.value as typeof knobKey)}
          aria-label="Annahme variieren"
        >
          {KNOBS.map((k) => (
            <option key={k.key} value={k.key}>
              {k.label}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.chartLegend}>
        {series.map((s, i) => (
          <span key={s.label + i}>
            <i className={styles.swatch} style={{ background: SHADES[i] }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className={styles.chartBox}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Line data={{ labels, datasets: series as any }} options={options} />
      </div>
      <p className={styles.chartFoot}>
        Eine einzige Annahme über ihre plausible Spanne, alles andere unverändert. Je enger der Fächer, desto weniger
        hängt der Plan an dieser Zahl.
      </p>
    </div>
  );
}
