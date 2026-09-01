"use client";

import { Fragment } from "react";
import {
  fmtKeur,
  fmtM,
  investorDetailRows,
  itype,
  pct,
  roundName,
  INVESTOR_BADGE_COLORS,
  FOUNDER_COLOR,
  ESOP_COLOR,
  CONVERTIBLE_COLOR,
  type CalcResult,
  type PlannerState,
  type RoundId,
  type StakeholderType,
} from "@/lib/planner";

const BAR_COLORS: Partial<Record<StakeholderType, string>> = {
  founder: FOUNDER_COLOR,
  esop: ESOP_COLOR,
  conv: CONVERTIBLE_COLOR,
};
const BADGE_CLS: Record<StakeholderType, string> = {
  founder: "bf",
  esop: "be",
  investor: "bi",
  conv: "bcv",
};
const BADGE_TXT: Record<StakeholderType, string> = {
  founder: "Founder",
  esop: "ESOP",
  investor: "Investor",
  conv: "Convertible",
};

type Props = { data: CalcResult; state: PlannerState };

export default function CapTable({ data, state }: Props) {
  const { allStakeholders, exitM } = data;

  return (
    <div className="cf">
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ paddingLeft: 12 }}>Stakeholder</th>
            <th>Ownership</th>
            <th>Share</th>
            <th>Exit Proceeds</th>
            <th>Multiple</th>
          </tr>
        </thead>
        <tbody>
          {allStakeholders.map((s, i) => {
            const barColor = BAR_COLORS[s.type] ?? s.color ?? "#888";

            // For a round's investor row, list the named investors beneath it.
            const roundId =
              s.type === "investor"
                ? (state.rounds.find((r) => roundName(r.id) === s.rnd)?.id as RoundId | undefined)
                : undefined;
            const details = roundId ? investorDetailRows(state, roundId, s.pct, exitM, data.sf) : [];

            return (
              <Fragment key={`${s.type}-${s.name}-${i}`}>
                <tr>
                  <td style={{ paddingLeft: 12 }}>
                    <span className={`badge ${BADGE_CLS[s.type]}`} style={{ marginRight: 6 }}>
                      {BADGE_TXT[s.type]}
                    </span>
                    <span style={{ fontSize: 12 }}>{s.name}</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="bw">
                        <div
                          className="bf2"
                          style={{ width: `${Math.min(100, s.pct * 2.2).toFixed(1)}%`, background: barColor }}
                        />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{pct(s.pct)}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, opacity: 0.7 }}>{s.pct.toFixed(1)}%</td>
                  <td style={{ fontSize: 12, fontWeight: 500 }}>{exitM ? fmtM((exitM * s.pct) / 100) : "—"}</td>
                  <td style={{ fontSize: 12, fontWeight: 500 }}>{fmtMultiple(exitM, s.pct, s.invested)}</td>
                </tr>

                {details.map((d) => {
                  const tm = itype(d.type);
                  const col = INVESTOR_BADGE_COLORS[d.type];
                  return (
                    <tr key={d.key} className="inv-detail">
                      <td style={{ paddingLeft: 28 }}>
                        <span className="inv-detail-badge" style={{ background: col.bg, color: col.c }}>
                          {tm.label}
                        </span>
                        {d.name || <em>Unnamed</em>}
                      </td>
                      <td>{d.pct.toFixed(2)}%</td>
                      <td>{fmtKeur(d.amtK)}</td>
                      <td style={{ fontSize: 11, fontWeight: 500, color: "var(--text)" }}>
                        {d.exitProceeds !== null ? fmtM(d.exitProceeds) : "—"}
                      </td>
                      <td style={{ fontSize: 11, fontWeight: 500, color: "var(--text)" }}>
                        {d.multiple !== null ? `${d.multiple.toFixed(1)}×` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}

          <tr style={{ borderTop: "0.5px solid var(--border2)" }}>
            <td colSpan={2} style={{ fontWeight: 500, fontSize: 12, padding: "9px 10px" }}>
              Total
            </td>
            <td style={{ fontSize: 12, fontWeight: 500 }}>100%</td>
            <td style={{ fontSize: 12, fontWeight: 500 }}>{exitM ? fmtM(exitM) : "—"}</td>
            <td style={{ fontSize: 12, fontWeight: 500 }}>
              {exitM && data.totalInvested > 0 ? `${(exitM / data.totalInvested).toFixed(1)}×` : "—"}
            </td>
          </tr>
        </tbody>
      </table>

      <p className="cap-note">
        Das Multiple ist der Exit-Erlös geteilt durch das eingezahlte Kapital — <strong>as-converted</strong>, also
        ohne Liquidationspräferenz. Was eine Präferenz daran ändert, steht im Abschnitt darüber; bei einem Exit unter
        der Bewertung der letzten Runde weichen die beiden deutlich voneinander ab. Gründer und ESOP haben kein Geld
        eingezahlt, deshalb steht dort kein Multiple.
      </p>
    </div>
  );
}

/** Exit-Erlös über eingezahltem Kapital. Ohne Einzahlung gibt es kein Vielfaches. */
function fmtMultiple(exitM: number | null, pctOfCompany: number, invested?: number): string {
  if (!exitM || !invested || invested <= 0) return "—";
  return `${((exitM * pctOfCompany) / 100 / invested).toFixed(1)}×`;
}
