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

      <div className="sec-label">Non-Dilutive Funding &amp; Convertibles</div>
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

        <div className="nd-row">
          <span className="ndl">Convertible Note</span>
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

        {convEffect.pct > 0 && (
          <div className="info-box">
            Convertible note of {fmtM(convEffect.amt)} converts at effective valuation of {fmtM(convEffect.effectiveVal)}{" "}
            ({Math.round(convEffect.discount * 100)}% discount
            {convEffect.cap > 0 ? `, cap ${fmtM(convEffect.cap)}` : ""}) ~{convEffect.pct.toFixed(1)}% dilution at first
            round.
          </div>
        )}

        <div className="info-box" style={{ marginTop: 10 }}>
          <strong>Grants &amp; Non-Dilutive Funding</strong> (e.g. EU Horizon, EIC Accelerator, SBIR, Exist) extend your
          runway without equity dilution.
          <br />
          <strong>Convertible Notes</strong> convert into equity at the next round. The <strong>Discount</strong> rewards
          early risk: the note converts at next-round price minus X%. The <strong>Valuation Cap</strong> limits the
          conversion valuation, protecting early investors at high follow-on valuations.
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
