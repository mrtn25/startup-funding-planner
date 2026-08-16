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
import styles from "./GoalPlanner.module.css";
import { fmtK, fmtPct } from "@/lib/inplicit/plan";
import {
  DEFAULT_GOAL,
  PRICING,
  computeGoal,
  customersPerMonthFor,
  ltvCacVerdict,
  unitEconomics,
  type GoalInputs,
  type PricingModel,
} from "@/lib/inplicit/goal";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const LAND = "#2200FF";
const EXPAND = "#a8cf12";
const CHANNEL = "#00B5AD";
const TARGET = "#d85a30";
const AXIS = "#8a8880";

export default function GoalPlanner() {
  const [g, setG] = useState<GoalInputs>(DEFAULT_GOAL);
  const set = <K extends keyof GoalInputs>(k: K, v: GoalInputs[K]) => setG((p) => ({ ...p, [k]: v }));

  const r = useMemo(() => computeGoal(g), [g]);
  const { unit, months, reach } = r;
  const verdict = ltvCacVerdict(unit.ltvCac);

  /* Die drei Ausbaustufen als aufeinander liegende Flächen: jede Schicht
     beginnt dort, wo die darunter aufhört, also ist der Abstand zwischen
     zwei Linien genau der Beitrag dieser Motion. */
  const sLand = months.map((m) => m.land);
  const sExpand = months.map((m) => m.land + m.expand);
  const sAll = months.map((m) => m.total);

  const datasets = [
    {
      label: "Land",
      data: sLand,
      borderColor: LAND,
      backgroundColor: "rgba(34,0,255,0.14)",
      borderWidth: 2,
      pointRadius: 0,
      fill: "origin" as const,
      tension: 0.25,
    },
    ...(g.expandOn
      ? [
          {
            label: "+ Expand",
            data: sExpand,
            borderColor: EXPAND,
            backgroundColor: "rgba(168,207,18,0.22)",
            borderWidth: 2,
            pointRadius: 0,
            fill: "-1" as const,
            tension: 0.25,
          },
        ]
      : []),
    ...(g.channelOn
      ? [
          {
            label: "+ Channel",
            data: sAll,
            borderColor: CHANNEL,
            backgroundColor: "rgba(0,181,173,0.20)",
            borderWidth: 2,
            pointRadius: 0,
            fill: "-1" as const,
            tension: 0.25,
          },
        ]
      : []),
    {
      label: `Ziel ${fmtK(g.targetARR)}`,
      data: months.map(() => g.targetARR),
      borderColor: TARGET,
      backgroundColor: "transparent",
      borderWidth: 1.5,
      borderDash: [6, 4],
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
  ];

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtK(ctx.parsed.y ?? 0)}` } },
    },
    scales: {
      x: { ticks: { font: { size: 10 }, color: AXIS, maxRotation: 0 }, grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: { font: { size: 10 }, color: AXIS, callback: (v) => fmtK(Number(v)) },
        grid: { color: "rgba(128,128,128,0.08)" },
      },
    },
  };

  const when = (idx: number | null) => (idx == null ? "nicht im Zeitraum" : months[idx].label);

  return (
    <section className={styles.root} aria-label="Ziel-Planer">
      <header className={styles.head}>
        <h2>Was bedeutet {fmtK(g.targetARR)} ARR?</h2>
        <p>
          Rückwärts gerechnet: wie viele Kunden das sind, was einer kosten darf und was er einbringt. Die Kette ist
          kurze Arithmetik und in beide Richtungen nachprüfbar — das Preismodell ist dabei der Hebel, den man am
          leichtesten unterschätzt.
        </p>
      </header>

      <div className={styles.layout}>
        {/* ── Links: ein Graph ── */}
        <div className={styles.chartCol}>
          <div className={styles.chartLegend}>
            <span>
              <i className={styles.swatch} style={{ background: LAND }} /> Land
            </span>
            {g.expandOn && (
              <span>
                <i className={styles.swatch} style={{ background: EXPAND }} /> + Expand
              </span>
            )}
            {g.channelOn && (
              <span>
                <i className={styles.swatch} style={{ background: CHANNEL }} /> + Channel
              </span>
            )}
            <span>
              <i className={styles.swatchLine} style={{ borderColor: TARGET }} /> Ziel
            </span>
          </div>

          <div className={styles.chartBox}>
            <Line data={{ labels: months.map((m) => m.label), datasets }} options={options} />
          </div>

          <div className={styles.reachRow}>
            <Reach label="Nur Land" value={when(reach.land)} color={LAND} />
            {g.expandOn && <Reach label="Mit Expand" value={when(reach.landExpand)} color={EXPAND} />}
            {g.channelOn && <Reach label="Mit Channel" value={when(reach.all)} color={CHANNEL} />}
          </div>
          <p className={styles.chartFoot}>
            Der Abstand zwischen zwei Linien ist der Beitrag dieser Motion. Land steigt linear mit der Akquise;
            Expand wächst auf dem Bestand, den Land schon bezahlt hat, und wird darum von allein steiler; Channel
            bringt je Abschluss gleich eine ganze Mandantenliste.
          </p>
        </div>

        {/* ── Rechts: Ziel und Runterbrechung ── */}
        <div className={styles.controlCol}>
          <div className={styles.groupTitle}>Ziel</div>
          <Num label="Ziel-ARR" v={g.targetARR} set={(v) => set("targetARR", v)} step={25} unit="k€" />
          <Num
            label="Zeitraum"
            v={g.horizonMonths}
            set={(v) => set("horizonMonths", clamp(v, 6, 72))}
            step={6}
            unit="Monate"
          />

          {/* Die eigentliche Runterbrechung */}
          <div className={styles.breakdown}>
            <div className={styles.bdMain}>
              <strong>{fmtCount(unit.customersNeeded)}</strong> Kunden
            </div>
            <div className={styles.bdSub}>
              bei {fmtK(unit.arpa)} Umsatz je Kunde und Jahr. Zu {fmtK(unit.cac)} Akquisekosten sind das{" "}
              <strong>{fmtK(unit.acquisitionBudget)}</strong> Vertriebsbudget, bis das Ziel steht.
            </div>
          </div>

          <div className={styles.groupTitle}>Preismodell</div>
          <div className={styles.pricingBtns} role="group" aria-label="Preismodell">
            {PRICING.map((p) => (
              <button
                key={p.key}
                type="button"
                aria-pressed={g.pricing === p.key}
                className={`${styles.pricingBtn}${g.pricing === p.key ? ` ${styles.pricingBtnOn}` : ""}`}
                onClick={() => set("pricing", p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className={styles.pricingNote}>{PRICING.find((p) => p.key === g.pricing)!.blurb}</p>

          {g.pricing === "perInterview" && (
            <Num
              label="Preis je Interview"
              v={g.pricePerInterview}
              set={(v) => set("pricePerInterview", v)}
              step={25}
              unit="€"
            />
          )}
          {g.pricing === "perCampaign" && (
            <Num
              label="Preis je Kampagne"
              v={g.pricePerCampaign}
              set={(v) => set("pricePerCampaign", v)}
              step={0.5}
              unit="k€"
            />
          )}
          {g.pricing === "subscription" && (
            <Num label="Jahreslizenz" v={g.subscriptionACV} set={(v) => set("subscriptionACV", v)} step={2} unit="k€" />
          )}
          <Num
            label="Kampagnen je Kunde"
            v={g.campaignsPerYear}
            set={(v) => set("campaignsPerYear", v)}
            step={0.5}
            unit="/ Jahr"
          />
          <Num
            label="Interviews je Kampagne"
            v={g.interviewsPerCampaign}
            set={(v) => set("interviewsPerCampaign", v)}
            step={1}
            unit="Stück"
          />

          {/* Vergleich der Modelle */}
          <div className={styles.compare}>
            <div className={styles.compareHead}>
              <span>Modell</span>
              <span>je Kunde</span>
              <span>Kunden</span>
              <span>Marge</span>
            </div>
            <div className={`${styles.compareRow} ${styles.compareRowOn}`}>
              <span>{PRICING.find((p) => p.key === g.pricing)!.label}</span>
              <span>{fmtK(unit.arpa)}</span>
              <span>{fmtCount(unit.customersNeeded)}</span>
              <span>{fmtPct(unit.grossMargin)}</span>
            </div>
            {r.alternatives.map((a) => (
              <button
                key={a.key}
                type="button"
                className={styles.compareRow}
                onClick={() => set("pricing", a.key)}
                title="Zu diesem Modell wechseln"
              >
                <span>{PRICING.find((p) => p.key === a.key)!.label}</span>
                <span>{fmtK(a.arpa)}</span>
                <span>{fmtCount(a.customersNeeded)}</span>
                <span>{fmtPct(a.grossMargin)}</span>
              </button>
            ))}
          </div>
          <p className={styles.compareNote}>
            Gleiche ARR, andere Firma: {fmtCount(unitEconomics(g, "perInterview").customersNeeded)} Kunden pro
            Interview abgerechnet gegen {fmtCount(unitEconomics(g, "subscription").customersNeeded)} als Lizenz. Das
            eine ist eine Vertriebsmaschine, das andere ein Enterprise-Sales-Team.
          </p>

          <div className={styles.groupTitle}>Akquise & Bindung</div>
          <Num
            label="Neukunden je Monat"
            v={g.newCustomersPerMonth}
            set={(v) => set("newCustomersPerMonth", v)}
            step={0.5}
            unit="/ Monat"
          />
          <Num
            label="Vertrieb & Marketing"
            v={g.salesSpendPerMonth}
            set={(v) => set("salesSpendPerMonth", v)}
            step={0.5}
            unit="k€ / Mon."
          />
          <Num
            label="Vollkosten je Interview"
            v={g.costPerInterview}
            set={(v) => set("costPerInterview", v)}
            step={5}
            unit="€"
          />
          <Pct label="Churn je Jahr" v={g.churnPerYear} set={(v) => set("churnPerYear", v)} max={0.8} />

          {/* Unit Economics */}
          <div className={styles.units}>
            <UnitCell label="CAC" value={fmtK(unit.cac)} />
            <UnitCell label="LTV" value={fmtK(unit.ltv)} />
            <UnitCell
              label="LTV : CAC"
              value={isFinite(unit.ltvCac) ? `${unit.ltvCac.toFixed(1)}×` : "–"}
              tone={verdict.tone}
            />
            <UnitCell
              label="Payback"
              value={isFinite(unit.paybackMonths) ? `${unit.paybackMonths.toFixed(1)} Mon.` : "nie"}
              tone={unit.paybackMonths > 18 ? "warn" : "ok"}
            />
          </div>
          <p className={`${styles.verdict} ${styles[verdict.tone]}`}>{verdict.text}</p>

          <div className={styles.groupTitle}>Motions dazuschalten</div>
          <Toggle
            on={g.expandOn}
            color={EXPAND}
            label="Expand"
            note="Mehr Umsatz aus Kunden, die du schon hast — die Akquise ist bezahlt, also hebt das die Steigung, nicht nur das Niveau."
            onChange={(v) => set("expandOn", v)}
          />
          {g.expandOn && (
            <Pct
              label="Bestandswachstum"
              v={g.expandPerYear}
              set={(v) => set("expandPerYear", v)}
              max={1}
              unit="/ Jahr"
            />
          )}
          <Toggle
            on={g.channelOn}
            color={CHANNEL}
            label="Channel"
            note="Ein Abschluss, eine ganze Mandantenliste. Du verkaufst an einen Partner und erreichst dessen Kunden, ohne sie einzeln zu gewinnen."
            onChange={(v) => set("channelOn", v)}
          />
          {g.channelOn && (
            <>
              <Num
                label="Partner je Jahr"
                v={g.partnersPerYear}
                set={(v) => set("partnersPerYear", v)}
                step={1}
                unit="/ Jahr"
              />
              <Num
                label="Endkunden je Partner"
                v={g.endCustomersPerPartner}
                set={(v) => set("endCustomersPerPartner", v)}
                step={1}
                unit="Kunden"
              />
              <Pct label="Unser Anteil" v={g.partnerShare} set={(v) => set("partnerShare", v)} />
              <Num
                label="Hochlaufzeit"
                v={g.partnerRampMonths}
                set={(v) => set("partnerRampMonths", clamp(v, 1, 24))}
                step={1}
                unit="Monate"
              />
            </>
          )}

          <div className={styles.groupTitle}>Was müsste passieren?</div>
          <AskBox g={g} />
        </div>
      </div>
    </section>
  );
}

/* ── Umkehrfrage ── */

function AskBox({ g }: { g: GoalInputs }) {
  const [byMonth, setByMonth] = useState(11);
  const needed = useMemo(() => customersPerMonthFor(g, byMonth), [g, byMonth]);
  const r = useMemo(() => computeGoal(g), [g]);

  return (
    <div className={styles.askBox}>
      <Num
        label="Ziel erreicht bis Monat"
        v={byMonth + 1}
        set={(v) => setByMonth(clamp(Math.round(v) - 1, 0, g.horizonMonths - 1))}
        step={1}
        unit={r.months[byMonth]?.label ?? ""}
      />
      <p className={styles.askAnswer}>
        {needed == null ? (
          <>
            Bis dahin ist {fmtK(g.targetARR)} auch mit sehr viel Vertrieb nicht zu schaffen — der Engpass ist nicht
            die Akquiserate, sondern das Preismodell oder der Zeitraum.
          </>
        ) : needed <= g.newCustomersPerMonth ? (
          <>
            Dafür reichen <strong>{needed.toFixed(1)} Neukunden im Monat</strong>. Mit den geplanten{" "}
            {g.newCustomersPerMonth.toFixed(1)} liegst du bereits darüber.
          </>
        ) : (
          <>
            Dafür bräuchte es <strong>{needed.toFixed(1)} Neukunden im Monat</strong> statt der geplanten{" "}
            {g.newCustomersPerMonth.toFixed(1)} — bei {fmtK(unitEconomics(g).cac)} CAC also{" "}
            {fmtK(needed * unitEconomics(g).cac)} Vertriebsbudget im Monat.
          </>
        )}
      </p>
    </div>
  );
}

/* ── Bausteine ── */

function Reach({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={styles.reach}>
      <span className={styles.reachLabel}>
        <i className={styles.swatch} style={{ background: color }} />
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

function UnitCell({ label, value, tone }: { label: string; value: string; tone?: "bad" | "warn" | "ok" }) {
  return (
    <div className={styles.unitCell}>
      <div className={styles.unitLabel}>{label}</div>
      <div className={`${styles.unitValue} ${tone ? styles[tone] : ""}`}>{value}</div>
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
  v,
  set,
  max = 1,
  unit = "",
}: {
  label: string;
  v: number;
  set: (v: number) => void;
  max?: number;
  unit?: string;
}) {
  return (
    <Field label={label}>
      <input
        className={styles.range}
        type="range"
        min={0}
        max={max}
        step={0.01}
        value={v}
        onChange={(e) => set(+e.target.value)}
        aria-label={label}
      />
      <span className={styles.pctVal}>
        {fmtPct(v)} {unit}
      </span>
    </Field>
  );
}

function Toggle({
  on,
  label,
  note,
  color,
  onChange,
}: {
  on: boolean;
  label: string;
  note: string;
  color: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className={styles.motion}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        className={`${styles.motionBtn}${on ? ` ${styles.motionBtnOn}` : ""}`}
        style={on ? { background: color, borderColor: color } : undefined}
        onClick={() => onChange(!on)}
      >
        <span className={styles.knob} />
        {label}
      </button>
      <p className={styles.motionNote}>{note}</p>
    </div>
  );
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Kundenzahlen sind ganze Menschen — unter zehn mit einer Nachkommastelle,
    damit „2,5 Kunden" nicht als „2" gelesen wird. */
function fmtCount(n: number): string {
  if (!isFinite(n)) return "–";
  return n < 10 ? n.toFixed(1).replace(".", ",") : String(Math.ceil(n));
}
