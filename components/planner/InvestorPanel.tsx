"use client";

import {
  assignedM,
  fmtKeur,
  itype,
  ITYPES,
  INV_COUNT_TIPS,
  TICKET_SIZES,
  roundName,
  ROUND_DEF_BY_ID,
  type Investor,
  type RoundId,
  type RoundState,
} from "@/lib/planner";

type Props = {
  round: RoundState;
  investors: Investor[];
  /** Reverse-mode scale factor — the round's real total is invest × sf. */
  sf: number;
  onChange: (next: Investor[]) => void;
};

export default function InvestorPanel({ round, investors, sf, onChange }: Props) {
  const id: RoundId = round.id;
  const roundTotal = round.invest * sf;

  const update = (i: number, patch: Partial<Investor>) =>
    onChange(investors.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const remove = (i: number) => onChange(investors.filter((_, j) => j !== i));
  const add = (type: Investor["type"]) => onChange([...investors, { type, name: "", amt: "" }]);

  const remainingM = roundTotal - assignedM(investors);
  const remainingK = remainingM * 1000;

  let status: { text: string; cls: string } | null = null;
  if (investors.length) {
    if (Math.abs(remainingK) < 0.1) status = { text: "✓ Round fully closed", cls: "ok" };
    else if (remainingM > 0) status = { text: `${Math.round(remainingK)} k€ still needed to close round`, cls: "" };
    else status = { text: `⚠ ${Math.round(Math.abs(remainingK))} k€ over-assigned`, cls: "over" };
  }

  return (
    <div className="inv-dropdown-panel">
      <div className="inv-count-tip">
        💡 <strong>{roundName(id)}:</strong> {INV_COUNT_TIPS[id]}
      </div>

      {investors.map((x, i) => {
        const amtK = typeof x.amt === "number" ? x.amt : 0;
        const shareOfRound = roundTotal > 0 ? ((amtK / 1000 / roundTotal) * 100).toFixed(1) : "0.0";
        return (
          <div key={i} style={{ marginBottom: 10 }}>
            <div className="inv-row">
              <select
                className={`inv-sel ${itype(x.type).cls}`}
                value={x.type}
                onChange={(e) => update(i, { type: e.target.value as Investor["type"] })}
                aria-label="Investor type"
              >
                {ITYPES.map((t) => (
                  <option value={t.id} key={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <input
                className="inv-ni"
                type="text"
                placeholder="Investor name"
                value={x.name}
                onChange={(e) => update(i, { name: e.target.value })}
              />
              <input
                className="inv-ai"
                type="number"
                min="0"
                step="5"
                placeholder="k€"
                value={x.amt === "" ? "" : x.amt}
                onChange={(e) => update(i, { amt: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 })}
                aria-label="Ticket size in k€"
              />
              <span className="inv-unit">k€</span>
              <span className="inv-pct" style={{ color: ROUND_DEF_BY_ID[id].color }}>
                {shareOfRound}% of round
              </span>
              <button type="button" className="inv-del" onClick={() => remove(i)} aria-label="Remove investor">
                ✕
              </button>
            </div>
            <div className="ticket-btns">
              {(TICKET_SIZES[id] ?? [25, 50, 100, 250, 500]).map((k) => (
                <button type="button" className="tkt" key={k} onClick={() => update(i, { amt: k })}>
                  {fmtKeur(k)}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {status && <div className={`inv-unassigned ${status.cls}`}>{status.text}</div>}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
        {ITYPES.map((t) => (
          <button type="button" className={`inv-addbtn ${t.cls}`} key={t.id} onClick={() => add(t.id)}>
            + {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
