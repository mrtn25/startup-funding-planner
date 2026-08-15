"use client";

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type Chart,
  type ChartOptions,
  type Plugin,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { fmtK, type PlanMonth } from "@/lib/inplicit/plan";
import styles from "./RevenuePlanner.module.css";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip);

/* The three motions keep one colour each across every chart, so a bar in the
   revenue chart and a bar in the customer chart mean the same thing. */
export const MOTION = {
  land: "#2200FF",
  expand: "#a8cf12",
  multiplier: "#00B5AD",
} as const;

const REVENUE_LINE = "#2200FF";
const COST_LINE = "#d85a30";
const CASH_OK = "#1d9e75";
const CASH_BAD = "#d85a30";
const AXIS = "#8a8880";

/**
 * Paints a band behind the hovered month. The month table sets the index, so
 * hovering a row lights up the same month in all four charts at once.
 */
const highlightPlugin: Plugin<"bar" | "line"> = {
  id: "inplicitHighlight",
  beforeDatasetsDraw(chart: Chart) {
    const idx = (chart.options as { highlightIndex?: number | null }).highlightIndex;
    if (idx == null || idx < 0) return;
    const x = chart.scales.x;
    if (!x) return;
    const centre = x.getPixelForValue(idx);
    const band = Math.max(6, (x.width / Math.max(1, x.ticks.length)) * 0.9);
    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.fillStyle = "rgba(34,0,255,0.10)";
    ctx.fillRect(centre - band / 2, chartArea.top, band, chartArea.bottom - chartArea.top);
    ctx.restore();
  },
};

ChartJS.register(highlightPlugin);

type Props = {
  months: PlanMonth[];
  fundingMonth: number;
  breakEvenMonth: number | null;
  highlight: number | null;
  expandActive: boolean;
  channelActive: boolean;
};

