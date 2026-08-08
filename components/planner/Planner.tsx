"use client";

import { useCallback, useMemo, useState } from "react";
import CapTable from "./CapTable";
import DilutionChart from "./DilutionChart";
import ExitScenario from "./ExitScenario";
import LiquidationPref from "./LiquidationPref";
import MetricsRow from "./MetricsRow";
import RoundsTable from "./RoundsTable";
import VentureCard from "./VentureCard";
import {
  applyIndustry,
  calc,
  fmtM,
  initialPlannerState,
  roundName,
  type IndustryKey,
  type Investor,
  type PlannerState,
  type RoundId,
  type RoundState,
} from "@/lib/planner";

export default function Planner() {
  const [state, setState] = useState<PlannerState>(initialPlannerState);
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({});

  const patch = useCallback((p: Partial<PlannerState>) => setState((s) => ({ ...s, ...p })), []);

  const patchRound = useCallback((id: RoundId, p: Partial<RoundState>) => {
    setState((s) => {
      const rounds = s.rounds.map((r) => (r.id === id ? { ...r, ...p } : r));
      // Any manual edit to a round takes the preset off "industry" and onto Custom,
      // except for the pure on/off toggle which the original left alone.
      const industry: IndustryKey = "invest" in p || "dilPct" in p ? "custom" : s.industry;
      return { ...s, rounds, industry };
    });
  }, []);

  const patchInvestors = useCallback(
    (id: RoundId, next: Investor[]) => setState((s) => ({ ...s, investors: { ...s.investors, [id]: next } })),
    [],
  );

  const togglePanel = useCallback(
    (id: RoundId) => setOpenPanels((p) => ({ ...p, [id]: !p[id] })),
    [],
  );

  const onIndustry = useCallback((key: IndustryKey) => setState((s) => applyIndustry(s, key)), []);

  const data = useMemo(() => calc(state), [state]);
  const { convEffect } = data;
  const activeRounds = data.active;

  return (
    <div className="page">
      <div style={{ marginBottom: 4 }}>
        <h1>Startup Funding &amp; Dilution Planner</h1>
        <p className="subtitle">
          Plan your financing rounds — model FFF, Angels &amp; VCs, track dilution, build your cap table, and simulate
          exit scenarios.
        </p>
      </div>

      <VentureCard state={state} onPatch={patch} onIndustry={onIndustry} />

      <div className="sec-label">Grants &amp; Non-Dilutive Funding</div>
      <div className="card">
        <div className="nd-row">
          <span className="ndl">Grants / Non-Dilutive</span>
          <input
            type="number"
            min="0"
            step="0.1"
            style={{ width: 90, textAlign: "right" }}
            value={state.grantAmt}
            onChange={(e) => patch({ grantAmt: e.target.value })}
            aria-label="Grant amount"
          />
          <span style={{ fontSize: 12, color: "var(--text2)" }}>Mio €</span>
          <span style={{ fontSize: 12, color: "var(--text3)", marginLeft: 4 }}>(no equity effect)</span>
        </div>

        <div className="info-box">
          <strong>Grants &amp; non-dilutive funding</strong> (EU Horizon, EIC Accelerator, EXIST, SBIR) extend your
          runway without touching the cap table. They are the only money here that costs you no ownership.
        </div>
      </div>

      <div className="sec-label">Convertible / SAFE</div>
      <div className="card">
        <div className="nd-row">
          <span className="ndl">Amount</span>
          <input
            type="number"
            min="0"
            step="0.1"
            style={{ width: 90, textAlign: "right" }}
            value={state.convAmt}
            onChange={(e) => patch({ convAmt: e.target.value })}
            aria-label="Convertible note amount"
          />
          <span style={{ fontSize: 12, color: "var(--text2)" }}>Mio €</span>
          <span style={{ fontSize: 12, color: "var(--text2)", marginLeft: 8 }}>Discount</span>
          <input
            type="number"
            min="0"
            max="40"
            step="1"
            style={{ width: 52, textAlign: "right" }}
            value={state.convDiscount}
            onChange={(e) => patch({ convDiscount: e.target.value })}
            aria-label="Convertible discount"
          />
          <span style={{ fontSize: 12, color: "var(--text2)" }}>%</span>
          <span style={{ fontSize: 12, color: "var(--text2)", marginLeft: 8 }}>Val. Cap</span>
          <input
            type="number"
            min="0"
            step="0.5"
            style={{ width: 90, textAlign: "right" }}
            value={state.convCap}
            onChange={(e) => patch({ convCap: e.target.value })}
            aria-label="Convertible valuation cap"
          />
          <span style={{ fontSize: 12, color: "var(--text2)" }}>M€ (0 = no cap)</span>
        </div>

        <div className="nd-row">
          <span className="ndl">Converts at</span>
          <div className="venture-seg">
            {activeRounds.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`vsb${(data.convTarget?.id ?? activeRounds[0]?.id) === r.id ? " active" : ""}`}
                onClick={() => patch({ convRound: r.id })}
              >
                {roundName(r.id)}
              </button>
            ))}
            {!activeRounds.length && (
              <span style={{ fontSize: 12, color: "var(--text3)" }}>Enable a round first</span>
            )}
          </div>
        </div>

        {convEffect.pct > 0 && (
          <div className="info-box">
            Convertible note of {fmtM(convEffect.amt)} converts at effective valuation of {fmtM(convEffect.effectiveVal)}{" "}
            ({Math.round(convEffect.discount * 100)}% discount
            {convEffect.cap > 0 ? `, cap ${fmtM(convEffect.cap)}` : ""}) — about {convEffect.pct.toFixed(1)}% dilution,
            taken immediately before {data.convTarget ? roundName(data.convTarget.id) : "the first round"} prices.
          </div>
        )}

        <div className="info-box" style={{ marginTop: 10 }}>
          A convertible note or SAFE is <strong>not non-dilutive</strong> — it is equity with the price postponed. You
          take the money now and agree the ownership later, when a priced round sets a valuation.
          <br />
          <br />
          It converts <strong>into</strong> one of your rounds, immediately before it prices — so the noteholder is
          diluted by that round along with everyone else. Pick which round above: the next one for a normal pre-round
          raise, or a later one if the note is a bridge across a round. The <strong>discount</strong> rewards the early
          risk by converting at that round&apos;s price minus X%; the <strong>valuation cap</strong> limits the
          conversion valuation, which protects the noteholder if the round prices high. Whichever is more favourable to
          them applies.
        </div>
      </div>

      <div className="sec-label">Financing Rounds</div>
      <RoundsTable
        state={state}
        sf={data.sf}
        openPanels={openPanels}
        onTogglePanel={togglePanel}
        onPatchRound={patchRound}
        onPatchInvestors={patchInvestors}
      />

      <ExitScenario state={state} data={data} onPatch={patch} />

      <LiquidationPref data={data} lpMode={state.lpMode} onChange={(lpMode) => patch({ lpMode })} />

      <div className="sec-label">Dilution Chart</div>
      <DilutionChart
        data={data}
        state={state}
        onToggleVal={() => patch({ showVal: !state.showVal })}
        onToggleInv={() => patch({ showInv: !state.showInv })}
      />

      <MetricsRow data={data} state={state} />

      <div className="sec-label">Cap Table</div>
      <CapTable data={data} state={state} />

      <div className="pdf-footer">
        <button type="button" className="pdf-btn" onClick={() => window.print()}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 1h8v4H4z" />
            <path d="M4 11H2a1 1 0 01-1-1V6a1 1 0 011-1h12a1 1 0 011 1v4a1 1 0 01-1 1h-2" />
            <path d="M4 8h8v7H4z" />
          </svg>
          Download PDF Report
        </button>
      </div>

      <footer style={{ marginTop: "1.5rem" }}>
        All values are approximations based on industry benchmarks. Not a substitute for legal or tax advice.
      </footer>
    </div>
  );
}
