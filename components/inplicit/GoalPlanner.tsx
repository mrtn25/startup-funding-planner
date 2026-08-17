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
  callLoad,
  computeGoal,
  growthForTarget,
  newCustomersAt,
  routesToTarget,
  ltvCacVerdict,
  startForTarget,
  unitEconomics,
  type GoalInputs,
  type GoalMonth,
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
      stepped: true as const,
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
            stepped: true as const,
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
            stepped: true as const,
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
            Der Abstand zwischen zwei Linien ist der Beitrag dieser Motion. Jede Stufe ist ein Monat: Land steigt in
            Sprüngen, weil Kunden einzeln dazukommen — im letzten Monat {fmtNum(months[months.length - 1].newCustomers)}{" "}
            statt {fmtNum(g.startNewCustomers)} am Anfang. Expand wächst auf dem Bestand, den Land schon bezahlt hat,
            ohne einen einzigen Neukunden; Channel bringt je Abschluss eine ganze Mandantenliste.
          </p>

          <AcquisitionTable g={g} months={months} onSet={setG} />
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

          {/* Die eigentliche Runterbrechung. Gerechnet auf dem Verlauf, nicht
              nur auf dem Grundpreis — sonst bliebe die Zahl stehen, während
              Lizenzpreis, Kundengrößen und Motions den Graphen daneben
              längst verschoben haben. */}
          <div className={styles.breakdown}>
            <div className={styles.bdMain}>
              <strong>{fmtCount(r.customersAtGoal)}</strong> Kunden
            </div>
            <div className={styles.bdSub}>
              wenn das Ziel steht, bei {fmtK(unit.arpa)} Grundumsatz je Kunde und Jahr. Zu {fmtK(unit.cac)}{" "}
              Akquisekosten sind das <strong>{fmtK(r.customersAtGoal * unit.cac)}</strong> Vertriebsbudget.
              {g.expandOn && r.contribution.expand > 0 && (
                <>
                  {" "}
                  Ohne Upgrades wären es {fmtCount(unit.customersNeeded)} — Expand nimmt{" "}
                  {fmtCount(Math.max(0, unit.customersNeeded - r.customersAtGoal))} Kunden ab.
                </>
              )}
            </div>
          </div>

          <GoalSeek g={g} onApply={setG} />

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
          {/* Die Lizenz steht immer da, nicht nur wenn danach abgerechnet wird:
              sie ist auch das Ziel jedes Upgrades und wirkt darum immer auf
              den Plan. Ein Feld, das folgenlos aussieht, ist schlimmer als
              eines, das man erklären muss. */}
          <Num
            label="Jahreslizenz"
            hint={
              g.pricing === "subscription"
                ? undefined
                : g.expandOn
                  ? "Ziel jedes Upgrades — wirkt auch bei dieser Abrechnung"
                  : "Ziel jedes Upgrades, sobald Expand an ist"
            }
            v={g.subscriptionACV}
            set={(v) => set("subscriptionACV", v)}
            step={2}
            unit="k€"
          />
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

          {/* Kundengrößen: ohne sie rechnet alles mit einem Durchschnittskunden,
              den es nicht gibt. */}
          <div className={styles.groupTitle}>Kundengrößen</div>
          <Pct
            label="Anteil große Kunden"
            v={g.enterpriseShare}
            set={(v) => set("enterpriseShare", v)}
            max={1}
          />
          <Num
            label="Große zahlen das"
            v={g.enterpriseMultiple}
            set={(v) => set("enterpriseMultiple", Math.max(1, v))}
            step={0.25}
            unit="× fache"
          />
          <p className={styles.motionNote}>
            Kleiner Kunde <strong>{fmtK(unit.arpaSmall)}</strong>, großer <strong>{fmtK(unit.arpaLarge)}</strong> im
            Jahr — im Schnitt {fmtK(unit.arpa)}. Genau dieser Schnitt entscheidet, wie viele Kunden das Ziel braucht.
          </p>

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
            label="Neukunden im ersten Monat"
            v={g.startNewCustomers}
            set={(v) => set("startNewCustomers", v)}
            step={0.5}
            unit="Kunden"
          />
          {/* Zahlenfeld, kein Regler: die Ziel-Rechnung kann hier dreistellige
              Prozentsätze eintragen, und ein Regler würde sie stillschweigend
              auf sein Maximum kappen. */}
          <PctNum
            label="Wachstum der Neukundenrate"
            hint={`Aus ${fmtNum(g.startNewCustomers)} werden bis ${months[months.length - 1].label} ${fmtNum(
              months[months.length - 1].newCustomers,
            )} Neukunden im Monat`}
            v={g.acquisitionGrowth}
            set={(v) => set("acquisitionGrowth", v)}
            unit="% / Monat"
          />
          <Num label="CAC" hint="Was ein Neukunde kosten darf" v={g.cac} set={(v) => set("cac", v)} step={0.5} unit="k€" />

          {/* Von Kunden auf Termine — die Einheit, in der man merkt,
              ob ein Plan an der Wirklichkeit vorbeigeht. */}
          <div className={styles.groupTitle}>Was das an Terminen heißt</div>
          <Pct
            label="Conversion Erstgespräch → Kunde"
            v={g.conversionRate}
            set={(v) => set("conversionRate", Math.max(0.01, v))}
            max={0.6}
            step={0.01}
          />
          <Num
            label="Calls bis zum Abschluss"
            hint="Inklusive Erstgespräch"
            v={g.callsToClose}
            set={(v) => set("callsToClose", Math.max(1, v))}
            step={1}
            unit="Calls"
          />
          <Num
            label="Länge eines Calls"
            v={g.callMinutes}
            set={(v) => set("callMinutes", v)}
            step={15}
            unit="Minuten"
          />
          <CallLoad g={g} months={months} />
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
            <>
              <Pct
                label="Anteil, den wir hochstufen"
                hint="Wie viel des Bestands im Jahr auf ein größeres Paket wechselt"
                v={g.upgradeSharePerYear}
                set={(v) => set("upgradeSharePerYear", v)}
                max={1}
                unit="/ Jahr"
              />
              <Num
                label="Hochstufbar nach"
                hint="So lange braucht ein Pilot, um zu überzeugen"
                v={g.upgradeLagMonths}
                set={(v) => set("upgradeLagMonths", clamp(v, 0, 24))}
                step={1}
                unit="Monaten"
              />
              <p className={styles.motionNote}>
                Ein Upgrade führt auf die <strong>Jahreslizenz</strong>: {fmtK(unit.arpa)} → {fmtK(unit.upgradedArpa)}{" "}
                im Jahr, also <strong>{fmtK(unit.upgradedArpa - unit.arpa)}</strong> mehr je Kunde. Deshalb wirkt der
                Lizenzpreis auf den Plan, auch wenn nach Kampagne abgerechnet wird.
                {unit.upgradedArpa <= unit.arpa && (
                  <> Aktuell liegt die Lizenz nicht über dem laufenden Umsatz — ein Upgrade brächte nichts.</>
                )}
              </p>
              <p className={styles.motionNote}>
                Am Ende des Zeitraums sind das <strong>{fmtNum(months[months.length - 1].upgraded)}</strong> von{" "}
                {fmtNum(months[months.length - 1].customers)} Kunden — kein einziger davon neu gewonnen.
              </p>
            </>
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

        </div>
      </div>
    </section>
  );
}

