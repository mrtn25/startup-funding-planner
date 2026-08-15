"use client";

import { useMemo, useState } from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import styles from "./GrowthPlanner.module.css";
import {
  DEFAULT_GROWTH,
  MOTIONS,
  computeGrowth,
  fmtK,
  landOnlyBaseline,
  motionContribution,
  type GrowthInputs,
  type GrowthMonth,
} from "@/lib/growth-motions";
import type { ToolId } from "@/components/PillNav";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const LAND = "#2200FF";
const EXPAND = "#a8cf12";
const LICENSE = "#00B5AD";
const AXIS = "#8a8880";

/**
 * Every line you can put on the chart, and which scale it belongs on.
 *
 * Three axes rather than one, because these are three different kinds of
 * quantity. Revenue and costs are monthly flows; cash is a running balance
 * that after two years is an order of magnitude larger and would flatten
 * every flow line against the floor if they shared a scale; customers and
 * headcount are counts. Cash also gets a neutral colour — it is a result,
 * not one of the motions, and shouldn't borrow their palette.
 */
const SERIES: {
  key: string;
  label: string;
  color: string;
  axis: "y" | "y2" | "y3";
  dash?: boolean;
  get: (m: GrowthMonth) => number;
}[] = [
  { key: "revenue", label: "Revenue", color: "#141413", axis: "y", get: (m) => m.revenue },
  { key: "land", label: "· from Land", color: LAND, axis: "y", get: (m) => m.revLand },
  { key: "expand", label: "· from Expand", color: EXPAND, axis: "y", get: (m) => m.revExpand },
  { key: "license", label: "· from License", color: LICENSE, axis: "y", get: (m) => m.revLicense },
  { key: "cost", label: "Costs", color: "#d85a30", axis: "y", dash: true, get: (m) => m.cost },
  {
    key: "perPerson",
    label: "Revenue per person-month",
    color: "#7c3aed",
    axis: "y",
    get: (m) => m.revenuePerPerson,
  },
  { key: "cash", label: "Cash balance", color: "#475569", axis: "y3", get: (m) => m.cash },
  {
    key: "customers",
    label: "Customers served",
    color: "#0091EA",
    axis: "y2",
    get: (m) => m.landCustomers + m.endCustomers,
  },
  { key: "sold", label: "· sold to directly", color: "#0091EA", axis: "y2", dash: true, get: (m) => m.landCustomers + m.partners },
  { key: "people", label: "People", color: "#8a8880", axis: "y2", get: (m) => m.people },
  { key: "capacity", label: "Capacity used", color: "#b45309", axis: "y2", dash: true, get: (m) => m.capacityUsed },
];

/* Opens on the question the tool exists to answer: what revenue is doing, and
   whether it is coming loose from headcount. */
const DEFAULT_SELECTED = ["revenue", "land", "expand", "perPerson"];

type Props = { onOpenTool?: (id: ToolId) => void };

