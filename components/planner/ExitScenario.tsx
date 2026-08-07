"use client";

import { deriveExitFields, fmtM, type CalcResult, type PlannerState } from "@/lib/planner";

type Props = {
  state: PlannerState;
  data: CalcResult;
  onPatch: (patch: Partial<PlannerState>) => void;
};

export default function ExitScenario({ state, data, onPatch }: Props) {
  // While linked, the displayed values mirror each other; see deriveExitFields.
  const { exitDirect, exitMultiple } = deriveExitFields(state);
  const { active, lastPostM, exitM, sf } = data;

  const toggleLink = () => {
    const linked = !state.linked;
    if (!linked) {
      onPatch({ linked });
      return;
    }
    // Turning the link on anchors the exit at the last round's post-money.
    onPatch(
      lastPostM
        ? { linked, exitDirect: String(Math.round(lastPostM)), exitMultiple: "1.0", exitLastEdited: "direct" }
        : { linked },
    );
  };

  let note = "—";
  if (!active.length) note = "No active round.";
  else if (state.linked && Math.abs(sf - 1) > 0.01)
    note = `Reverse mode: all amounts scaled → ${fmtM(exitM ?? 0)} exit target.`;
  else if (lastPostM && exitM) note = `Post-money last round: ${fmtM(lastPostM)} → Exit: ${fmtM(exitM)}`;

  return (
    <>
      <div className="sec-label">Exit Scenario</div>
      <div className="card">
        <div className="er">
          <span style={{ fontSize: 12, color: "var(--text2)", minWidth: 110 }}>Exit Valuation</span>
          <input
            type="number"
            min="1"
            step="1"
            style={{ width: 105, textAlign: "right" }}
            placeholder="Mio €"
            value={exitDirect}
            onChange={(e) => onPatch({ exitDirect: e.target.value, exitLastEdited: "direct" })}
          />
          <span style={{ fontSize: 12, color: "var(--text2)" }}>Mio €</span>
          <span style={{ fontSize: 12, color: "var(--text2)", padding: "0 4px" }}>or</span>
          <input
            type="number"
            min="0.1"
            step="0.1"
            style={{ width: 64, textAlign: "right" }}
            value={exitMultiple}
            onChange={(e) => onPatch({ exitMultiple: e.target.value, exitLastEdited: "multiple" })}
          />
          <span style={{ fontSize: 12, color: "var(--text2)" }}>× Post-Money</span>
          <button type="button" className={`lb${state.linked ? " on" : ""}`} onClick={toggleLink}>
            <span>{state.linked ? "●" : "○"}</span> <span>{state.linked ? "Linked" : "Link to last round"}</span>
          </button>
        </div>
        <div className="en">{note}</div>
      </div>
    </>
  );
}