export default function PlanCharts({
  months,
  fundingMonth,
  breakEvenMonth,
  highlight,
  expandActive,
  channelActive,
}: Props) {
  const labels = months.map((m) => m.label);

  const common = (highlightIndex: number | null) =>
    ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false as const,
      interaction: { mode: "index" as const, intersect: false },
      highlightIndex,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { font: { size: 10 }, color: AXIS, maxRotation: 0, autoSkip: true }, grid: { display: false } },
      },
    }) as ChartOptions<"bar" | "line"> & { highlightIndex: number | null };

  /* ── 1 · Customer base ── */
  const customerData = {
    labels,
    datasets: [
      {
        label: "Pilotkunden",
        data: months.map((m) => m.pilotsTotal - (expandActive ? m.subsTotal : 0)),
        backgroundColor: MOTION.land,
      },
      ...(expandActive
        ? [{ label: "Abo-Kunden", data: months.map((m) => m.subsTotal), backgroundColor: MOTION.expand }]
        : []),
      ...(channelActive
        ? [{ label: "Channel-Partner", data: months.map((m) => m.partnersActive), backgroundColor: MOTION.multiplier }]
        : []),
    ],
  };

  const stackedBarOptions = {
    ...common(highlight),
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number } }) =>
            `${ctx.dataset.label}: ${Math.round(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: { ...common(highlight).scales!.x, stacked: true },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: { font: { size: 10 }, color: AXIS, precision: 0 },
        grid: { color: "rgba(128,128,128,0.08)" },
      },
    },
  } as ChartOptions<"bar">;

  /* ── 2 · Revenue by motion ── */
  const revenueData = {
    labels,
    datasets: [
      { label: "Land · Pilot", data: months.map((m) => m.revPilot), backgroundColor: MOTION.land },
      ...(expandActive
        ? [{ label: "Expand · Abo", data: months.map((m) => m.revSub), backgroundColor: MOTION.expand }]
        : []),
      ...(channelActive
        ? [
            {
              label: "Multiplier · Channel",
              data: months.map((m) => m.revChannel),
              backgroundColor: MOTION.multiplier,
            },
          ]
        : []),
    ],
  };

  const revenueOptions = {
    ...stackedBarOptions,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number } }) =>
            `${ctx.dataset.label}: ${fmtK(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      ...stackedBarOptions.scales,
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: { font: { size: 10 }, color: AXIS, callback: (v: string | number) => fmtK(Number(v)) },
        grid: { color: "rgba(128,128,128,0.08)" },
      },
    },
  } as ChartOptions<"bar">;

  /* ── 3 · Revenue against cost ── */
  const marginData = {
    labels,
    datasets: [
      {
        label: "Umsatz",
        data: months.map((m) => m.revenue),
        borderColor: REVENUE_LINE,
        backgroundColor: "rgba(34,0,255,0.08)",
        borderWidth: 2,
        pointRadius: (c: { dataIndex: number }) => (c.dataIndex === breakEvenMonth ? 5 : 0),
        pointBackgroundColor: CASH_OK,
        fill: false,
        tension: 0.2,
      },
      {
        label: "Kosten",
        data: months.map((m) => m.cost),
        borderColor: COST_LINE,
        backgroundColor: "transparent",
        borderWidth: 2,
        borderDash: [5, 4],
        pointRadius: 0,
        fill: false,
        tension: 0.2,
      },
    ],
  };

  const lineOptions = (fmt: (v: number) => string) =>
    ({
      ...common(highlight),
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: { dataset: { label?: string }; parsed: { y: number } }) =>
              `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: common(highlight).scales!.x,
        y: {
          ticks: { font: { size: 10 }, color: AXIS, callback: (v: string | number) => fmt(Number(v)) },
          grid: { color: "rgba(128,128,128,0.08)" },
        },
      },
    }) as ChartOptions<"line">;

  /* ── 4 · Cash ── */
  const cashData = {
    labels,
    datasets: [
      {
        label: "Cash",
        data: months.map((m) => m.cash),
        borderColor: CASH_OK,
        backgroundColor: "rgba(29,158,117,0.10)",
        borderWidth: 2,
        // Red only where it actually goes under — the semantics stay honest.
        segment: {
          borderColor: (c: { p1: { parsed: { y: number } } }) => (c.p1.parsed.y < 0 ? CASH_BAD : CASH_OK),
        },
        pointRadius: (c: { dataIndex: number }) => (c.dataIndex === fundingMonth ? 5 : 0),
        pointBackgroundColor: MOTION.land,
        fill: true,
        tension: 0.2,
      },
    ],
  };

  return (
    <div className={styles.charts}>
      <ChartCard
        title="Kundenbestand"
        legend={[
          { c: MOTION.land, l: "Pilotkunden" },
          ...(expandActive ? [{ c: MOTION.expand, l: "Abo-Kunden" }] : []),
          ...(channelActive ? [{ c: MOTION.multiplier, l: "Channel-Partner" }] : []),
        ]}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Bar data={customerData as any} options={stackedBarOptions} />
      </ChartCard>

      <ChartCard
        title="Umsatz nach Motion"
        legend={[
          { c: MOTION.land, l: "Land · Pilot" },
          ...(expandActive ? [{ c: MOTION.expand, l: "Expand · Abo" }] : []),
          ...(channelActive ? [{ c: MOTION.multiplier, l: "Multiplier · Channel" }] : []),
        ]}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Bar data={revenueData as any} options={revenueOptions} />
      </ChartCard>

      <ChartCard
        title="Umsatz gegen Kosten"
        note={breakEvenMonth != null ? `Break-even: ${months[breakEvenMonth].label}` : "Kein Break-even im Zeitraum"}
        legend={[
          { c: REVENUE_LINE, l: "Umsatz" },
          { c: COST_LINE, l: "Kosten" },
        ]}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Line data={marginData as any} options={lineOptions(fmtK)} />
      </ChartCard>

      <ChartCard
        title="Cash-Verlauf"
        note={`Runde: ${months[fundingMonth]?.label ?? "außerhalb des Zeitraums"}`}
        legend={[
          { c: CASH_OK, l: "Cash" },
          { c: MOTION.land, l: "Zufluss Runde" },
        ]}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Line data={cashData as any} options={lineOptions(fmtK)} />
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  note,
  legend,
  children,
}: {
  title: string;
  note?: string;
  legend: { c: string; l: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHead}>
        <span className={styles.chartTitle}>{title}</span>
        {note && <span className={styles.chartNote}>{note}</span>}
      </div>
      <div className={styles.chartLegend}>
        {legend.map((it) => (
          <span key={it.l}>
            <i className={styles.swatch} style={{ background: it.c }} />
            {it.l}
          </span>
        ))}
      </div>
      <div className={styles.chartBox}>{children}</div>
    </div>
  );
}
