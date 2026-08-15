"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CustomerTable from "./CustomerTable";
import PlanCharts, { MOTION } from "./PlanCharts";
import SensitivityFan from "./SensitivityFan";
import styles from "./RevenuePlanner.module.css";
import {
  computePlan,
  conversionForTargetARR,
  fmtK,
  fmtPct,
  horizon as buildHorizon,
  type Customer,
  type PlanInputs,
} from "@/lib/inplicit/plan";
import {
  DEFAULT_STATE,
  URL_PARAM,
  decodeState,
  deleteScenario,
  encodeState,
  loadScenarios,
  saveScenario,
  type PlanState,
  type ScenarioMap,
} from "@/lib/inplicit/share";

export default function RevenuePlanner() {
  const [inputs, setInputs] = useState<PlanInputs>(DEFAULT_STATE.inputs);
  const [customers, setCustomers] = useState<Customer[]>(DEFAULT_STATE.customers);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioMap>({});
  const [compare, setCompare] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [targetARR, setTargetARR] = useState(1000);
  const chartsRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof PlanInputs>(k: K, v: PlanInputs[K]) => setInputs((p) => ({ ...p, [k]: v }));

  /* A plan handed over in the URL wins over the named roster. Read after
     mount so the server render stays deterministic. */
  useEffect(() => {
    setScenarios(loadScenarios());
    const token = new URLSearchParams(window.location.search).get(URL_PARAM);
    if (!token) return;
    let cancelled = false;
    decodeState(token).then((st) => {
      if (cancelled || !st) return;
      setInputs(st.inputs);
      setCustomers(st.customers);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const plan = useMemo(() => computePlan(inputs, customers), [inputs, customers]);
  const hz = useMemo(() => buildHorizon(inputs), [inputs.startMonth, inputs.months]); // eslint-disable-line react-hooks/exhaustive-deps
  const { months, summary } = plan;

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  /* ── Save, share, export ── */

  const shareLink = async () => {
    const token = await encodeState({ inputs, customers });
    const url = new URL(window.location.href);
    url.searchParams.set(URL_PARAM, token);
    window.history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url.toString());
      flash("Link kopiert.");
    } catch {
      flash("Link steht in der Adresszeile.");
    }
  };

  const store = () => {
    const name = window.prompt("Szenario speichern als:", "Base");
    if (!name) return;
    setScenarios(saveScenario(name.trim(), { inputs, customers }));
    flash(`„${name.trim()}" gespeichert.`);
  };

  const restore = (name: string) => {
    const st: PlanState | undefined = scenarios[name];
    if (!st) return;
    setInputs(st.inputs);
    setCustomers(st.customers);
    flash(`„${name}" geladen.`);
  };

  const drop = (name: string) => {
    if (!window.confirm(`Szenario „${name}" löschen?`)) return;
    setScenarios(deleteScenario(name));
    setCompare((c) => c.filter((n) => n !== name));
  };

  const reset = () => {
    if (!window.confirm("Alle Eingaben und die Kundenliste auf die Ausgangswerte zurücksetzen?")) return;
    setInputs(DEFAULT_STATE.inputs);
    setCustomers(DEFAULT_STATE.customers);
    const url = new URL(window.location.href);
    url.searchParams.delete(URL_PARAM);
    window.history.replaceState(null, "", url);
    flash("Zurückgesetzt.");
  };

  const exportCSV = () => {
    const head = [
      "Monat", "Phase", "Demo-Calls", "Neue Pilotkunden", "davon namentlich", "Pilotkunden kumuliert",
      "Neue Abo-Kunden", "Abo-Kunden kumuliert", "Partner aktiv", "Team",
      "Umsatz Pilot", "Umsatz Abo", "Umsatz Channel", "Umsatz gesamt", "Kosten", "Ergebnis", "Cash",
    ];
    const rows = months.map((m) => [
      m.key, m.phase === "bootstrap" ? "Bootstrap" : "Finanziert",
      r1(m.demos), m.newPilots, m.newPilotsNamed, m.pilotsTotal, m.newSubs, m.subsTotal, m.partnersActive, m.employees,
      r1(m.revPilot), r1(m.revSub), r1(m.revChannel), r1(m.revenue), r1(m.cost), r1(m.result), r1(m.cash),
    ]);
    // Semicolons and commas: German Excel opens this without an import dialog.
    const csv = [head, ...rows].map((r) => r.join(";")).join("\n").replace(/\./g, ",");
    download(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }), "inplicit-plan.csv");
    flash("CSV exportiert.");
  };

  const exportPNG = async () => {
    const canvases = Array.from(chartsRef.current?.querySelectorAll("canvas") ?? []);
    if (!canvases.length) return;
    const pad = 24;
    const width = Math.max(...canvases.map((c) => c.width)) + pad * 2;
    const height = canvases.reduce((a, c) => a + c.height + pad, pad);
    const out = document.createElement("canvas");
    out.width = width;
    out.height = height;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    let y = pad;
    for (const c of canvases) {
      ctx.drawImage(c, pad, y);
      y += c.height + pad;
    }
    const blob = await new Promise<Blob | null>((res) => out.toBlob(res, "image/png"));
    if (blob) download(blob, "inplicit-plan.png");
    flash("PNG exportiert.");
  };

  /* ── The reverse question ── */
  const neededConversion = useMemo(
    () => conversionForTargetARR(inputs, customers, targetARR),
    [inputs, customers, targetARR],
  );

  const coverageLow = summary.namedCoverage < 1;

  return (
    <section className={styles.root} aria-label="inplicit Revenue Planner">
      <header className={styles.head}>
        <div className={styles.headTop}>
          <div>
            <div className={styles.eyebrow}>inplicit</div>
            <h1>Revenue Planner</h1>
          </div>
        </div>
        <p>
          Ein Monatsplan über drei Umsatzquellen, die sich gegenseitig verstärken: der bezahlte Pilot als Einstieg
          (<strong>Land</strong>), das Jahres-Abo, das daraus wird (<strong>Expand</strong>), und Channel-Partner, die
          die Plattform für ihre eigenen Mandate lizenzieren und Referrals zurückspielen (<strong>Multiplier</strong>).
          Zwei Deckel halten das ehrlich: die Lieferkapazität und der Phasenwechsel bei der Finanzierung.
        </p>
      </header>

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <select
          className={styles.custSelect}
          value=""
          onChange={(e) => e.target.value && restore(e.target.value)}
          aria-label="Szenario laden"
        >
          <option value="">Szenario laden …</option>
          {Object.keys(scenarios).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <button type="button" className={styles.ghostBtn} onClick={store}>
          Speichern
        </button>
        <button type="button" className={styles.ghostBtn} onClick={shareLink}>
          Link kopieren
        </button>
        <button type="button" className={styles.ghostBtn} onClick={exportCSV}>
          CSV
        </button>
        <button type="button" className={styles.ghostBtn} onClick={exportPNG}>
          PNG
        </button>
        <button type="button" className={`${styles.ghostBtn} ${styles.dangerBtn}`} onClick={reset}>
          Zurücksetzen
        </button>
        {toast && <span className={styles.toast}>{toast}</span>}
      </div>

      {/* ── Headline numbers ── */}
      <div className={styles.kpis}>
        <Kpi label="ARR am Ende" value={fmtK(summary.arr)} sub="wiederkehrend, annualisiert" />
        <Kpi label="Run-Rate" value={fmtK(summary.runRate)} sub="letzter Monat × 12, inkl. Piloten" />
        <Kpi label="Kunden gesamt" value={String(summary.customersTotal)} sub="Piloten kumuliert" />
        <Kpi label="davon Abo" value={String(summary.subsTotal)} sub={inputs.expandActive ? "Jahres-Abos" : "Expand aus"} />
        <Kpi
          label="Channel-Partner"
          value={String(summary.partners)}
          sub={inputs.channelActive ? "aktiv am Ende" : "Channel aus"}
        />
        <Kpi label="Bruttomarge" value={fmtPct(summary.grossMargin)} sub="nach Interview-Vollkosten" />
        <Kpi
          label="Cash am Ende"
          value={fmtK(summary.endCash)}
          sub={summary.cashOutMonth != null ? `leer ab ${months[summary.cashOutMonth].label}` : "durchgehend positiv"}
          tone={summary.endCash < 0 ? "bad" : "ok"}
        />
        <Kpi
          label="Break-even"
          value={summary.breakEvenMonth != null ? months[summary.breakEvenMonth].label : "—"}
          sub={summary.breakEvenMonth != null ? "ab hier dauerhaft positiv" : "nicht im Zeitraum"}
          tone={summary.breakEvenMonth != null ? "ok" : undefined}
        />
      </div>

      {/* ── Leverage: what the motions do to the slope ── */}
      <div className={styles.secLabel}>Hebel</div>
      <p className={styles.secNote}>
        Eine Growth-Motion ist keine weitere Umsatzzeile, sondern ein anderes Verhältnis von Aufwand zu Umsatz. Nur
        Piloten kosten einen Lieferplatz — der Abo-Bestand und die Kampagnen, die Partner für ihre eigenen Mandanten
        fahren, kosten keinen. Genau daran hängt, ob die Kurve steiler wird oder nur länger.
      </p>
      <div className={styles.levRow}>
        <div className={styles.levCard}>
          <div className={styles.levLabel}>Umsatz je Kopf und Monat</div>
          <div className={styles.levValue}>
            {fmtK(summary.leverageStart)} → {fmtK(summary.leverageEnd)}
          </div>
          <p className={styles.levSub}>
            {summary.leverageStart > 0 && summary.leverageEnd / summary.leverageStart >= 1.15 ? (
              <>
                <strong>{(summary.leverageEnd / summary.leverageStart).toFixed(1)}×</strong> so viel Umsatz je Person
                wie am Anfang. Diese Lücke ist das ganze Argument für Expand und Channel.
              </>
            ) : (
              <>
                Kaum bewegt. Jeder zusätzliche Euro kostet gerade noch eine zusätzliche Person — das ist ein
                Dienstleistungsgeschäft, egal wie das Produkt aussieht.
              </>
            )}
          </p>
        </div>

        <div className={styles.levCard}>
          <div className={styles.levLabel}>Umsatz ohne Lieferplatz</div>
          <div className={styles.levValue}>{fmtPct(summary.capacityFreeShare)}</div>
          <p className={styles.levSub}>
            Anteil des letzten Monats, der keinen Kampagnen-Slot verbraucht hat — Abo-Bestand plus Channel. Der Teil,
            der weiterläuft, ohne dass jemand liefert.
          </p>
        </div>

        <div className={styles.levCard}>
          <div className={styles.levLabel}>Kampagnen über Partner</div>
          <div className={styles.levValue}>
            {summary.ownCampaignsTotal > 0
              ? `${((summary.ownCampaignsTotal + summary.partnerCampaignsTotal) / summary.ownCampaignsTotal).toFixed(1)}×`
              : "–"}
          </div>
          <p className={styles.levSub}>
            {Math.round(summary.partnerCampaignsTotal)} Kampagnen laufen bei Partnern, {summary.ownCampaignsTotal} bei
            euch. Ihr verkauft an einen und erreicht dessen ganze Mandantenliste — dafür habt ihr nie einzeln
            verkauft.
          </p>
        </div>
      </div>

      {/* ── Motions ── */}
      <div className={styles.motionRow}>
        <Toggle
          on={inputs.expandActive}
          color={MOTION.expand}
          label="Expand-Motion aktiv"
          note="Aus: nur das Pilotgeschäft. Kein Abo-Umsatz, keine Expansion."
          onChange={(v) => set("expandActive", v)}
        />
        <Toggle
          on={inputs.channelActive}
          color={MOTION.multiplier}
          label="Channel-Multiplier aktiv"
          note="Aus: keine Lizenz-, keine Wholesale-Umsätze — und keine Referral-Demos."
          onChange={(v) => set("channelActive", v)}
        />
      </div>

      {/* ── Inputs ── */}
      <div className={styles.secLabel}>Annahmen</div>
      <p className={styles.secNote}>
        Die Ausgangswerte sind Platzhalter, keine Benchmarks — plausible Zahlen, damit die Mechanik sichtbar wird.
        Überschreib sie mit dem, was du wirklich weißt. Der Plan hängt vor allem an den beiden Conversion-Raten und an
        der Lieferkapazität; alles andere verschiebt das Ergebnis deutlich weniger.
      </p>
      <div className={styles.groups}>
        <Group title="Zeitraum & Phase">
          <Field label="Startmonat">
            <input
              className={styles.num}
              type="month"
              value={inputs.startMonth}
              onChange={(e) => set("startMonth", e.target.value || "2026-08")}
              aria-label="Startmonat"
            />
          </Field>
          <Num label="Anzahl Monate" v={inputs.months} set={(v) => set("months", clamp(v, 1, 60))} step={1} unit="Monate" />
          <Field label="Monat der Finanzierungsrunde" hint="Ab hier gibt es Gehälter und Einstellungen">
            <select
              className={styles.custSelect}
              value={inputs.fundingMonth}
              onChange={(e) => set("fundingMonth", Number(e.target.value))}
              aria-label="Finanzierungsmonat"
            >
              {hz.map((m) => (
                <option key={m.index} value={m.index}>
                  {m.label}
                </option>
              ))}
              <option value={999}>keine Runde</option>
            </select>
          </Field>
          <Num label="Rundengröße" v={inputs.roundSize} set={(v) => set("roundSize", v)} step={50} unit="k€" />
          <Num label="Cash-Startbestand" v={inputs.startCash} set={(v) => set("startCash", v)} step={5} unit="k€" />
        </Group>

        <Group title="Bootstrap-Phase" note="Vor der Runde: kein Team, keine Gehälter.">
          <Num label="Demo-Calls pro Monat" v={inputs.bootDemos} set={(v) => set("bootDemos", v)} step={1} unit="/ Monat" />
          <Num
            label="Lieferkapazität der Gründer"
            hint="Kampagnen, die ihr ohne Team schafft"
            v={inputs.founderCapacity}
            set={(v) => set("founderCapacity", v)}
            step={1}
            unit="Piloten"
          />
          <Num label="Fixkosten pro Monat" v={inputs.bootFixed} set={(v) => set("bootFixed", v)} step={0.5} unit="k€" />
          <Num label="Anzahl Gründer" v={inputs.founders} set={(v) => set("founders", clamp(v, 1, 10))} step={1} unit="" />
          <Num
            label="Stipendium je Gründer"
            hint="Nur zur Anzeige — belastet die Firmenkosten nicht"
            v={inputs.stipendPerFounder}
            set={(v) => set("stipendPerFounder", v)}
            step={0.5}
            unit="k€ / Mon."
          />
          <Num
            label="Laufzeit des Stipendiums"
            v={inputs.stipendMonths}
            set={(v) => set("stipendMonths", v)}
            step={1}
            unit="Monate"
          />
          <p className={styles.groupNote}>
            {inputs.founders} × {inputs.stipendPerFounder} k€ über {inputs.stipendMonths} Monate ={" "}
            {fmtK(inputs.founders * inputs.stipendPerFounder * inputs.stipendMonths)} Lebenshaltung, die der Plan nicht
            tragen muss. Es läuft aus{" "}
            {inputs.stipendMonths < inputs.months ? `in ${hz[inputs.stipendMonths].label}` : "erst nach dem Zeitraum"}
            {inputs.stipendMonths < inputs.fundingMonth && (
              <strong> — also vor der Runde. Dazwischen fehlt euch Einkommen.</strong>
            )}
            .
          </p>
        </Group>

        <Group title="Nach der Runde">
          <Num label="Demo-Calls pro Monat" v={inputs.postDemos} set={(v) => set("postDemos", v)} step={1} unit="/ Monat" />
          <Num
            label="Kampagnen je Mitarbeiter"
            v={inputs.campaignsPerEmployee}
            set={(v) => set("campaignsPerEmployee", v)}
            step={0.5}
            unit="/ Monat"
          />
          <Num label="Einstellungsrate" v={inputs.hiringRate} set={(v) => set("hiringRate", v)} step={0.25} unit="/ Monat" />
          <Num label="Maximale Teamgröße" v={inputs.maxTeam} set={(v) => set("maxTeam", v)} step={1} unit="Personen" />
          <Num
            label="Arbeitgeberkosten je Person"
            v={inputs.employerCost}
            set={(v) => set("employerCost", v)}
            step={0.5}
            unit="k€ / Mon."
          />
          <Num
            label="Gründergehalt ab Runde"
            v={inputs.founderSalary}
            set={(v) => set("founderSalary", v)}
            step={0.5}
            unit="k€ / Mon."
          />
          <Num label="Fixkosten pro Monat" v={inputs.postFixed} set={(v) => set("postFixed", v)} step={0.5} unit="k€" />
        </Group>

        <Group title="Funnel" note="Demo-Calls → Piloten → Abos, jeweils mit Zeitversatz.">
          <Pct label="Conversion Demo → Pilot" v={inputs.cvDemoToPilot} set={(v) => set("cvDemoToPilot", v)} />
          <Num
            label="Zeitversatz Demo → Pilot"
            v={inputs.lagDemoToPilot}
            set={(v) => set("lagDemoToPilot", clamp(v, 0, 12))}
            step={1}
            unit="Monate"
          />
          <Pct label="Conversion Pilot → Abo" v={inputs.cvPilotToSub} set={(v) => set("cvPilotToSub", v)} />
          <Num
            label="Zeitversatz Pilot → Abo"
            v={inputs.lagPilotToSub}
            set={(v) => set("lagPilotToSub", clamp(v, 0, 24))}
            step={1}
            unit="Monate"
          />
        </Group>

        <Group title="Preise" note="Der Rabattpreis gilt automatisch für die ersten N Piloten — nach Reihenfolge.">
          <Num
            label="Anzahl Design-Partner"
            v={inputs.designPartners}
            set={(v) => set("designPartners", v)}
            step={1}
            unit="Kunden"
          />
          <Num
            label="Pilot-Rabattpreis"
            v={inputs.pilotPriceDesign}
            set={(v) => set("pilotPriceDesign", v)}
            step={0.5}
            unit="k€"
          />
          <Num label="Pilot-Listenpreis" v={inputs.pilotPriceList} set={(v) => set("pilotPriceList", v)} step={0.5} unit="k€" />
          <Num label="Abo-ACV" v={inputs.subACV} set={(v) => set("subACV", v)} step={1} unit="k€ / Jahr" />
          <Pct
            label="Monatliche Expansionsrate"
            hint="Weitere Abteilungen und Standorte im Bestand"
            v={inputs.expansionRate}
            set={(v) => set("expansionRate", v)}
            max={0.2}
            step={0.005}
            digits={1}
          />
        </Group>

        <Group
          title="Channel"
          note="Die Partner selbst stehen namentlich in der Kundenliste — hier stehen nur die Konditionen."
        >
          <Num
            label="Jahreslizenz je Partner"
            v={inputs.partnerLicense}
            set={(v) => set("partnerLicense", v)}
            step={1}
            unit="k€ / Jahr"
          />
          <Num
            label="Interviews je Partner"
            v={inputs.interviewsPerPartner}
            set={(v) => set("interviewsPerPartner", v)}
            step={1}
            unit="/ Monat"
          />
          <Num
            label="Wholesale-Preis je Interview"
            v={inputs.wholesalePerInterview}
            set={(v) => set("wholesalePerInterview", v)}
            step={5}
            unit="€"
          />
          <Num
            label="Hochlaufzeit"
            v={inputs.partnerRampMonths}
            set={(v) => set("partnerRampMonths", clamp(v, 1, 24))}
            step={1}
            unit="Monate"
          />
          <Num
            label="Referral-Demos je Partner"
            hint="Der eigentliche Multiplikator — fließt in den Direktfunnel zurück"
            v={inputs.referralDemosPerPartner}
            set={(v) => set("referralDemosPerPartner", v)}
            step={0.5}
            unit="/ Monat"
          />
        </Group>

        <Group title="Stückkosten">
          <Num
            label="Interviews je Kampagne"
            v={inputs.interviewsPerCampaign}
            set={(v) => set("interviewsPerCampaign", v)}
            step={1}
            unit="Stück"
          />
          <Num
            label="Interviews je Abo-Kunde"
            v={inputs.interviewsPerSubMonth}
            set={(v) => set("interviewsPerSubMonth", v)}
            step={1}
            unit="/ Monat"
          />
          <Num
            label="Vollkosten je Interview"
            v={inputs.costPerInterview}
            set={(v) => set("costPerInterview", v)}
            step={5}
            unit="€"
          />
        </Group>
      </div>

      {/* ── Named customers ── */}
      <div className={styles.secLabel}>Namentliche Kundenliste</div>
      <p className={styles.secNote}>
        Namentliche Kunden kommen <strong>zusätzlich</strong> zum Funnel — und der Funnel wird um sie gekürzt, damit
        nichts doppelt zählt: neue Piloten = max(namentlich, min(Funnel + namentlich, Lieferkapazität)). Ein Eintrag mit
        eigenem Pilot-Umsatz überschreibt den automatischen Preis, verbraucht aber trotzdem einen Design-Partner-Platz.
        Bei <em>Channel-Partner</em> ist der Pilot-Monat der Start der Partnerschaft und der Pilot-Umsatz eine einmalige
        Setup-Gebühr; Abo-Felder gelten dort nicht.
      </p>
      <p className={styles.secNote}>
        Die Zeilen unten sind <strong>Platzhalter</strong>. Trag deine echten Kunden ein — der Stand bleibt über „Link
        kopieren" in der URL und über die gespeicherten Szenarien in diesem Browser erhalten. Da die Seite ohne
        Passwort erreichbar ist, landen echte Namen bewusst nicht im Code.
      </p>
      <CustomerTable customers={customers} horizon={hz} onChange={setCustomers} />

      <div className={`${styles.coverage} ${coverageLow ? styles.coverageWarn : styles.coverageOk}`}>
        <span className={styles.coverageLabel}>Namentliche Deckung</span>
        <strong>{fmtPct(summary.namedCoverage)}</strong>
        <span className={styles.coverageDetail}>
          {summary.pilotsNamed} von {summary.pilotsPlanned} geplanten Piloten sind namentlich hinterlegt.{" "}
          {coverageLow
            ? "Der Rest ist Funnel-Annahme — das ist die ehrlichste Zahl im ganzen Tool."
            : "Der ganze Plan steht auf konkreten Namen."}
        </span>
      </div>

      {/* ── Table and charts ── */}
      <div className={styles.results}>
        <div className={styles.tableCol}>
          <div className={styles.secLabel}>Monatsplan</div>
          <div className={styles.monthScroll}>
            <table className={styles.monthTable}>
              <thead>
                <tr>
                  <th>Monat</th>
                  <th>Phase</th>
                  <th>Demos</th>
                  <th>+Pilot</th>
                  <th>Pilot Σ</th>
                  <th>+Abo</th>
                  <th>Abo Σ</th>
                  <th>Partner</th>
                  <th>Pilot</th>
                  <th>Abo</th>
                  <th>Channel</th>
                  <th>Umsatz</th>
                  <th>Kosten</th>
                  <th>Ergebnis</th>
                  <th>Cash</th>
                </tr>
              </thead>
              <tbody onMouseLeave={() => setHighlight(null)}>
                {months.map((m) => (
                  <tr
                    key={m.key}
                    className={`${m.phase === "bootstrap" ? styles.rowBoot : styles.rowFunded} ${
                      highlight === m.index ? styles.rowHot : ""
                    }`}
                    onMouseEnter={() => setHighlight(m.index)}
                    title={m.events.length ? m.events.join(" · ") : undefined}
                  >
                    <td className={styles.monthCell}>
                      {m.label}
                      {m.inflow > 0 && <span className={styles.roundDot} title="Runde" />}
                    </td>
                    <td className={styles.phaseCell}>{m.phase === "bootstrap" ? "Boot" : "Fin"}</td>
                    <td>{r1(m.demos)}</td>
                    <td>
                      {m.newPilots}
                      {m.newPilotsNamed > 0 && <span className={styles.namedMark}>·{m.newPilotsNamed}</span>}
                    </td>
                    <td>{m.pilotsTotal}</td>
                    <td>{m.newSubs}</td>
                    <td>{m.subsTotal}</td>
                    <td>{m.partnersActive}</td>
                    <td>{r1(m.revPilot)}</td>
                    <td>{r1(m.revSub)}</td>
                    <td>{r1(m.revChannel)}</td>
                    <td className={styles.strong}>{r1(m.revenue)}</td>
                    <td>{r1(m.cost)}</td>
                    <td className={m.result >= 0 ? styles.pos : styles.neg}>{r1(m.result)}</td>
                    <td className={m.cash < 0 ? styles.neg : ""}>{r1(m.cash)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={8}>Summe</td>
                  <td>{r1(months.reduce((a, m) => a + m.revPilot, 0))}</td>
                  <td>{r1(months.reduce((a, m) => a + m.revSub, 0))}</td>
                  <td>{r1(months.reduce((a, m) => a + m.revChannel, 0))}</td>
                  <td className={styles.strong}>{r1(summary.revenueTotal)}</td>
                  <td>{r1(summary.costTotal)}</td>
                  <td className={summary.revenueTotal - summary.costTotal >= 0 ? styles.pos : styles.neg}>
                    {r1(summary.revenueTotal - summary.costTotal)}
                  </td>
                  <td>{r1(summary.endCash)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className={styles.tableNote}>
            Alle Beträge in k€. Zeile überfahren, um den Monat in allen Grafiken hervorzuheben. „·n" hinter den neuen
            Piloten zählt die namentlich hinterlegten.
          </p>
        </div>

        <div className={styles.chartCol} ref={chartsRef}>
          <div className={styles.secLabel}>Verlauf</div>
          <PlanCharts
            months={months}
            fundingMonth={inputs.fundingMonth}
            breakEvenMonth={summary.breakEvenMonth}
            highlight={highlight}
            expandActive={inputs.expandActive}
            channelActive={inputs.channelActive}
          />
        </div>
      </div>

      {/* ── Scenario comparison ── */}
      <div className={styles.secLabel}>Szenarienvergleich</div>
      {Object.keys(scenarios).length === 0 ? (
        <p className={styles.secNote}>
          Noch keine gespeicherten Szenarien. Speichere den aktuellen Stand als <em>Bear</em>, <em>Base</em> und{" "}
          <em>Bull</em>, um sie hier nebeneinander zu sehen.
        </p>
      ) : (
        <>
          <div className={styles.scenPicker}>
            {Object.keys(scenarios).map((n) => {
              const on = compare.includes(n);
              return (
                <span key={n} className={styles.scenChip}>
                  <button
                    type="button"
                    aria-pressed={on}
                    className={`${styles.chipBtn}${on ? ` ${styles.chipBtnOn}` : ""}`}
                    onClick={() =>
                      setCompare((c) => (on ? c.filter((x) => x !== n) : c.length >= 3 ? c : [...c, n]))
                    }
                  >
                    {n}
                  </button>
                  <button type="button" className={styles.rowBtn} onClick={() => drop(n)} aria-label={`${n} löschen`}>
                    ✕
                  </button>
                </span>
              );
            })}
            <span className={styles.scenHint}>bis zu drei</span>
          </div>

          {compare.length > 0 && (
            <div className={styles.compareScroll}>
              <table className={styles.compareTable}>
                <thead>
                  <tr>
                    <th>Kennzahl</th>
                    <th>Aktuell</th>
                    {compare.map((n) => (
                      <th key={n}>{n}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ["ARR am Ende", (s: typeof summary) => fmtK(s.arr)],
                      ["Run-Rate", (s: typeof summary) => fmtK(s.runRate)],
                      ["Kunden gesamt", (s: typeof summary) => String(s.customersTotal)],
                      ["davon Abo", (s: typeof summary) => String(s.subsTotal)],
                      ["Channel-Partner", (s: typeof summary) => String(s.partners)],
                      ["Bruttomarge", (s: typeof summary) => fmtPct(s.grossMargin)],
                      ["Cash am Ende", (s: typeof summary) => fmtK(s.endCash)],
                      ["Namentliche Deckung", (s: typeof summary) => fmtPct(s.namedCoverage)],
                    ] as const
                  ).map(([label, fn]) => (
                    <tr key={label}>
                      <td>{label}</td>
                      <td className={styles.strong}>{fn(summary)}</td>
                      {compare.map((n) => (
                        <td key={n}>{fn(computePlan(scenarios[n].inputs, scenarios[n].customers).summary)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Sensitivity and the reverse question ── */}
      <div className={styles.secLabel}>Sensitivität</div>
      <div className={styles.sensRow}>
        <SensitivityFan inputs={inputs} customers={customers} />
        <div className={styles.askBox}>
          <div className={styles.askTitle}>Was müsste passieren?</div>
          <Field label="Ziel-ARR am Ende des Zeitraums">
            <input
              className={styles.num}
              type="number"
              min={0}
              step={100}
              value={targetARR}
              onChange={(e) => setTargetARR(Math.max(0, +e.target.value))}
              aria-label="Ziel-ARR"
            />
            <span className={styles.unit}>k€</span>
          </Field>
          <p className={styles.askAnswer}>
            {neededConversion == null ? (
              <>
                Selbst bei <strong>100 %</strong> Conversion Demo → Pilot reicht der Plan nicht an {fmtK(targetARR)}{" "}
                heran. Der Engpass liegt woanders — an den Demo-Calls, der Lieferkapazität oder am Preis.
              </>
            ) : neededConversion <= inputs.cvDemoToPilot ? (
              <>
                Mit <strong>{fmtPct(neededConversion, 1)}</strong> Conversion Demo → Pilot ist {fmtK(targetARR)}{" "}
                erreicht. Der Plan liegt mit {fmtPct(inputs.cvDemoToPilot, 1)} bereits darüber.
              </>
            ) : (
              <>
                Dafür bräuchte es <strong>{fmtPct(neededConversion, 1)}</strong> Conversion Demo → Pilot statt der
                geplanten {fmtPct(inputs.cvDemoToPilot, 1)} — alles andere gleich.
              </>
            )}
          </p>
        </div>
      </div>

      <footer className={styles.foot}>
        Diese Seite ist ohne Passwort erreichbar — sie ist nur unlisted: nicht in der Tool-Navigation, nicht in der
        Sitemap, für Suchmaschinen gesperrt. Wer die URL hat, sieht die Kundennamen. Keine Analytics auf dieser Route.
      </footer>
    </section>
  );
}

/* ── Small pieces, in the same idiom as the public tools ── */

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "ok" | "bad" }) {
  return (
    <div className={styles.kpi}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={`${styles.kpiValue} ${tone === "bad" ? styles.neg : tone === "ok" ? styles.pos : ""}`}>
        {value}
      </div>
      {sub && <div className={styles.kpiSub}>{sub}</div>}
    </div>
  );
}

function Group({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className={styles.group}>
      <div className={styles.groupTitle}>{title}</div>
      {note && <p className={styles.groupHint}>{note}</p>}
      {children}
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
      <span className={styles.pctVal}>{fmtPct(v, digits)}</span>
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
        <span className={styles.motionKnob} />
        {label}
      </button>
      <p className={styles.motionNote}>{note}</p>
    </div>
  );
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const r1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