export default function GrowthPlanner({ onOpenTool }: Props) {
  const [s, setS] = useState<GrowthInputs>(DEFAULT_GROWTH);
  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTED);

  const set = <K extends keyof GrowthInputs>(k: K, v: GrowthInputs[K]) => setS((p) => ({ ...p, [k]: v }));

  const plan = useMemo(() => computeGrowth(s), [s]);
  const baseline = useMemo(() => landOnlyBaseline(s), [s]);
  const contrib = useMemo(
    () => ({ expand: motionContribution(s, "expand"), license: motionContribution(s, "license") }),
    [s],
  );

  const { months, summary } = plan;
  const cap = summary.capital;
  const leverageGain = summary.leverageStart > 0 ? summary.leverageEnd / summary.leverageStart : 0;

  const toggle = (key: string) =>
    setSelected((sel) => (sel.includes(key) ? sel.filter((k) => k !== key) : [...sel, key]));

  const active = SERIES.filter((ser) => selected.includes(ser.key));
  const usesCount = active.some((ser) => ser.axis === "y2");
  const usesCash = active.some((ser) => ser.axis === "y3");

  const chartData = {
    labels: months.map((m) => m.label),
    datasets: active.map((ser) => ({
      label: ser.label,
      data: months.map(ser.get),
      borderColor: ser.color,
      backgroundColor: ser.key === "cash" ? "rgba(29,158,117,0.08)" : "transparent",
      borderWidth: 2,
      borderDash: ser.dash ? [5, 4] : undefined,
      pointRadius: 0,
      pointHoverRadius: 4,
      fill: ser.key === "cash",
      tension: 0.25,
      yAxisID: ser.axis,
    })),
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const ser = active[ctx.datasetIndex];
            const v = ctx.parsed.y ?? 0;
            return `${ser.label}: ${ser.axis === "y2" ? v.toFixed(1) : fmtK(v)}`;
          },
        },
      },
    },
    scales: {
      x: { ticks: { font: { size: 10 }, color: AXIS, maxRotation: 0 }, grid: { display: false } },
      y: {
        position: "left",
        ticks: { font: { size: 10 }, color: AXIS, callback: (v) => fmtK(Number(v)) },
        grid: { color: "rgba(128,128,128,0.08)" },
      },
      y2: {
        display: usesCount,
        position: "right",
        beginAtZero: true,
        ticks: { font: { size: 10 }, color: AXIS },
        grid: { display: false },
      },
      y3: {
        display: usesCash,
        position: "right",
        ticks: { font: { size: 10 }, color: "#475569", callback: (v) => fmtK(Number(v)) },
        grid: { display: false },
      },
    },
  };

  return (
    <section className={styles.root} aria-label="Growth planner">
      <header className={styles.head}>
        <h2>Can you grow out of your own revenue?</h2>
        <p>
          Most planning tools treat a growth motion as another revenue line. It isn&apos;t. A motion is a
          particular relationship between effort and revenue, and that relationship — not the number of lines —
          decides the shape of the curve. Switch the motions on and off and watch what happens to{" "}
          <strong>revenue per person-month</strong>: flat means you are selling your time, rising means something has
          actually come unstuck from your headcount.
        </p>
      </header>

      {/* ── The verdict ── */}
      <div className={`${styles.verdict} ${cap.bootstrappable ? styles.verdictOk : styles.verdictWarn}`}>
        <div className={styles.verdictMain}>
          {cap.bootstrappable ? (
            <>
              <strong>You can fund this out of revenue.</strong> Cash never drops below{" "}
              {fmtK(cap.minCash)} — the low point is {months[cap.minCashMonth].label}. Raising would buy speed, not
              survival.
            </>
          ) : cap.tooLate ? (
            <>
              <strong>You need outside money, and you are already late.</strong> Cash goes under in{" "}
              {months[cap.breachMonth!].label}, but a round takes {s.fundraiseLeadMonths} months to close — you would
              have had to start {Math.abs(cap.startRaisingMonth!)} month
              {Math.abs(cap.startRaisingMonth!) === 1 ? "" : "s"} before this plan begins. Cut burn or shorten the
              gap.
            </>
          ) : (
            <>
              <strong>You need about {fmtK(cap.capitalNeeded)} of outside money.</strong> Cash goes under in{" "}
              {months[cap.breachMonth!].label}, so with a {s.fundraiseLeadMonths}-month raise you have to start by{" "}
              <strong>{months[cap.startRaisingMonth!]?.label ?? "immediately"}</strong>.
            </>
          )}
        </div>
        {!cap.bootstrappable && onOpenTool && (
          <button type="button" className={styles.verdictBtn} onClick={() => onOpenTool("round")}>
            → Size that round
          </button>
        )}
      </div>

      <div className={styles.layout}>
        {/* ── Chart, two thirds ── */}
        <div className={styles.chartCol}>
          <div className={styles.pickerLabel}>Lines to show</div>
          <div className={styles.picker} role="group" aria-label="Chart series">
            {SERIES.map((ser) => {
              const on = selected.includes(ser.key);
              const dim =
                (ser.key === "expand" && !s.expandOn) || (ser.key === "license" && !s.licenseOn);
              return (
                <button
                  key={ser.key}
                  type="button"
                  aria-pressed={on}
                  disabled={dim}
                  className={`${styles.chip}${on ? ` ${styles.chipOn}` : ""}`}
                  style={on ? { borderColor: ser.color, color: ser.color } : undefined}
                  onClick={() => toggle(ser.key)}
                  title={dim ? "That motion is switched off" : undefined}
                >
                  <i className={styles.chipDot} style={{ background: ser.color }} />
                  {ser.label}
                </button>
              );
            })}
          </div>

          <div className={styles.chartBox}>
            <Line data={chartData} options={options} />
          </div>
          <p className={styles.chartFoot}>
            Left axis: monthly flows in k€. Cash gets its own scale — it is a running balance, and on the same axis
            it would flatten every revenue line against the floor.
          </p>

          {/* ── What the motions actually did ── */}
          <div className={styles.leverage}>
            <div className={styles.levCard}>
              <div className={styles.levLabel}>Revenue per person-month</div>
              <div className={styles.levValue}>
                {fmtK(summary.leverageStart)} → {fmtK(summary.leverageEnd)}
              </div>
              <div className={styles.levSub}>
                {leverageGain >= 1.15 ? (
                  <>
                    <strong>{leverageGain.toFixed(1)}×</strong> more revenue per person than you started with. That
                    gap is the whole argument for the leveraged motions.
                  </>
                ) : (
                  <>
                    Barely moved. Right now every extra euro costs you an extra person — that is a services
                    business, whatever the product looks like.
                  </>
                )}
              </div>
            </div>

            <div className={styles.levCard}>
              <div className={styles.levLabel}>Reach against sales</div>
              <div className={styles.levValue}>{summary.endReachMultiple.toFixed(1)}×</div>
              <div className={styles.levSub}>
                Serving {Math.round(summary.endCustomersServed)} customers.{" "}
                {summary.endReachMultiple > 1.05
                  ? "You sell to one and reach several — that is the licence multiplier."
                  : "Every customer served is a customer you sold to yourself."}
              </div>
            </div>

            <div className={styles.levCard}>
              <div className={styles.levLabel}>Capacity-free revenue</div>
              <div className={styles.levValue}>{Math.round(summary.capacityFreeShare * 100)} %</div>
              <div className={styles.levSub}>
                Share of the final month&apos;s revenue that consumed no delivery slot. This is the part that keeps
                paying while you sleep.
              </div>
            </div>

            <div className={styles.levCard}>
              <div className={styles.levLabel}>Against Land alone</div>
              <div className={styles.levValue}>
                {baseline.summary.revenueTotal > 0
                  ? `${(summary.revenueTotal / baseline.summary.revenueTotal).toFixed(1)}×`
                  : "–"}
              </div>
              <div className={styles.levSub}>
                {fmtK(summary.revenueTotal)} with the motions on, {fmtK(baseline.summary.revenueTotal)} with only
                one-off deals — same team, same months.
              </div>
            </div>
          </div>
        </div>

        {/* ── Controls, one third ── */}
        <div className={styles.controlCol}>
          <div className={styles.groupTitle}>Growth motions</div>
          {MOTIONS.map((mo) => {
            const on = mo.key === "land" ? true : mo.key === "expand" ? s.expandOn : s.licenseOn;
            const locked = mo.key === "land";
            const colour = mo.key === "land" ? LAND : mo.key === "expand" ? EXPAND : LICENSE;
            return (
              <div key={mo.key} className={styles.motion}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  disabled={locked}
                  className={`${styles.motionBtn}${on ? ` ${styles.motionBtnOn}` : ""}`}
                  style={on ? { background: colour, borderColor: colour } : undefined}
                  onClick={() => (mo.key === "expand" ? set("expandOn", !s.expandOn) : set("licenseOn", !s.licenseOn))}
                >
                  <span className={styles.knob} />
                  {mo.label}
                  <span className={styles.motionShort}>{mo.short}</span>
                </button>
                <p className={styles.motionBlurb}>{mo.blurb}</p>
                {mo.key !== "land" && on && (
                  <p className={styles.motionContrib}>
                    Worth <strong>{fmtK(mo.key === "expand" ? contrib.expand : contrib.license)}</strong> over the
                    horizon — what disappears if you switch it off.
                  </p>
                )}
              </div>
            );
          })}

          <div className={styles.groupTitle}>What one sale is worth</div>
          <div className={styles.dealCompare}>
            <DealBar label="Land deal" value={summary.landDealValue} max={maxDeal(summary)} color={LAND} note="one-off" />
            {s.expandOn && (
              <DealBar
                label="Expand account"
                value={summary.expandAccountValue}
                max={maxDeal(summary)}
                color={EXPAND}
                note={`${s.expandMultiple}× the land price, per year, no new sale`}
              />
            )}
            {s.licenseOn && (
              <DealBar
                label="Licence deal"
                value={summary.licenseDealValue}
                max={maxDeal(summary)}
                color={LICENSE}
                note={`fee + ${s.partnerReach} end customers, per year, one sale`}
              />
            )}
          </div>

          <div className={styles.groupTitle}>Starting position</div>
          <Num label="Cash today" v={s.startCash} set={(v) => set("startCash", v)} step={5} unit="k€" />
          <Num label="Fixed costs" v={s.fixedCosts} set={(v) => set("fixedCosts", v)} step={0.5} unit="k€ / mo" />
          <Num label="Founders" v={s.founders} set={(v) => set("founders", Math.max(1, v))} step={1} unit="" />
          <Num
            label="Founder draw"
            hint="What each founder actually takes out"
            v={s.founderDraw}
            set={(v) => set("founderDraw", v)}
            step={0.5}
            unit="k€ / mo"
          />
          <Num label="Months to plan" v={s.months} set={(v) => set("months", clamp(v, 6, 60))} step={6} unit="months" />

          <div className={styles.groupTitle}>Capacity</div>
          <Num
            label="Deals one person delivers"
            v={s.deliveryPerPerson}
            set={(v) => set("deliveryPerPerson", v)}
            step={0.5}
            unit="/ mo"
          />
          <Num label="Max team" v={s.maxTeam} set={(v) => set("maxTeam", v)} step={1} unit="people" />
          <Num label="Hires per month" v={s.hiringRate} set={(v) => set("hiringRate", v)} step={0.1} unit="/ mo" />
          <Num
            label="Cost per hire"
            v={s.costPerEmployee}
            set={(v) => set("costPerEmployee", v)}
            step={0.5}
            unit="k€ / mo"
          />
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={s.hireOnlyFromCash}
              onChange={(e) => set("hireOnlyFromCash", e.target.checked)}
            />
            <span>
              Only hire what revenue has paid for
              <span className={styles.checkHint}>
                The bootstrap constraint: a hire needs {s.hireBuffer} months of their cost in the bank first. Turn it
                off to plan as if the money were already raised.
              </span>
            </span>
          </label>

          <div className={styles.groupTitle}>Land</div>
          <Num label="New deals you can source" v={s.landDeals} set={(v) => set("landDeals", v)} step={0.5} unit="/ mo" />
          <Num label="Price per deal" v={s.landPrice} set={(v) => set("landPrice", v)} step={1} unit="k€" />
          <Num label="Delivery cost per deal" v={s.landCost} set={(v) => set("landCost", v)} step={0.5} unit="k€" />

          {s.expandOn && (
            <>
              <div className={styles.groupTitle}>Expand</div>
              <Pct label="Share that upsell" v={s.expandRate} set={(v) => set("expandRate", v)} />
              <Num label="Months until they do" v={s.expandLag} set={(v) => set("expandLag", clamp(v, 0, 24))} step={1} unit="months" />
              <Num
                label="Contract size"
                hint={`× the land price → ${fmtK(s.landPrice * s.expandMultiple)} a year`}
                v={s.expandMultiple}
                set={(v) => set("expandMultiple", Math.max(0.1, v))}
                step={0.5}
                unit="×"
              />
              <Pct
                label="Base grows monthly"
                v={s.expandGrowth}
                set={(v) => set("expandGrowth", v)}
                max={0.1}
                step={0.0025}
                digits={2}
              />
              <Num
                label="Capacity per account"
                hint="What it costs you to keep serving them"
                v={s.expandEffort}
                set={(v) => set("expandEffort", v)}
                step={0.05}
                unit="slots"
              />
            </>
          )}

          {s.licenseOn && (
            <>
              <div className={styles.groupTitle}>License</div>
              <Num
                label="Partners signed"
                v={s.partnersPerMonth}
                set={(v) => set("partnersPerMonth", v)}
                step={0.05}
                unit="/ mo"
              />
              <Num label="Licence fee" v={s.partnerFee} set={(v) => set("partnerFee", v)} step={1} unit="k€ / yr" />
              <Num
                label="End customers per partner"
                hint="The multiplier — you never sell to these"
                v={s.partnerReach}
                set={(v) => set("partnerReach", v)}
                step={1}
                unit="customers"
              />
              <Num
                label="Revenue per end customer"
                v={s.revPerEndCustomer}
                set={(v) => set("revPerEndCustomer", v)}
                step={0.5}
                unit="k€ / yr"
              />
              <Num label="Months to full reach" v={s.partnerRamp} set={(v) => set("partnerRamp", clamp(v, 1, 24))} step={1} unit="months" />
              <Num
                label="Capacity per end customer"
                hint="Near zero when the partner delivers — that is what makes licensing scale"
                v={s.endCustomerEffort}
                set={(v) => set("endCustomerEffort", v)}
                step={0.01}
                unit="slots"
              />
            </>
          )}

          <div className={styles.groupTitle}>The capital question</div>
          <Num
            label="Cash floor"
            hint="The balance you refuse to go below"
            v={s.minCashBuffer}
            set={(v) => set("minCashBuffer", v)}
            step={5}
            unit="k€"
          />
          <Num
            label="Months to close a round"
            v={s.fundraiseLeadMonths}
            set={(v) => set("fundraiseLeadMonths", clamp(v, 1, 18))}
            step={1}
            unit="months"
          />
        </div>
      </div>

      <div className={styles.caveat}>
        <strong>What this is and isn&apos;t.</strong> The mechanism is the honest part: capacity-bound revenue grows
        linearly with your people, upsell revenue compounds on a base you already paid to acquire, and licensed
        revenue scales with someone else&apos;s customer list instead of your headcount. The numbers are yours to
        supply — the defaults are illustrative, and the conversion rates and reach figures are exactly the
        assumptions worth arguing about. Treat the capital verdict as a costed argument, not a forecast.
      </div>
    </section>
  );
}

