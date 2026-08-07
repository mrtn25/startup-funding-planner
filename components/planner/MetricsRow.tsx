"use client";

import { fmtM, pct, type CalcResult, type PlannerState, num } from "@/lib/planner";

type Props = { data: CalcResult; state: PlannerState };

export default function MetricsRow({ data, state }: Props) {
  const { allStakeholders, exitM, fc, active, lastPostM, sf, totalNonDilutive } = data;
  const founderPct = allStakeholders.filter((s) => s.type === "founder").reduce((a, s) => a + s.pct, 0);
  const totalInvested = active.reduce((a, r) => a + r.invest * sf, 0);
  const mult = num(state.exitMultiple) || 1;

  return (
    <div className="g3">
      <div className="mc">
        <div className="ml">Per Founder ({pct(founderPct / fc)})</div>
        <div className="mv">{exitM ? fmtM((exitM * founderPct) / 100 / fc) : "—"}</div>
        <div className="ms">{exitM ? `at ${fmtM(exitM)} exit` : "no active round"}</div>
      </div>
      <div className="mc">
        <div className="ml">Equity Capital{sf !== 1 ? " (scaled)" : ""}</div>
        <div className="mv">{fmtM(totalInvested)}</div>
        <div className="ms">
          {active.length} round(s)
          {totalNonDilutive > 0 && (
            <>
              <br />
              <span style={{ fontSize: 10, color: "var(--text3)" }}>+ {fmtM(totalNonDilutive)} non-dilutive</span>
            </>
          )}
        </div>
      </div>
      <div className="mc">
        <div className="ml">Exit Valuation</div>
        <div className="mv">{exitM ? fmtM(exitM) : "—"}</div>
        <div className="ms">{lastPostM ? `${mult.toFixed(1)}x on ${fmtM(lastPostM)} post-M` : "—"}</div>
      </div>
    </div>
  );
}
