"use client";

import { calcLPScenario, fmtM, pct, type CalcResult, type LPMode } from "@/lib/planner";

const MODES: { id: LPMode; label: string }[] = [
  { id: "none", label: "None (pro-rata)" },
  { id: "nonpart", label: "1× non-participating" },
  { id: "part", label: "1× participating" },
  { id: "2x", label: "2× non-participating" },
];

const MODE_LABEL: Record<Exclude<LPMode, "none">, string> = {
  nonpart: "1× non-participating LP",
  part: "1× participating LP",
  "2x": "2× non-participating LP",
};

const EXPLAINERS: { cls: string; term: string; text: string }[] = [
  {
    cls: "tf",
    term: "None (pro-rata)",
    text: "Everyone receives exactly their ownership % of exit proceeds. No priority, no waterfall — fairest distribution.",
  },
  {
    cls: "tf",
    term: "1× non-participating",
    text: "Investors first get their capital back, then forfeit their pro-rata share of the remainder. Today's standard for reputable VCs.",
  },
  {
    cls: "tm",
    term: "1× participating",
    text: 'Investors get their capital back AND keep their full share of the remainder. "Double dip" — unfavorable for founders at mid-range exits.',
  },
  {
    cls: "th",
    term: "2× non-participating",
    text: "Investors receive 2x their capital before founders see anything. Occurs in down-rounds or tough negotiations.",
  },
];

type Props = { data: CalcResult; lpMode: LPMode; onChange: (m: LPMode) => void };

export default function LiquidationPref({ data, lpMode, onChange }: Props) {
  const { allStakeholders, exitM, totalInvested } = data;
  const s = calcLPScenario(allStakeholders, exitM, totalInvested, lpMode);

  return (
    <>
      <div className="sec-label">Liquidation Preference</div>
      <div className="card">
        <div className="lp-btns">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`lpb${lpMode === m.id ? " on" : ""}`}
              onClick={() => onChange(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {lpMode !== "none" && (
          <div>
            {s && exitM && (
              <>
                <div className="g2">
                  <div className="lps">
                    <div className="lpst">No LP — pro-rata</div>
                    <div className="lpr">
                      <span style={{ color: "var(--text2)" }}>Investors ({pct(s.invPct * 100)})</span>
                      <span style={{ fontWeight: 500 }}>{fmtM(s.noLP.inv)}</span>
                    </div>
                    <div className="lpr">
                      <span style={{ color: "var(--text2)" }}>Founders + ESOP ({pct(s.founderPct * 100)})</span>
                      <span style={{ fontWeight: 500 }}>{fmtM(s.noLP.founder)}</span>
                    </div>
                    <div className="lpr tot">
                      <span>Total Exit</span>
                      <span>{fmtM(exitM)}</span>
                    </div>
                  </div>

                  <div className="lps">
                    <div className="lpst">{MODE_LABEL[lpMode as Exclude<LPMode, "none">]}</div>
                    <div className="lpr">
                      <span style={{ color: "var(--text2)" }}>LP repayment{s.withLP.twoX ? " (2×)" : ""}</span>
                      <span style={{ fontWeight: 500 }}>{fmtM(s.withLP.lb)}</span>
                    </div>
                    {s.withLP.part && (
                      <div className="lpr">
                        <span style={{ color: "var(--text2)" }}>+ pro-rata share</span>
                        <span style={{ fontWeight: 500 }}>{fmtM(s.withLP.rem * s.invPct)}</span>
                      </div>
                    )}
                    <div className="lpr">
                      <span style={{ color: "var(--text2)" }}>Investors total</span>
                      <span style={{ fontWeight: 500 }}>{fmtM(s.withLP.inv)}</span>
                    </div>
                    <div className="lpr">
                      <span style={{ color: "var(--text2)" }}>Founders + ESOP</span>
                      <span
                        style={{
                          fontWeight: 500,
                          ...(s.withLP.founder < s.noLP.founder - 0.5 ? { color: "#dc2626" } : {}),
                        }}
                      >
                        {fmtM(s.withLP.founder)}
                      </span>
                    </div>
                    <div className="lpr tot">
                      <span>Total Exit</span>
                      <span>{fmtM(exitM)}</span>
                    </div>
                  </div>
                </div>

                <LPWarning noLPFounder={s.noLP.founder} withLPFounder={s.withLP.founder} exitM={exitM} />
              </>
            )}

            <div className="lpe">
              <div className="lpet">What do the variants mean?</div>
              {EXPLAINERS.map((e) => (
                <div className="lpv" key={e.term}>
                  <span className={`lpvt ${e.cls}`}>{e.term}</span>
                  <span className="lpvx">{e.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function LPWarning({
  noLPFounder,
  withLPFounder,
  exitM,
}: {
  noLPFounder: number;
  withLPFounder: number;
  exitM: number;
}) {
  const diff = noLPFounder - withLPFounder;
  if (withLPFounder <= 0.01) {
    return <div className="wb">At this exit, founders receive nothing with this LP clause.</div>;
  }
  if (diff > 0.5) {
    return (
      <div className="wb">
        With LP, founders lose {fmtM(diff)} vs. pro-rata — that&apos;s {((diff / exitM) * 100).toFixed(1)}% of exit
        proceeds.
      </div>
    );
  }
  return <div className="ok">At this exit the LP effect is minimal — valuation is well above invested capital.</div>;
}
