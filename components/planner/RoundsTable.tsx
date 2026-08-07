"use client";

import { Fragment } from "react";
import InvestorPanel from "./InvestorPanel";
import {
  fmtM,
  roundName,
  ROUND_DEF_BY_ID,
  type Investor,
  type PlannerState,
  type RoundId,
  type RoundState,
} from "@/lib/planner";

type Props = {
  state: PlannerState;
  sf: number;
  openPanels: Record<string, boolean>;
  onTogglePanel: (id: RoundId) => void;
  onPatchRound: (id: RoundId, patch: Partial<RoundState>) => void;
  onPatchInvestors: (id: RoundId, next: Investor[]) => void;
};

export default function RoundsTable({
  state,
  sf,
  openPanels,
  onTogglePanel,
  onPatchRound,
  onPatchInvestors,
}: Props) {
  // "Scaled" view: reverse mode has stretched every ticket, so show both
  // the scaled amounts and flag the valuation pill.
  const isScaled = state.linked && Math.abs(sf - 1) > 0.01;

  return (
    <div className="cf">
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: 100, paddingLeft: 14 }}>Round</th>
            <th>Investment</th>
            <th>Dilution %</th>
            <th style={{ textAlign: "right", paddingRight: 14 }}>Pre / Post-Money</th>
            <th style={{ width: 90 }} />
            <th style={{ width: 110 }} />
          </tr>
        </thead>
        <tbody>
          {state.rounds.map((r) => {
            const def = ROUND_DEF_BY_ID[r.id];
            const scaledInvest = r.invest * sf;
            const scaledPost = (scaledInvest / r.dilPct) * 100;
            const basePost = (r.invest / r.dilPct) * 100;
            const investors = state.investors[r.id] ?? [];
            const open = !!openPanels[r.id];

            return (
              <Fragment key={r.id}>
                <tr className={r.active ? "" : "inactive"}>
                  <td style={{ paddingLeft: 14, whiteSpace: "nowrap" }}>
                    <span className="dot" style={{ background: def.color }} />
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{roundName(r.id)}</span>
                  </td>
                  <td style={{ minWidth: 160 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="range"
                        min="0.1"
                        max={def.investMax}
                        step={def.investStep}
                        value={r.invest}
                        onChange={(e) => onPatchRound(r.id, { invest: +e.target.value })}
                        aria-label={`${roundName(r.id)} investment`}
                      />
                      <span style={{ fontSize: 11, minWidth: 56 }}>
                        {isScaled ? fmtM(scaledInvest) : fmtM(r.invest)}
                      </span>
                    </div>
                  </td>
                  <td style={{ minWidth: 160 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="range"
                        min="3"
                        max="40"
                        step="1"
                        value={r.dilPct}
                        onChange={(e) => onPatchRound(r.id, { dilPct: +e.target.value })}
                        aria-label={`${roundName(r.id)} dilution`}
                      />
                      <span style={{ fontSize: 11, minWidth: 28 }}>{r.dilPct}%</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right", paddingRight: 14 }}>
                    <span className={`vp${isScaled ? " sc" : ""}`}>
                      {isScaled
                        ? `${fmtM(scaledPost - scaledInvest)} / ${fmtM(scaledPost)}`
                        : `${fmtM(basePost - r.invest)} / ${fmtM(basePost)}`}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`inv-dropdown-toggle${investors.length ? " has-inv" : ""}`}
                      onClick={() => onTogglePanel(r.id)}
                      aria-expanded={open}
                    >
                      ▼ Investors{investors.length ? ` (${investors.length})` : ""}
                    </button>
                  </td>
                  <td style={{ paddingRight: 10 }}>
                    <button
                      type="button"
                      className={`tog ${r.active ? "on" : ""}`}
                      onClick={() => onPatchRound(r.id, { active: !r.active })}
                    >
                      {r.active ? "Active" : "Off"}
                    </button>
                  </td>
                </tr>

                {open && (
                  <tr className={r.active ? "" : "inactive"}>
                    <td colSpan={6} style={{ padding: 0 }}>
                      <InvestorPanel
                        round={r}
                        investors={investors}
                        onChange={(next) => onPatchInvestors(r.id, next)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
