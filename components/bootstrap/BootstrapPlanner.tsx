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
import styles from "./BootstrapPlanner.module.css";
import { DEFAULT_CASH, computeCash, fmtK, type CashInputs, type CashMonth } from "@/lib/bootstrap-cash";
import type { ToolId } from "@/lib/tools";
import {
  AMBITIONS,
  DEFAULT_BOOTSTRAP,
  MARKET_CLOCKS,
  SRC,
  assessBootstrap,
  type BootstrapInputs,
} from "@/lib/bootstrap";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const AXIS = "#8a8880";

/**
 * Every line you can put on the chart.
 *
 * Deliberately without any named growth motions. An earlier version split
 * revenue into Land, Expand and License, which is one company's playbook
 * dressed up as a general model — it told every business with a different
 * shape that it was doing something wrong. What is general is revenue,
 * cost, cash and headcount.
 */
const SERIES: {
  key: string;
  label: string;
  color: string;
  axis: "y" | "y2" | "y3";
  dash?: boolean;
  get: (m: CashMonth) => number;
}[] = [
  { key: "revenue", label: "Revenue", color: "#2200FF", axis: "y", get: (m) => m.revenue },
  { key: "cost", label: "Costs", color: "#d85a30", axis: "y", dash: true, get: (m) => m.cost },
  { key: "result", label: "Result", color: "#1d9e75", axis: "y", get: (m) => m.result },
  {
    key: "perPerson",
    label: "Revenue per person-month",
    color: "#7c3aed",
    axis: "y",
    get: (m) => m.revenuePerPerson,
  },
  { key: "cash", label: "Cash balance", color: "#475569", axis: "y3", get: (m) => m.cash },
  { key: "customers", label: "Customers", color: "#0091EA", axis: "y2", get: (m) => m.customers },
  { key: "people", label: "People", color: "#8a8880", axis: "y2", dash: true, get: (m) => m.people },
];

const DEFAULT_SELECTED = ["revenue", "cost", "cash"];

type Props = { onOpenTool?: (id: ToolId) => void };