/* ── Pieces ── */

function maxDeal(s: { landDealValue: number; expandAccountValue: number; licenseDealValue: number }) {
  return Math.max(s.landDealValue, s.expandAccountValue, s.licenseDealValue, 1);
}

function DealBar({
  label,
  value,
  max,
  color,
  note,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  note: string;
}) {
  return (
    <div className={styles.dealRow}>
      <div className={styles.dealHead}>
        <span>{label}</span>
        <strong>{fmtK(value)}</strong>
      </div>
      <div className={styles.dealTrack}>
        <div className={styles.dealFill} style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
      <span className={styles.dealNote}>{note}</span>
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

function Num({
  label,
  hint,
  v,
  set,
  step,
  unit,
}: {
  label: string;
  hint?: string;
  v: number;
  set: (v: number) => void;
  step: number;
  unit: string;
}) {
  return (
    <Field label={label} hint={hint}>
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
    </Field>
  );
}

function Pct({
  label,
  hint,
  v,
  set,
  max = 1,
  step = 0.01,
  digits = 0,
}: {
  label: string;
  hint?: string;
  v: number;
  set: (v: number) => void;
  max?: number;
  step?: number;
  digits?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        className={styles.range}
        type="range"
        min={0}
        max={max}
        step={step}
        value={v}
        onChange={(e) => set(+e.target.value)}
        aria-label={label}
      />
      <span className={styles.pctVal}>{(v * 100).toFixed(digits)} %</span>
    </Field>
  );
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