/* ── Neukunden je Monat, von Hand ──────────────────────────────
   Die Formel schreibt fort, was du nicht besser weißt. Wo du es besser
   weißt — ein Abschluss, der feststeht, ein Monat im Sommerloch —,
   trägst du die Zahl ein und die Formel hält sich da heraus. */

function AcquisitionTable({
  g,
  months,
  onSet,
}: {
  g: GoalInputs;
  months: GoalMonth[];
  onSet: (next: GoalInputs) => void;
}) {
  const [open, setOpen] = useState(false);
  const overrides = Object.keys(g.newCustomerOverrides).length;

  const setMonth = (m: number, raw: string) => {
    const next = { ...g.newCustomerOverrides };
    if (raw.trim() === "") delete next[m];
    else next[m] = Math.max(0, Number(raw));
    onSet({ ...g, newCustomerOverrides: next });
  };

  return (
    <div className={styles.acq}>
      <div className={styles.acqHead}>
        <button type="button" className={styles.acqToggle} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? "▾" : "▸"} Neukunden je Monat
        </button>
        <span className={styles.acqNote}>
          {overrides > 0 ? (
            <>
              {overrides} Monat{overrides === 1 ? "" : "e"} von Hand gesetzt
              <button type="button" className={styles.acqReset} onClick={() => onSet({ ...g, newCustomerOverrides: {} })}>
                zurücksetzen
              </button>
            </>
          ) : (
            "alle aus der Wachstumsrate fortgeschrieben"
          )}
        </span>
      </div>

      {open && (
        <div className={styles.acqScroll}>
          <table className={styles.acqTable}>
            <thead>
              <tr>
                <th>Monat</th>
                <th>Neu</th>
                <th>Kunden</th>
                <th>Calls / Wo.</th>
                <th>Std. / Wo.</th>
                <th>ARR</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.key} className={m.overridden ? styles.acqRowSet : undefined}>
                  <td className={styles.acqMonth}>{m.label}</td>
                  <td>
                    <input
                      className={styles.acqInput}
                      type="number"
                      min={0}
                      step={0.5}
                      value={g.newCustomerOverrides[m.index] ?? ""}
                      placeholder={fmtNum(newCustomersAt({ ...g, newCustomerOverrides: {} }, m.index))}
                      onChange={(e) => setMonth(m.index, e.target.value)}
                      aria-label={`Neukunden ${m.label}`}
                    />
                  </td>
                  <td>{fmtNum(m.customers)}</td>
                  <td>{fmtNum(m.callsPerWeek)}</td>
                  <td>{fmtNum(m.hoursPerWeek)}</td>
                  <td>{fmtK(m.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Was das an Terminen heißt ─────────────────────────────── */

function CallLoad({ g, months }: { g: GoalInputs; months: GoalMonth[] }) {
  const last = months[months.length - 1];
  const first = months[0];
  // Grob die Hälfte einer Arbeitswoche in Gesprächen ist die Grenze, ab der
  // neben dem Verkaufen niemand mehr liefert.
  const heavy = last.hoursPerWeek > 20;

  return (
    <div className={`${styles.calls} ${heavy ? styles.callsWarn : ""}`}>
      <div className={styles.callsRow}>
        <span>Erstgespräche</span>
        <strong>
          {fmtNum(first.firstCalls / (52 / 12))} → {fmtNum(last.firstCalls / (52 / 12))} / Woche
        </strong>
      </div>
      <div className={styles.callsRow}>
        <span>Alle Calls</span>
        <strong>
          {fmtNum(first.callsPerWeek)} → {fmtNum(last.callsPerWeek)} / Woche
        </strong>
      </div>
      <div className={styles.callsRow}>
        <span>Zeit am Telefon</span>
        <strong>
          {fmtNum(first.hoursPerWeek)} → {fmtNum(last.hoursPerWeek)} Std. / Woche
        </strong>
      </div>
      <p className={styles.callsNote}>
        {heavy ? (
          <>
            Über 20 Stunden Gespräche pro Woche im letzten Monat — daneben liefert niemand mehr. Entweder braucht es
            jemanden im Vertrieb, eine bessere Conversion oder ein größeres Ticket je Kunde.
          </>
        ) : (
          <>
            Bei {fmtPct(g.conversionRate)} Conversion braucht ein Abschluss {fmtNum(1 / g.conversionRate)}{" "}
            Erstgespräche und {g.callsToClose} Calls insgesamt.
          </>
        )}
      </p>
    </div>
  );
}

/* ── Auf das Ziel rechnen ──────────────────────────────────────
   Der eigentliche Zweck des Tools: nicht melden, dass ein Ziel verfehlt
   wird, sondern ausrechnen, welche Steigung es bräuchte — und was diese
   Steigung konkret bedeutet, damit man sie beurteilen kann. */

function GoalSeek({ g, onApply }: { g: GoalInputs; onApply: (next: GoalInputs) => void }) {
  const r = useMemo(() => computeGoal(g), [g]);
  const needed = useMemo(() => growthForTarget(g), [g]);
  const bigStart = useMemo(() => startForTarget(g), [g]);

  const hit = r.reach.all;
  const lastLabel = r.months[r.months.length - 1].label;

  /* Die Wege stehen in beiden Fällen. Wird das Ziel verfehlt, sagen sie, was
     es bräuchte; wird es erreicht, sagen sie, wie viel Luft jeder Weg lässt —
     und dass es billiger ginge, wenn eine Motion mitträgt. */
  if (hit != null) {
    return (
      <div className={`${styles.seek} ${styles.seekOk}`}>
        <div className={styles.seekMain}>
          Ziel steht in <strong>{r.months[hit].label}</strong>
          <span className={styles.seekShare}>{Math.round(r.targetShare * 100)} % am Ende</span>
        </div>
        <p className={styles.seekNote}>
          Am Ende des Zeitraums sind es {fmtK(r.endARR)}. So viel Akquise-Wachstum bräuchte jeder Weg, um genau auf
          das Ziel zu kommen — alles darüber ist Puffer.
        </p>
        <Routes g={g} onApply={onApply} />
      </div>
    );
  }

  const solved = needed == null ? null : computeGoal({ ...g, acquisitionGrowth: needed });
  const endRate = solved?.months[solved.months.length - 1].newCustomers ?? 0;
  const endSpend = solved?.months[solved.months.length - 1].salesSpend ?? 0;

  return (
    <div className={`${styles.seek} ${styles.seekWarn}`}>
      <div className={styles.seekMain}>
        Reicht nicht: <strong>{fmtK(r.endARR)}</strong> bis {lastLabel}
        <span className={styles.seekShare}>{Math.round(r.targetShare * 100)} % des Ziels</span>
      </div>

      {needed == null ? (
        <p className={styles.seekNote}>
          Auch mit beliebig viel Vertrieb ist {fmtK(g.targetARR)} bis {lastLabel} nicht zu erreichen. Der Engpass ist
          nicht die Akquise, sondern der Preis je Kunde oder der Zeitraum.
        </p>
      ) : (
        <>
          <p className={styles.seekNote}>
            Über Neukunden allein bräuchte es <strong>{fmtPct(needed, 1)} Wachstum im Monat</strong> statt{" "}
            {fmtPct(g.acquisitionGrowth, 1)} — von {fmtNum(g.startNewCustomers)} auf{" "}
            <strong>{fmtNum(endRate)} Neukunden im Monat</strong>, bei {fmtK(endSpend)} Vertriebsbudget monatlich.
            {bigStart != null && (
              <>
                {" "}
                Alternativ gleich mit <strong>{fmtNum(bigStart)}</strong> Neukunden im ersten Monat starten.
              </>
            )}
          </p>

          {/* Alle drei Motions, nicht nur die Akquise: der Abstand zwischen
              den Zeilen ist, was eine Motion an Vertriebsdruck abnimmt. */}
          <Routes g={g} onApply={onApply} />

          {bigStart != null && (
            <div className={styles.seekBtns}>
              <button
                type="button"
                className={styles.seekBtnGhost}
                onClick={() => onApply({ ...g, startNewCustomers: bigStart })}
              >
                stattdessen mit {fmtNum(bigStart)} Kunden starten
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Wege zum Ziel ─────────────────────────────────────────────
   Ein Ziel hat nie nur einen Weg, und in aller Regel ist es eine
   Mischung. Jede Zeile rechnet mit deinen eigenen Expand- und
   Channel-Zahlen aus, wie stark die Akquise dann noch wachsen müsste —
   und was das an Terminen pro Woche bedeutet, damit sich die Zeilen
   nicht nur rechnerisch, sondern auch praktisch vergleichen lassen. */

function Routes({ g, onApply }: { g: GoalInputs; onApply: (next: GoalInputs) => void }) {
  const routes = useMemo(() => routesToTarget(g), [g]);

  /* Wenn alle drei Wege fast dieselbe Steigung verlangen, liegt das nicht an
     schwachen Motions, sondern daran, dass der Zeitraum ihnen keine Zeit
     lässt — und das ist die nützlichere Auskunft. */
  const land = routes[0].growth;
  const all = routes[2].growth;
  const flat = land != null && all != null && land > 0 && (land - all) / land < 0.1;

  return (
    <div className={styles.routes}>
      <p className={styles.routesLead}>
        Jede Zeile ist derselbe Zielwert, nur anders erreicht. Rechts steht, was der Vertrieb dafür leisten muss:
        wie viele Neukunden im letzten Monat — und wie viele Gespräche pro Woche das bedeutet.
      </p>
      <div className={styles.routesHead}>
        <span>Weg</span>
        <span>Wachstum</span>
        <span>Neukunden / Mon.</span>
        <span>Calls / Woche</span>
        <span />
      </div>
      {routes.map((route) => (
        <div key={route.key} className={styles.routeRow}>
          <span className={styles.routeLabel}>{route.label}</span>
          <span className={styles.routeNum}>{route.growth == null ? "reicht nicht" : fmtPct(route.growth, 1)}</span>
          <span className={styles.routeNum}>{route.growth == null ? "—" : fmtNum(route.endRate)}</span>
          <span className={styles.routeNum}>{route.growth == null ? "—" : fmtNum(route.callsPerWeek)}</span>
          <span>
            {route.growth != null && (
              <button type="button" className={styles.routeBtn} onClick={() => onApply({ ...g, ...route.apply })}>
                anwenden
              </button>
            )}
          </span>
        </div>
      ))}
      <p className={styles.routesNote}>
        {flat ? (
          <>
            Auf {g.horizonMonths} Monate nehmen Expand und Channel kaum Druck ab — beide brauchen Bestand
            beziehungsweise Partner, die erst entstehen müssen. Auf diese Frist trägt nur die Akquise. Verläng den
            Zeitraum, und der Abstand zwischen den Zeilen wird groß.
          </>
        ) : (
          <>
            Gerechnet mit deinen eigenen Expand- und Channel-Werten, nicht mit Musterzahlen. Was die Motions
            abnehmen, muss der Vertrieb nicht aufbringen.
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

/** Prozent als Zahlenfeld — für Werte ohne sinnvolle Obergrenze. */
function PctNum({
  label,
  hint,
  v,
  set,
  unit,
}: {
  label: string;
  hint?: string;
  v: number;
  set: (v: number) => void;
  unit: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        className={styles.num}
        type="number"
        min={0}
        step={0.5}
        value={Math.round(v * 1000) / 10}
        onChange={(e) => set(Math.max(0, +e.target.value) / 100)}
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
  unit = "",
}: {
  label: string;
  hint?: string;
  v: number;
  set: (v: number) => void;
  max?: number;
  step?: number;
  unit?: string;
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
      <span className={styles.pctVal}>
        {fmtPct(v, v < 0.1 ? 1 : 0)} {unit}
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

/** Wie fmtCount, aber ohne Aufrunden — für Bestände, die im Fluss sind. */
function fmtNum(n: number): string {
  if (!isFinite(n)) return "–";
  return (n < 10 ? n.toFixed(1) : String(Math.round(n))).replace(".", ",");
}