export default function BootstrapPlanner({ onOpenTool }: Props) {
  const [s, setS] = useState<CashInputs>(DEFAULT_CASH);
  const [b, setB] = useState<BootstrapInputs>(DEFAULT_BOOTSTRAP);
  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTED);

  const set = <K extends keyof CashInputs>(k: K, v: CashInputs[K]) => setS((p) => ({ ...p, [k]: v }));
  const setB1 = <K extends keyof BootstrapInputs>(k: K, v: BootstrapInputs[K]) => setB((p) => ({ ...p, [k]: v }));

  const fit = useMemo(() => assessBootstrap(b), [b]);
  const plan = useMemo(() => computeCash(s), [s]);
  const { months } = plan;
  const cap = plan.capital;

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
      backgroundColor: ser.key === "cash" ? "rgba(71,85,105,0.08)" : "transparent",
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
    <section className={styles.root} aria-label="Bootstrap planner">
      <header className={styles.head}>
        <h2>Can you bootstrap this?</h2>
        <p>
          Bootstrap or raise is not a matter of temperament. Whether a company can fund itself out of its own revenue
          is mostly a property of the business — how soon it can charge, how much of each euro survives, how much has
          to be spent before anything can be sold, and whether the market gives you the time. First the conditions,
          then the same question in cash.
        </p>
      </header>

      <BootstrapFit fit={fit} b={b} set={setB1} />

      {/* ── The verdict in cash ── */}
      <div className={`${styles.verdict} ${cap.bootstrappable ? styles.verdictOk : styles.verdictWarn}`}>
        <div className={styles.verdictMain}>
          {cap.bootstrappable ? (
            <>
              <strong>This plan funds itself.</strong> Cash never drops below {fmtK(cap.minCash)} — the low point is{" "}
              {months[cap.minCashMonth].label}. Raising would buy speed, not survival.
            </>
          ) : cap.tooLate ? (
            <>
              <strong>You need outside money, and you are already late.</strong> Cash goes under in{" "}
              {months[cap.breachMonth!].label}, but a round takes {s.fundraiseLeadMonths} months to close — you would
              have had to start {Math.abs(cap.startRaisingMonth!)} month
              {Math.abs(cap.startRaisingMonth!) === 1 ? "" : "s"} before this plan begins. Cut burn or shorten the gap.
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
        <div className={styles.chartCol}>
          <div className={styles.pickerLabel}>Lines to show</div>
          <div className={styles.picker} role="group" aria-label="Chart series">
            {SERIES.map((ser) => {
              const on = selected.includes(ser.key);
              return (
                <button
                  key={ser.key}
                  type="button"
                  aria-pressed={on}
                  className={`${styles.chip}${on ? ` ${styles.chipOn}` : ""}`}
                  style={on ? { borderColor: ser.color, color: ser.color } : undefined}
                  onClick={() => toggle(ser.key)}
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
            Left axis: monthly flows in k€. Cash has its own scale — as a running balance it would otherwise flatten
            every flow line against the floor.
          </p>

          <div className={styles.leverage}>
            <div className={styles.levCard}>
              <div className={styles.levLabel}>Break-even</div>
              <div className={styles.levValue}>
                {plan.breakEvenMonth != null ? months[plan.breakEvenMonth].label : "—"}
              </div>
              <div className={styles.levSub}>
                {plan.breakEvenMonth != null
                  ? "From here the result stays positive. A single good month earlier does not count."
                  : "The result never turns positive and stays that way inside the horizon."}
              </div>
            </div>
            <div className={styles.levCard}>
              <div className={styles.levLabel}>Revenue per person-month</div>
              <div className={styles.levValue}>
                {fmtK(months[0].revenuePerPerson)} → {fmtK(months[months.length - 1].revenuePerPerson)}
              </div>
              <div className={styles.levSub}>
                Flat means every extra euro costs an extra person — the shape of a services business, whatever the
                product looks like.
              </div>
            </div>
            <div className={styles.levCard}>
              <div className={styles.levLabel}>Customers at the end</div>
              <div className={styles.levValue}>{Math.round(plan.endCustomers)}</div>
              <div className={styles.levSub}>
                Carried by {months[months.length - 1].people} people at {s.customersPerPerson} each — capacity is what
                caps this, not ambition.
              </div>
            </div>
          </div>
        </div>

        <div className={styles.controlCol}>
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

          <div className={styles.groupTitle}>Revenue</div>
          <Num
            label="New customers in month one"
            v={s.startNewCustomers}
            set={(v) => set("startNewCustomers", v)}
            step={0.5}
            unit="customers"
          />
          <Pct
            label="Growth of that rate"
            v={s.acquisitionGrowth}
            set={(v) => set("acquisitionGrowth", v)}
            max={0.4}
            step={0.005}
          />
          <Num
            label="Revenue per customer"
            v={s.revenuePerCustomer}
            set={(v) => set("revenuePerCustomer", v)}
            step={1}
            unit="k€ / yr"
          />
          <Pct
            label="Share that recurs"
            hint="100 % is a subscription, 0 % a one-off project"
            v={s.recurringShare}
            set={(v) => set("recurringShare", v)}
          />
          <Pct label="Churn per year" v={s.churnPerYear} set={(v) => set("churnPerYear", v)} max={0.8} />
          <Num label="Cost to serve" v={s.costToServe} set={(v) => set("costToServe", v)} step={0.5} unit="k€ / yr" />
          <Num label="Cost to win one" hint="CAC" v={s.cac} set={(v) => set("cac", v)} step={0.5} unit="k€" />

          <div className={styles.groupTitle}>Capacity</div>
          <Num
            label="Customers one person carries"
            v={s.customersPerPerson}
            set={(v) => set("customersPerPerson", v)}
            step={1}
            unit="customers"
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
        <strong>What this is and isn&apos;t.</strong> The mechanism is the honest part: capacity caps how many
        customers can be served, hiring waits for money that already exists, and cash either lasts or it doesn&apos;t.
        The numbers are yours to supply — the defaults are illustrative. Treat the verdict as a costed argument, not a
        forecast.
      </div>
    </section>
  );
}

/* ── The conditions ──────────────────────────────────────────
   Deliberately the first thing on the page. The cash simulation below
   answers "does this plan run dry"; it cannot answer "should this
   business be bootstrapped at all", and a plan that survives on paper
   while the market is being carved up elsewhere is not an answer. */

function BootstrapFit({
  fit,
  b,
  set,
}: {
  fit: ReturnType<typeof assessBootstrap>;
  b: BootstrapInputs;
  set: <K extends keyof BootstrapInputs>(k: K, v: BootstrapInputs[K]) => void;
}) {
  const [open, setOpen] = useState(false);
  const tone = fit.verdict === "yes" ? styles.fitYes : fit.verdict === "maybe" ? styles.fitMaybe : styles.fitNo;

  return (
    <div className={styles.fit}>
      <div className={`${styles.fitHead} ${tone}`}>
        <div className={styles.fitScore}>
          <strong>{Math.round(fit.score * 100)}</strong>
          <span>/ 100</span>
        </div>
        <div className={styles.fitText}>
          <div className={styles.fitHeadline}>{fit.headline}</div>
          {fit.hardStops.length > 0 ? (
            <p className={styles.fitSub}>
              {fit.hardStops.map((c) => c.label).join(" and ")} rules it out on its own — no amount of frugality
              elsewhere compensates for money that has to be spent before anything can be sold, or for a market that
              is decided before you arrive.
            </p>
          ) : fit.blocker ? (
            <p className={styles.fitSub}>
              The binding constraint is <strong>{fit.blocker.label.toLowerCase()}</strong>. {fit.blocker.requirement}
            </p>
          ) : (
            <p className={styles.fitSub}>Nothing here is in the way. The question below is only how fast.</p>
          )}
        </div>
      </div>

      <div className={styles.fitGrid}>
        <Field label="Months until first revenue">
          <input
            className={styles.num}
            type="number"
            min={0}
            step={1}
            value={b.monthsToRevenue}
            onChange={(e) => set("monthsToRevenue", Math.max(0, +e.target.value))}
            aria-label="Months until first revenue"
          />
          <span className={styles.unit}>months</span>
        </Field>
        <Pct label="Gross margin" v={b.grossMargin} set={(v) => set("grossMargin", v)} />
        <Field label="Capital before the first sale">
          <input
            className={styles.num}
            type="number"
            min={0}
            step={25}
            value={b.upfrontCapital}
            onChange={(e) => set("upfrontCapital", Math.max(0, +e.target.value))}
            aria-label="Capital before the first sale"
          />
          <span className={styles.unit}>k€</span>
        </Field>
        <Field label="Days until customers pay" hint="Negative means paid upfront">
          <input
            className={styles.num}
            type="number"
            step={15}
            value={b.paymentDays}
            onChange={(e) => set("paymentDays", +e.target.value)}
            aria-label="Days until customers pay"
          />
          <span className={styles.unit}>days</span>
        </Field>
        <Field label="Months founders last unpaid">
          <input
            className={styles.num}
            type="number"
            min={0}
            step={3}
            value={b.founderRunwayMonths}
            onChange={(e) => set("founderRunwayMonths", Math.max(0, +e.target.value))}
            aria-label="Months founders last unpaid"
          />
          <span className={styles.unit}>months</span>
        </Field>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={b.founderSells}
            onChange={(e) => set("founderSells", e.target.checked)}
          />
          <span>Founders can sell it themselves</span>
        </label>
      </div>

      <div className={styles.fitPickers}>
        <div>
          <div className={styles.groupTitle}>Speed of the market</div>
          <div className={styles.picker}>
            {MARKET_CLOCKS.map((m) => (
              <button
                key={m.key}
                type="button"
                aria-pressed={b.marketClock === m.key}
                className={`${styles.chip}${b.marketClock === m.key ? ` ${styles.chipOn}` : ""}`}
                onClick={() => set("marketClock", m.key)}
                title={m.note}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className={styles.groupTitle}>What it should become</div>
          <div className={styles.picker}>
            {AMBITIONS.map((a) => (
              <button
                key={a.key}
                type="button"
                aria-pressed={b.ambition === a.key}
                className={`${styles.chip}${b.ambition === a.key ? ` ${styles.chipOn}` : ""}`}
                onClick={() => set("ambition", a.key)}
                title={a.note}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button type="button" className={styles.fitToggle} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? "▾" : "▸"} All eight conditions, one by one
      </button>

      {open && (
        <div className={styles.fitList}>
          {fit.criteria.map((c) => (
            <div key={c.key} className={styles.fitRow}>
              <span
                className={`${styles.fitDot} ${
                  c.verdict === "yes" ? styles.dotYes : c.verdict === "maybe" ? styles.dotMaybe : styles.dotNo
                }`}
              />
              <div>
                <div className={styles.fitRowHead}>
                  {c.label}
                  <span className={styles.fitWeight}>{Math.round(c.weight * 100)} % weight</span>
                </div>
                <p className={styles.fitFinding}>{c.finding}</p>
                <p className={styles.fitReq}>{c.requirement}</p>
                <div className={styles.fitSrc}>
                  {c.sources.map((id) => (
                    <a
                      key={id}
                      href={SRC[id][1]}
                      target="_blank"
                      rel="noopener noreferrer"
                      dangerouslySetInnerHTML={{ __html: SRC[id][0] }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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
