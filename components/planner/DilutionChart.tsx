"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { fmtM, roundName, ROUND_DEF_BY_ID, type CalcResult, type PlannerState } from "@/lib/planner";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

type Props = {
  data: CalcResult;
  state: PlannerState;
  onToggleVal: () => void;
  onToggleInv: () => void;
};

export default function DilutionChart({ data, state, onToggleVal, onToggleInv }: Props) {
  const { snaps, active } = data;
  const { showVal, showInv } = state;

  const labels = ["Founding", ...active.map((r) => roundName(r.id))];
  const at = (label: string) => snaps[label];

  const founderData = labels.map((l) => +(at(l)?.founderPct ?? 0).toFixed(1));
  const esopData = labels.map((l) => +(at(l)?.esopPct ?? 0).toFixed(1));

  const roundSets = active.map((r) => {
    const def = ROUND_DEF_BY_ID[r.id];
    const name = roundName(r.id);
    return {
      label: name,
      data: labels.map((l) => +(at(l)?.roundPcts?.[name] ?? 0).toFixed(1)),
      backgroundColor: def.bg,
      borderColor: def.color,
      borderWidth: 2,
      fill: "stack" as const,
      tension: 0.15,
      pointRadius: 5,
      pointBackgroundColor: def.color,
      spanGaps: true,
      yAxisID: "y",
    };
  });

  const datasets: Record<string, unknown>[] = [
    {
      label: "Founders",
      data: founderData,
      backgroundColor: "rgba(127,119,221,0.18)",
      borderColor: "#7F77DD",
      borderWidth: 2,
      fill: "stack",
      tension: 0.15,
      pointRadius: 5,
      pointBackgroundColor: "#7F77DD",
      spanGaps: true,
      yAxisID: "y",
    },
    {
      label: "ESOP",
      data: esopData,
      backgroundColor: "rgba(239,159,39,0.12)",
      borderColor: "#EF9F27",
      borderWidth: 1.5,
      borderDash: [4, 3],
      fill: "stack",
      tension: 0,
      pointRadius: 4,
      pointBackgroundColor: "#EF9F27",
      spanGaps: true,
      yAxisID: "y",
    },
    ...roundSets,
  ];

  if (showVal) {
    datasets.push({
      label: "Valuation",
      data: labels.map((l) => (at(l)?.postM != null ? +at(l).postM!.toFixed(1) : null)),
      borderColor: "#E24B4A",
      borderWidth: 2,
      backgroundColor: "transparent",
      fill: false,
      tension: 0.2,
      pointRadius: 5,
      pointBackgroundColor: "#E24B4A",
      spanGaps: false,
      yAxisID: "y2",
      order: 0,
    });
  }
  if (showInv) {
    datasets.push({
      label: "Cum. Investment",
      data: labels.map((l) => (at(l)?.cumInvest != null ? +at(l).cumInvest.toFixed(2) : null)),
      borderColor: "#639922",
      borderWidth: 2,
      borderDash: [6, 4],
      backgroundColor: "transparent",
      fill: false,
      tension: 0.2,
      pointRadius: 5,
      pointBackgroundColor: "#639922",
      spanGaps: false,
      yAxisID: "y2",
      order: 0,
    });
  }

  const hasY2 = showVal || showInv;

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            ctx.dataset.yAxisID === "y2"
              ? `${ctx.dataset.label}: ${fmtM(ctx.parsed.y)}`
              : `${ctx.dataset.label}: ${(ctx.parsed.y ?? 0).toFixed(1)}%`,
        },
      },
    },
    scales: {
      x: { ticks: { font: { size: 11 }, autoSkip: false }, grid: { display: false } },
      y: {
        stacked: true,
        min: 0,
        max: 100,
        position: "left",
        ticks: { callback: (v) => v + "%", font: { size: 11 } },
        grid: { color: "rgba(128,128,128,0.07)" },
      },
      y2: {
        display: hasY2,
        position: "right",
        ticks: { callback: (v) => fmtM(Number(v)), font: { size: 10 } },
        grid: { display: false },
        beginAtZero: true,
      },
    },
  };

  const legendItems = [
    { color: "#7F77DD", label: "Founders" },
    { color: "#EF9F27", label: "ESOP" },
    ...active.map((r) => ({ color: ROUND_DEF_BY_ID[r.id].color, label: roundName(r.id) })),
  ];

  return (
    <div className="card">
      <div className="ch">
        <div className="lr" style={{ marginBottom: 0, flex: 1 }}>
          {legendItems.map((it) => (
            <span className="li" key={it.label}>
              <span className="ls" style={{ background: it.color, opacity: 0.85 }} />
              {it.label}
            </span>
          ))}
        </div>
        <div className="cts">
          <button
            type="button"
            className={`ctb${showVal ? " on" : ""}`}
            onClick={onToggleVal}
            style={{ color: "#E24B4A" }}
          >
            <span style={{ width: 14, height: 2, background: "#E24B4A", borderRadius: 1, display: "inline-block" }} />
            Valuation
          </button>
          <button
            type="button"
            className={`ctb${showInv ? " on" : ""}`}
            onClick={onToggleInv}
            style={{ color: "#639922" }}
          >
            <span style={{ width: 14, height: 0, borderTop: "2px dashed #639922", display: "inline-block" }} />
            Investment
          </button>
        </div>
      </div>
      <div style={{ position: "relative", width: "100%", height: 300 }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Line data={{ labels, datasets: datasets as any }} options={options} />
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: "var(--text2)" }}>
        {hasY2 ? "Left axis: Ownership % — Right axis: M€" : ""}
      </div>
    </div>
  );
}
