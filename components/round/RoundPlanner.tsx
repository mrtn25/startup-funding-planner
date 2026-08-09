"use client";

import { useMemo, useState } from "react";
import styles from "./RoundPlanner.module.css";
import {
  BENCH,
  computePlan,
  fmtK,
  initialRoundPlan,
  GOAL_DEFAULTS,
  ROLES,
  STAGE_DEFAULTS,
  SPEND,
  SRC,
  STAGES,
  type AllocationKey,
  type RoleKey,
  type RoundPlanState,
  type SpendKey,
  type Stage,
  type LaneTone,
} from "@/lib/round-planner";

const LANE_TONE: Record<LaneTone, string> = {
  runway: "barRunway",
  hire: "barHire",
  build: "barBuild",
  gtm: "barGtm",
  raise: "barRaise",
  safety: "barSafety",
  gap: "barGap",
};

const ALLOC_COLOR: Record<AllocationKey, string> = {
  team: "#2200FF",
  product: "#0091EA",
  gtm: "#00B5AD",
  admin: "#A8E31E",
  buffer: "#8a8880",
};

type Props = {
  /** Hands the derived amount to the dilution planner and switches to it. */
  onModelDilution?: (amountM: number, stage: Stage) => void;
};

export default function RoundPlanner({ onModelDilution }: Props) {
  const [s, setS] = useState<RoundPlanState>(initialRoundPlan);
  const plan = useMemo(() => computePlan(s), [s]);

  const set = <K extends keyof RoundPlanState>(k: K, v: RoundPlanState[K]) => setS((p) => ({ ...p, [k]: v }));
  const setHire = (k: RoleKey, v: number) => setS((p) => ({ ...p, hires: { ...p.hires, [k]: Math.max(0, v) } }));
  const setSpend = (k: SpendKey, v: number) => setS((p) => ({ ...p, spend: { ...p.spend, [k]: Math.max(0, v) } }));
  const setGoal = <K extends keyof typeof s.goal>(k: K, v: (typeof s.goal)[K]) =>
    setS((p) => ({ ...p, goal: { ...p.goal, [k]: v } }));

  const stage = STAGES.find((x) => x.key === s.stage)!;
  const eff = plan.effective;
  const totalHires = ROLES.reduce((a, r) => a + (eff.hires[r.key] ?? 0), 0);
  // The axis has to show the overrun when the plan ends mid-raise.
  const ganttMax = Math.max(s.targetMonths, s.monthsToMilestone + s.fundraiseMonths) + 1;

  return (
    <section className={styles.root} aria-label="Round planner">
      <header className={styles.head}>
        <h2>How much should you raise?</h2>
        <p>
          Work the number backwards from the milestone the next round will expect: what the team costs, how long it
          takes, and what the plan needs on top for the parts that slip. The output is a round size and a use-of-funds
          breakdown you can put in front of an investor.
        </p>
      </header>

      <div className={styles.label}>Round you&apos;re planning</div>
      <div className={styles.stageBtns} role="group" aria-label="Round">
        {STAGES.map((st) => (
          <button
            key={st.key}
            type="button"
            aria-pressed={s.stage === st.key}
            className={`${styles.stageBtn}${s.stage === st.key ? ` ${styles.stageBtnOn}` : ""}`}
            onClick={() => setS((p) => ({ ...STAGE_DEFAULTS[st.key], mode: p.mode, goal: GOAL_DEFAULTS[st.key], stage: st.key }))}
          >
            {st.label}
          </button>
        ))}
      </div>
      <span className={styles.goal}>What this round has to buy: {stage.goal}</span>

      <div className={styles.modeRow}>
        <div className={styles.modeBtns} role="group" aria-label="Planning direction">
          <button
            type="button"
            aria-pressed={s.mode === "plan"}
            className={`${styles.modeBtn}${s.mode === "plan" ? ` ${styles.modeBtnOn}` : ""}`}
            onClick={() => set("mode", "plan")}
          >
            From the plan
          </button>
          <button
            type="button"
            aria-pressed={s.mode === "goal"}
            className={`${styles.modeBtn}${s.mode === "goal" ? ` ${styles.modeBtnOn}` : ""}`}
            onClick={() => set("mode", "goal")}
          >
            From the goal
          </button>
        </div>
        <p className={styles.modeNote}>
          {s.mode === "plan"
            ? "Means first: you say what team you want, the tool costs it. Honest when you don't yet know your conversion rates well enough for the arithmetic to mean anything."
            : "Goal first: you say what the next round needs to see, the tool derives the selling capacity and headcount that reach it. This is how an FP&A team sizes a plan — and it only works if your ACV, quota and CAC are real numbers."}
        </p>
      </div>

      <div className={styles.layout}>
        <div>
          {s.mode === "goal" && (
            <div className={styles.group}>
              <div className={styles.groupTitle}>Where you want to get to</div>
              <Field label="Recurring revenue today" hint="ARR, k€ per year">
                <input type="number" className={styles.num} min={0} step={10} value={s.goal.currentARR}
                  onChange={(e) => setGoal("currentARR", Math.max(0, +e.target.value))} aria-label="Current ARR" />
                <span className={styles.unit}>k€ ARR</span>
              </Field>
              <Field label="Recurring revenue the next round wants" hint="The number that makes the round fundable">
                <input type="number" className={styles.num} min={0} step={50} value={s.goal.targetARR}
                  onChange={(e) => setGoal("targetARR", Math.max(0, +e.target.value))} aria-label="Target ARR" />
                <span className={styles.unit}>k€ ARR</span>
              </Field>
              <Field label="Average contract value" hint="Annual, per customer">
                <input type="number" className={styles.num} min={1} step={1} value={s.goal.acv}
                  onChange={(e) => setGoal("acv", Math.max(1, +e.target.value))} aria-label="ACV" />
                <span className={styles.unit}>k€ / yr</span>
              </Field>
              <Field label="Quota per rep" hint="What one rep closes per year once productive">
                <input type="number" className={styles.num} min={1} step={25} value={s.goal.quotaPerRep}
                  onChange={(e) => setGoal("quotaPerRep", Math.max(1, +e.target.value))} aria-label="Quota per rep" />
                <span className={styles.unit}>k€ / yr</span>
              </Field>
              <Field label="Cost to acquire a customer" hint="Blended CAC">
                <input type="number" className={styles.num} min={0} step={1} value={s.goal.cac}
                  onChange={(e) => setGoal("cac", Math.max(0, +e.target.value))} aria-label="CAC" />
                <span className={styles.unit}>k€</span>
              </Field>
              <Field label="Engineers per rep" hint="To build what gets sold">
                <input type="number" className={styles.num} min={0} step={0.1} value={s.goal.engPerRep}
                  onChange={(e) => setGoal("engPerRep", Math.max(0, +e.target.value))} aria-label="Engineers per rep" />
                <span className={styles.unit}>×</span>
              </Field>

              <div className={styles.derived}>
                <strong>{fmtK(plan.capacity.netNewARR)} of new ARR</strong> means about{" "}
                {Math.ceil(plan.capacity.customersNeeded)} customers, which needs{" "}
                <strong>{plan.capacity.repsNeeded} reps</strong> (each productive for{" "}
                {plan.capacity.productiveMonths} of the {s.monthsToMilestone} months) and{" "}
                <strong>{plan.capacity.engineersNeeded} engineers</strong> behind them, plus{" "}
                {fmtK(plan.capacity.marketingMonthly)}/mo of pipeline spend. Those numbers replace the hiring plan
                below.
              </div>
            </div>
          )}

          {/* ── Today ── */}
          <div className={styles.group}>
            <div className={styles.groupTitle}>Where you are today</div>
            <Field label="Cash in the bank">
              <input
                type="number"
                className={styles.num}
                min={0}
                step={10}
                value={s.currentCash}
                onChange={(e) => set("currentCash", Math.max(0, +e.target.value))}
                aria-label="Cash in the bank"
              />
              <span className={styles.unit}>k€</span>
            </Field>
            <Field
              label="Net burn today"
              hint="What actually leaves the account each month right now — tools, hosting, legal, any salaries you already pay. If you're two unpaid founders this is genuinely small."
            >
              <input
                type="number"
                className={styles.num}
                min={0}
                step={1}
                value={s.currentBurn}
                onChange={(e) => set("currentBurn", Math.max(0, +e.target.value))}
                aria-label="Current net burn"
              />
              <span className={styles.unit}>k€ / mo</span>
            </Field>
            <Field
              label="Founders on payroll after close"
              hint="Set 0 if you already pay yourselves — it's counted in burn above."
            >
              <div className={styles.stepper}>
                <button type="button" className={styles.stepBtn} onClick={() => set("founders", Math.max(0, s.founders - 1))} aria-label="One fewer founder">
                  −
                </button>
                <span className={styles.stepVal}>{s.founders}</span>
                <button type="button" className={styles.stepBtn} onClick={() => set("founders", s.founders + 1)} aria-label="One more founder">
                  +
                </button>
              </div>
              <input
                type="number"
                className={styles.num}
                min={0}
                step={0.5}
                value={s.founderSalary}
                onChange={(e) => set("founderSalary", Math.max(0, +e.target.value))}
                aria-label="Founder salary"
              />
              <span className={styles.unit}>k€ ea/mo</span>
            </Field>
          </div>

          {/* ── Schedule ── */}
          <div className={styles.group}>
            <div className={styles.groupTitle}>How long things take</div>
            <Field label="Months to the milestone" hint="Until you have what the next round wants to see">
              <input
                type="range"
                className={styles.slider}
                min={3}
                max={30}
                step={1}
                value={s.monthsToMilestone}
                onChange={(e) => set("monthsToMilestone", +e.target.value)}
                aria-label="Months to milestone"
              />
              <span className={styles.unit}>{s.monthsToMilestone} mo</span>
            </Field>
            <Field label="Length of the next raise" hint="First meeting to money in the bank">
              <input
                type="range"
                className={styles.slider}
                min={1}
                max={12}
                step={1}
                value={s.fundraiseMonths}
                onChange={(e) => set("fundraiseMonths", +e.target.value)}
                aria-label="Fundraise months"
              />
              <span className={styles.unit}>{s.fundraiseMonths} mo</span>
            </Field>
          </div>

          {/* ── Horizon ── */}
          <div className={styles.group}>
            <div className={styles.groupTitle}>How long it has to last</div>
            <Field
              label="Runway to buy"
              hint={`Milestone + raise + margin suggests ${plan.timeline.recommendedMonths} months (convention is ${BENCH.runwayMonths[0]}–${BENCH.runwayMonths[1]})`}
            >
              <input
                type="range"
                className={styles.slider}
                min={6}
                max={36}
                step={1}
                value={s.targetMonths}
                onChange={(e) => set("targetMonths", +e.target.value)}
                aria-label="Runway months"
              />
              <span className={styles.unit}>{s.targetMonths} mo</span>
            </Field>
            {s.targetMonths !== plan.timeline.recommendedMonths && (
              <div className={styles.suggest}>
                <button type="button" className={styles.suggestBtn} onClick={() => set("targetMonths", plan.timeline.recommendedMonths)}>
                  Use the suggested {plan.timeline.recommendedMonths} months
                </button>
              </div>
            )}
            <Field label="Hiring ramp" hint="Months until the whole plan is on board">
              <input
                type="range"
                className={styles.slider}
                min={0}
                max={18}
                step={1}
                value={s.rampMonths}
                onChange={(e) => set("rampMonths", +e.target.value)}
                aria-label="Hiring ramp months"
              />
              <span className={styles.unit}>{s.rampMonths} mo</span>
            </Field>
            <Field label="Contingency" hint={`Plans slip; ${BENCH.bufferPct[0] * 100}–${BENCH.bufferPct[1] * 100}% is normal`}>
              <input
                type="range"
                className={styles.slider}
                min={0}
                max={50}
                step={5}
                value={Math.round(s.bufferPct * 100)}
                onChange={(e) => set("bufferPct", +e.target.value / 100)}
                aria-label="Contingency percentage"
              />
              <span className={styles.unit}>{Math.round(s.bufferPct * 100)}%</span>
            </Field>
          </div>

          {/* ── Hires ── */}
          <div className={styles.group}>
            <div className={styles.groupTitle}>
              Who you hire ({totalHires}){s.mode === "goal" ? " — derived from the goal" : ""}
            </div>
            {ROLES.map((r) => (
              <Field key={r.key} label={r.label}>
                <span className={styles.roleCost}>{r.monthly} k€/mo</span>
                <div className={styles.stepper}>
                  <button
                    type="button"
                    className={styles.stepBtn}
                    onClick={() => setHire(r.key, (s.hires[r.key] ?? 0) - 1)}
                    aria-label={`One fewer ${r.label}`}
                  >
                    −
                  </button>
                  <span className={styles.stepVal}>{eff.hires[r.key] ?? 0}</span>
                  <button
                    type="button"
                    className={styles.stepBtn}
                    onClick={() => setHire(r.key, (s.hires[r.key] ?? 0) + 1)}
                    aria-label={`One more ${r.label}`}
                  >
                    +
                  </button>
                </div>
              </Field>
            ))}
          </div>

          {/* ── Non-personnel ── */}
          <div className={styles.group}>
            <div className={styles.groupTitle}>Everything that isn&apos;t salary</div>
            {SPEND.map((k) => (
              <Field key={k.key} label={k.label} hint={k.hint}>
                <input
                  type="number"
                  className={styles.num}
                  min={0}
                  step={1}
                  value={s.spend[k.key] ?? 0}
                  onChange={(e) => setSpend(k.key, +e.target.value)}
                  aria-label={k.label}
                />
                <span className={styles.unit}>k€ / mo</span>
              </Field>
            ))}
          </div>
        </div>

        {/* ── Result ── */}
        <aside className={styles.panel} aria-live="polite">
          <div className={styles.kicker}>Raise</div>
          <div className={styles.raise}>{fmtK(plan.raise)}</div>
          <p className={styles.raiseNote}>
            Funds {s.targetMonths} months of this plan plus a {Math.round(s.bufferPct * 100)}% contingency, less the{" "}
            {fmtK(s.currentCash)} you already hold. Typical {stage.label} round is {plan.typicalRound[0]}–
            {plan.typicalRound[1]} M€.
          </p>

          {plan.alternate !== null && (
            <div className={styles.compare}>
              <div className={styles.compareRow}>
                <span>{s.mode === "goal" ? "From the goal" : "From the plan"}</span>
                <strong>{fmtK(plan.raise)}</strong>
              </div>
              <div className={styles.compareRow}>
                <span>{s.mode === "goal" ? "From the plan" : "From the goal"}</span>
                <strong>{fmtK(plan.alternate)}</strong>
              </div>
              <p className={styles.compareNote}>
                {/* Compare goal against plan explicitly — which of the two is
                    `raise` and which is `alternate` flips with the mode. */}
                {(() => {
                  const goalNum = s.mode === "goal" ? plan.raise : plan.alternate!;
                  const planNum = s.mode === "goal" ? plan.alternate! : plan.raise;
                  const diff = fmtK(Math.abs(goalNum - planNum));
                  if (Math.abs(goalNum - planNum) < 50)
                    return "The two directions agree — the team you want is about the team the target needs.";
                  return goalNum > planNum
                    ? `Reaching the target costs ${diff} more than the team you sketched. Either the goal is out of reach on this plan, or the plan is short of people.`
                    : `The team you sketched costs ${diff} more than the target strictly requires. Fine if it buys optionality — worth knowing that it is a choice.`;
                })()}
              </p>
            </div>
          )}

          <div className={styles.statRow}>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Burn at full team</div>
              <div className={styles.statVal}>{fmtK(plan.steadyBurn)}/mo</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Runway at that burn</div>
              <div className={styles.statVal}>{plan.runwayAtFullBurn.toFixed(0)} mo</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Average burn</div>
              <div className={styles.statVal}>{fmtK(plan.avgBurn)}/mo</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Team share</div>
              <div className={styles.statVal}>{(plan.teamShare * 100).toFixed(0)}%</div>
            </div>
          </div>

          <div className={styles.allocTitle}>Use of funds</div>
          <div className={styles.bar}>
            {plan.allocation.map((a) => (
              <span
                key={a.key}
                className={styles.barSeg}
                style={{ width: `${a.share * 100}%`, background: ALLOC_COLOR[a.key] }}
                title={a.label}
              />
            ))}
          </div>
          <div className={styles.allocList}>
            {plan.allocation.map((a) => (
              <div className={styles.allocRow} key={a.key}>
                <span className={styles.swatch} style={{ background: ALLOC_COLOR[a.key] }} />
                <span className={styles.allocName}>{a.label}</span>
                <span className={styles.allocAmt}>{fmtK(a.amount)}</span>
                <span className={styles.allocPct}>{(a.share * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* ── Timeline ── */}
      <div className={styles.timeline}>
        <h3>When does what happen?</h3>
        <p className={styles.timelineIntro}>
          The round has to outlast the raise that follows it, not end when that raise begins. You hit the milestone,
          <em> then</em> start talking to investors, and the money has to still be there when they take three months to
          decide.
        </p>

        <div className={styles.gantt}>
          {plan.timeline.lanes.map((ln) => (
            <div className={styles.laneRow} key={ln.key}>
              <div className={styles.laneName}>
                {ln.label}
                <span className={styles.laneDetail}>{ln.detail}</span>
              </div>
              <div className={styles.laneTrack}>
                <div
                  className={`${styles.laneBar} ${styles[LANE_TONE[ln.tone]]}`}
                  style={{
                    left: `${(ln.start / ganttMax) * 100}%`,
                    width: `${Math.max(ln.months / ganttMax, 0.01) * 100}%`,
                  }}
                  title={`${ln.label}: month ${ln.start}–${ln.start + ln.months}`}
                />
                {/* Shared guides so the overlaps between lanes are readable. */}
                <span className={styles.guide} style={{ left: `${(plan.timeline.startRaisingAt / ganttMax) * 100}%` }} />
                <span
                  className={`${styles.guide} ${styles.guideEnd}`}
                  style={{ left: `${(plan.timeline.cashOutAt / ganttMax) * 100}%` }}
                />
              </div>
            </div>
          ))}

          <div className={styles.laneRow}>
            <div className={styles.laneName} />
            <div className={styles.ganttAxis}>
              {Array.from({ length: Math.floor(ganttMax / 3) + 1 }, (_, i) => i * 3).map((m) => (
                <span key={m} style={{ left: `${(m / ganttMax) * 100}%` }}>
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.guideKey}>
          <span>
            <i className={styles.guideSwatch} /> start raising · month {plan.timeline.startRaisingAt}
          </span>
          <span>
            <i className={`${styles.guideSwatch} ${styles.guideSwatchEnd}`} /> cash out · month{" "}
            {plan.timeline.cashOutAt}
          </span>
        </div>

        {plan.timeline.conflicts.length > 0 && (
          <div className={styles.conflicts}>
            {plan.timeline.conflicts.map((c, i) => (
              <p key={i} className={c.level === "warn" ? styles.conflictWarn : styles.conflictNote}>
                {c.text}
              </p>
            ))}
          </div>
        )}

        <div className={styles.legend}>
          <span>
            <i className={`${styles.swatch} ${styles.barRunway}`} /> Cash runway
          </span>
          <span>
            <i className={`${styles.swatch} ${styles.barHire}`} /> Hiring ramp
          </span>
          <span>
            <i className={`${styles.swatch} ${styles.barBuild}`} /> Build
          </span>
          <span>
            <i className={`${styles.swatch} ${styles.barRaise}`} /> Raise
          </span>
          <span>
            <i className={`${styles.swatch} ${styles.barSafety}`} /> Margin
          </span>
        </div>
      </div>

      {/* ── Sanity checks ── */}
      <div className={styles.flags}>
        <h3>Does this plan hold up?</h3>
        {plan.flags.map((f, i) => (
          <div
            key={i}
            className={`${styles.flag} ${
              f.level === "warn" ? styles.flagWarn : f.level === "ok" ? styles.flagOk : styles.flagNote
            }`}
          >
            <p className={styles.flagText}>{f.text}</p>
            <div className={styles.flagSrc}>
              {f.sources.map((id) => (
                <a
                  key={id}
                  href={SRC[id][1]}
                  target="_blank"
                  rel="noopener noreferrer"
                  dangerouslySetInnerHTML={{ __html: SRC[id][0] }}
                />
              ))}
            </div>
          </div>
        ))}

        <div className={styles.handoff}>
          You now have a number. What it costs you in ownership is the next question — the Dilution Planner takes{" "}
          <strong>{fmtK(plan.raise)}</strong> and shows the dilution, cap table and exit split.
          {onModelDilution && (
            <div>
              <button
                type="button"
                className={styles.handoffBtn}
                onClick={() => onModelDilution(plan.raise / 1000, s.stage)}
              >
                → Model the dilution on {fmtK(plan.raise)}
              </button>
            </div>
          )}
        </div>
      </div>

      <details className={styles.biblio}>
        <summary>References ({Object.keys(SRC).length} papers)</summary>
        <ol>
          {Object.keys(SRC).map((id) => (
            <li key={id}>
              <a
                href={SRC[id][1]}
                target="_blank"
                rel="noopener noreferrer"
                dangerouslySetInnerHTML={{ __html: SRC[id][0] }}
              />
            </li>
          ))}
        </ol>
        <p className={styles.caveat}>
          The sizing logic comes from the staging literature: a round buys runway to the next point where real
          information arrives, so the amount follows from the milestone rather than the other way round. The contingency
          exists because underestimating time and cost is one of the most replicated findings in behavioural research.
          The salary figures are DACH mid-market defaults you should override, and the runway and contingency ranges are
          conventions rather than measurements. Treat the output as a costed argument for a number, not a forecast.
        </p>
      </details>
    </section>
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
