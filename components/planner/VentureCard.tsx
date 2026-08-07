"use client";

import { useState } from "react";
import {
  getActive,
  roundName,
  FALLBACK_MILESTONES,
  INDUSTRIES,
  MILESTONE_COLORS,
  type IndustryKey,
  type PlannerState,
} from "@/lib/planner";

export type MilestoneGroup = { round: string; milestones: string[] };

type Props = {
  state: PlannerState;
  onPatch: (patch: Partial<PlannerState>) => void;
  onIndustry: (key: IndustryKey) => void;
};

export default function VentureCard({ state, onPatch, onIndustry }: Props) {
  const [milestones, setMilestones] = useState<MilestoneGroup[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [emptyNote, setEmptyNote] = useState(
    'Enter your venture name and description, then click "Suggest with AI".',
  );

  const active = getActive(state);

  // Editing the venture invalidates whatever was generated for the old text.
  const patchVenture = (patch: Partial<PlannerState>) => {
    setMilestones(null);
    setEmptyNote('Click "Suggest with AI" to generate milestones for your current description.');
    onPatch(patch);
  };

  const generate = async () => {
    if (!active.length) {
      setMilestones(null);
      setEmptyNote("Enable at least one financing round first.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.ventureName.trim(),
          description: state.ventureDesc.trim(),
          rounds: active.map((r) => ({ id: r.id, name: roundName(r.id) })),
        }),
      });
      const json = await res.json();
      if (Array.isArray(json?.milestones) && json.milestones.length) {
        setMilestones(json.milestones);
      } else {
        throw new Error("empty response");
      }
    } catch {
      // Same offline fallback the original used when the API was unreachable.
      setMilestones(
        active.map((r) => ({
          round: roundName(r.id),
          milestones: FALLBACK_MILESTONES[r.id] ?? [
            "Validated product-market fit",
            "Demonstrated traction with early users",
          ],
        })),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="sec-label">Your Venture</div>
      <div className="venture-card">
        <div className="venture-row">
          <span className="venture-label">Venture Name</span>
          <input
            className="venture-input"
            type="text"
            placeholder="e.g. GreenShift AI"
            value={state.ventureName}
            onChange={(e) => patchVenture({ ventureName: e.target.value })}
          />
        </div>

        <div className="venture-row" style={{ alignItems: "flex-start" }}>
          <span className="venture-label" style={{ marginTop: 6 }}>
            What it does
          </span>
          <textarea
            className="venture-textarea"
            placeholder="Brief description — e.g. AI-powered carbon accounting platform for SMEs..."
            value={state.ventureDesc}
            onChange={(e) => patchVenture({ ventureDesc: e.target.value })}
          />
        </div>

        <div className="venture-row">
          <span className="venture-label">Industry</span>
          <div className="venture-seg">
            {(Object.entries(INDUSTRIES) as [IndustryKey, (typeof INDUSTRIES)[IndustryKey]][]).map(([key, ind]) => (
              <button
                type="button"
                key={key}
                className={`vsb${state.industry === key ? " active" : ""}`}
                onClick={() => onIndustry(key)}
              >
                {ind.emoji ? `${ind.emoji} ` : ""}
                {ind.label}
              </button>
            ))}
          </div>
        </div>

        <div className="venture-row">
          <span className="venture-label">Founders</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={state.founderCount}
              onChange={(e) => onPatch({ founderCount: +e.target.value })}
              style={{ width: 160, accentColor: "var(--accent)" }}
              aria-label="Number of founders"
            />
            <span style={{ fontSize: 13, fontWeight: 500, minWidth: 24 }}>{state.founderCount}</span>
          </div>
          <span style={{ fontSize: 12, color: "var(--text3)", marginLeft: 4 }}>founders</span>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 24 }}>
            <span style={{ fontSize: 12, color: "var(--text2)" }}>ESOP Pool</span>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={state.esopPct}
              onChange={(e) => onPatch({ esopPct: +e.target.value, industry: "custom" })}
              style={{ width: 120, accentColor: "var(--accent)" }}
              aria-label="ESOP pool percentage"
            />
            <span style={{ fontSize: 13, fontWeight: 500, minWidth: 30 }}>{state.esopPct}%</span>
          </div>
        </div>

        <div className="milestone-wrap">
          <div className="milestone-header">
            <span className="milestone-title">🎯 Milestones &amp; KPIs per Round</span>
            <button type="button" className="milestone-gen-btn" onClick={generate} disabled={busy}>
              {busy ? "Generating…" : "✦ Suggest with AI"}
            </button>
          </div>
          <div className="milestone-list">
            {milestones === null ? (
              <span className="milestone-empty">{emptyNote}</span>
            ) : (
              milestones.flatMap((group) => {
                const col = MILESTONE_COLORS[group.round] ?? { bg: "var(--surface2)", c: "var(--text2)" };
                return group.milestones.map((m, i) => (
                  <div className="milestone-item" key={`${group.round}-${i}`}>
                    <span className="milestone-round" style={{ background: col.bg, color: col.c }}>
                      {group.round}
                    </span>
                    <span className="milestone-text">{m}</span>
                  </div>
                ));
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
