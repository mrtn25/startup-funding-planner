/* ══════════════════════════════════════════════════════════════
   Round Planner — how much to raise, and what it buys.

   The tool the other three were missing a link to: the Funding
   Planner asks you to type an investment amount, but nothing helps
   you derive it. This works the amount out backwards from the
   milestone the next round will expect.

   The logic is the staging literature's, not a rule of thumb:

   - A round exists to buy the runway to the next point where real
     information arrives. Gompers (1995) shows rounds are sized to
     that point, and Sahlman (1990) frames staged capital as the
     control mechanism itself. So the input is a milestone and a
     team plan, not a target number.
   - Plans slip, systematically and in one direction. The planning
     fallacy is one of the most replicated findings in the field,
     and founders are measurably overconfident about their own
     odds — so a contingency is part of the plan, not padding.
   - Most of the money is people. Headcount growth around financing
     events is the documented use of proceeds.
   ══════════════════════════════════════════════════════════════ */

export type Stage = "preseed" | "seed" | "seriesa" | "seriesb";

export const STAGES: { key: Stage; label: string; goal: string }[] = [
  { key: "preseed", label: "Pre-Seed", goal: "Get to a product people use and a repeatable first channel." },
  { key: "seed", label: "Seed", goal: "Get to evidence of product-market fit and early revenue." },
  { key: "seriesa", label: "Series A", goal: "Get to a repeatable, measurable go-to-market motion." },
  { key: "seriesb", label: "Series B", goal: "Get to scalable, efficient growth with proven unit economics." },
];

export type RoleKey = "eng" | "product" | "design" | "sales" | "marketing" | "ops";

/**
 * Fully-loaded monthly cost per hire in k€ — gross salary plus employer
 * contributions, equipment and desk. DACH mid-market levels; the tool lets
 * you override, because these swing hard by country and seniority.
 */
export const ROLES: { key: RoleKey; label: string; monthly: number; bucket: AllocationKey }[] = [
  { key: "eng", label: "Engineering", monthly: 8.5, bucket: "team" },
  { key: "product", label: "Product", monthly: 8.0, bucket: "team" },
  { key: "design", label: "Design", monthly: 7.0, bucket: "team" },
  { key: "sales", label: "Sales", monthly: 7.5, bucket: "team" },
  { key: "marketing", label: "Marketing", monthly: 6.5, bucket: "team" },
  { key: "ops", label: "Ops & Finance", monthly: 6.0, bucket: "team" },
];

export const ROLE_BY_KEY = Object.fromEntries(ROLES.map((r) => [r.key, r])) as Record<RoleKey, (typeof ROLES)[number]>;

export type SpendKey = "marketing" | "infra" | "tooling" | "legal" | "other";

export const SPEND: { key: SpendKey; label: string; hint: string; bucket: AllocationKey }[] = [
  { key: "marketing", label: "Marketing & demand gen", hint: "Paid acquisition, content, events", bucket: "gtm" },
  { key: "infra", label: "Infrastructure", hint: "Cloud, data, third-party APIs", bucket: "product" },
  { key: "tooling", label: "Software & tooling", hint: "Per-seat SaaS, licences", bucket: "product" },
  { key: "legal", label: "Legal, accounting & admin", hint: "Advisors, audit, office", bucket: "admin" },
  { key: "other", label: "Other", hint: "Anything not covered above", bucket: "admin" },
];

/** The use-of-funds buckets an investor expects to see. */
export type AllocationKey = "team" | "product" | "gtm" | "admin" | "buffer";

export const ALLOCATION_LABEL: Record<AllocationKey, string> = {
  team: "Team (existing + new hires)",
  product: "Product & infrastructure",
  gtm: "Go-to-market",
  admin: "Operations & admin",
  buffer: "Contingency",
};

/* ── Benchmarks ──────────────────────────────────────────────── */

/**
 * Ranges to compare a plan against. The runway and contingency ranges are
 * conventions rather than measurements — stated as such in the UI. The
 * personnel share is the one with real reporting behind it for software
 * companies, where people are the dominant cost line.
 */
export const BENCH = {
  runwayMonths: [18, 24] as [number, number],
  bufferPct: [0.2, 0.3] as [number, number],
  teamShare: [0.6, 0.75] as [number, number],
};

/** Typical round sizes in M€, for a sanity check against the derived number. */
export const TYPICAL_ROUND: Record<Stage, [number, number]> = {
  preseed: [0.3, 1.0],
  seed: [1.0, 4.0],
  seriesa: [5.0, 15.0],
  seriesb: [15.0, 40.0],
};

/* ── Sources ─────────────────────────────────────────────────── */

const scholar = (t: string) => `https://scholar.google.com/scholar?q=${encodeURIComponent(t)}`;

export const SRC: Record<string, [string, string]> = {
  gompers95: [
    "Gompers (1995). Optimal investment, monitoring, and the staging of venture capital. <em>Journal of Finance</em> 50(5), 1461–1489.",
    scholar("Optimal investment monitoring and the staging of venture capital Gompers"),
  ],
  sahlman90: [
    "Sahlman (1990). The structure and governance of venture-capital organizations. <em>Journal of Financial Economics</em> 27(2), 473–521.",
    scholar("The structure and governance of venture-capital organizations Sahlman"),
  ],
  bergemann98: [
    "Bergemann & Hege (1998). Venture capital financing, moral hazard, and learning. <em>Journal of Banking &amp; Finance</em> 22(6–8), 703–735.",
    scholar("Venture capital financing moral hazard and learning Bergemann Hege"),
  ],
  buehler94: [
    "Buehler, Griffin & Ross (1994). Exploring the “planning fallacy”: why people underestimate their task completion times. <em>Journal of Personality and Social Psychology</em> 67(3), 366–381.",
    scholar("Exploring the planning fallacy why people underestimate their task completion times"),
  ],
  cooper88: [
    "Cooper, Woo & Dunkelberg (1988). Entrepreneurs' perceived chances for success. <em>Journal of Business Venturing</em> 3(2), 97–108.",
    scholar("Entrepreneurs perceived chances for success Cooper Woo Dunkelberg"),
  ],
  astebro14: [
    "Åstebro, Herz, Nanda & Weber (2014). Seeking the roots of entrepreneurship: insights from behavioral economics. <em>Journal of Economic Perspectives</em> 28(3), 49–70.",
    scholar("Seeking the roots of entrepreneurship insights from behavioral economics"),
  ],
  ewens18: [
    "Ewens, Nanda & Rhodes-Kropf (2018). Cost of experimentation and the evolution of venture capital. <em>Journal of Financial Economics</em> 128(3), 422–442.",
    scholar("Cost of experimentation and the evolution of venture capital"),
  ],
  kerr14: [
    "Kerr, Nanda & Rhodes-Kropf (2014). Entrepreneurship as experimentation. <em>Journal of Economic Perspectives</em> 28(3), 25–48.",
    scholar("Entrepreneurship as experimentation Kerr Nanda Rhodes-Kropf"),
  ],
  sarasvathy01: [
    "Sarasvathy (2001). Causation and effectuation: toward a theoretical shift from economic inevitability to entrepreneurial contingency. <em>Academy of Management Review</em> 26(2), 243–263.",
    scholar("Causation and effectuation toward a theoretical shift from economic inevitability to entrepreneurial contingency"),
  ],
  read09: [
    "Read, Song & Smit (2009). A meta-analytic review of effectuation and venture performance. <em>Journal of Business Venturing</em> 24(6), 573–587.",
    scholar("A meta-analytic review of effectuation and venture performance"),
  ],
  wiltbank06: [
    "Wiltbank, Dew, Read & Sarasvathy (2006). What to do next? The case for non-predictive strategy. <em>Strategic Management Journal</em> 27(10), 981–998.",
    scholar("What to do next the case for non-predictive strategy"),
  ],
  brinckmann10: [
    "Brinckmann, Grichnik & Kapsa (2010). Should entrepreneurs plan or just storm the castle? A meta-analysis on contextual factors impacting the business planning–performance relationship. <em>Journal of Business Venturing</em> 25(1), 24–40.",
    scholar("Should entrepreneurs plan or just storm the castle meta-analysis business planning performance"),
  ],
  delmar03: [
    "Delmar & Shane (2003). Does business planning facilitate the development of new ventures? <em>Strategic Management Journal</em> 24(12), 1165–1185.",
    scholar("Does business planning facilitate the development of new ventures"),
  ],
  davila03: [
    "Davila, Foster & Gupta (2003). Venture capital financing and the growth of startup firms. <em>Journal of Business Venturing</em> 18(6), 689–708.",
    scholar("Venture capital financing and the growth of startup firms Davila Foster Gupta"),
  ],
};

/* ── State ───────────────────────────────────────────────────── */

/**
 * Two ways to arrive at a number, and the tool runs both.
 *
 * `plan` is means-first: here is the team I want, here is what it costs.
 * `goal` is goal-first: here is the metric the next round wants, here is the
 * capacity that reaches it. Sarasvathy's distinction between effectuation and
 * causation — and the reason both are offered is that the evidence cuts both
 * ways. Expert entrepreneurs work from means under genuine uncertainty; the
 * planning meta-analyses find formal planning does help on average. Which one
 * is honest depends on whether you actually know your conversion rates yet.
 */
export type PlanMode = "plan" | "goal";

/**
 * What the next round actually gates on. Revenue is the dominant gate for
 * B2B software from Seed onward, but it is the wrong question at pre-seed and
 * for anything where the risk is technical rather than commercial — there the
 * milestone is a shipped product or a working proof, and no revenue-capacity
 * arithmetic applies.
 */
export type MilestoneKind = "revenue" | "users" | "product";

export const MILESTONE_KINDS: { key: MilestoneKind; label: string; note: string }[] = [
  {
    key: "revenue",
    label: "Revenue",
    note: "The dominant gate for B2B software from Seed onward. Capacity is derivable: contract value, quota and CAC turn a target into headcount.",
  },
  {
    key: "users",
    label: "Users & engagement",
    note: "Consumer and bottom-up products, where the round gates on adoption and retention rather than booked revenue.",
  },
  {
    key: "product",
    label: "Product or technical proof",
    note: "Pre-seed and deep tech, where the risk is whether the thing works at all. There is no capacity model here — the goal converts to engineering months, and little else.",
  },
];

export type GoalState = {
  kind: MilestoneKind;
  /** Recurring revenue today, k€ per year. */
  currentARR: number;
  /** What the next round needs to see, k€ per year. */
  targetARR: number;
  /** Average contract value, k€ per year. */
  acv: number;
  /** What one rep closes per year once productive, k€. */
  quotaPerRep: number;
  /** Blended cost to acquire one customer, k€. */
  cac: number;
  /** Engineers carried per sales rep, to build what gets sold. */
  engPerRep: number;

  /** Users milestone. */
  currentUsers: number;
  targetUsers: number;
  /** Blended cost to acquire one user, €. */
  cpa: number;

  /** Product milestone: engineer-months to build the thing. */
  engMonths: number;
};

export type RoundPlanState = {
  mode: PlanMode;
  goal: GoalState;
  stage: Stage;
  /** Cash in the bank today, k€. */
  currentCash: number;
  /** Net burn today, k€ per month, before any new hires. */
  currentBurn: number;
  /** Founders who will draw a salary once the round closes. */
  founders: number;
  /** Salary per founder, k€ per month, from close. Often 0 before a round. */
  founderSalary: number;
  /** How long the plan takes to reach the milestone the next round expects. */
  monthsToMilestone: number;
  /** How long raising the next round takes, first meeting to money in. */
  fundraiseMonths: number;
  /** Months of runway the round should buy. */
  targetMonths: number;
  /** Contingency on top of the plan, as a fraction. */
  bufferPct: number;
  /** Months until the whole hiring plan is on board. */
  rampMonths: number;
  hires: Record<RoleKey, number>;
  /** Non-personnel spend, k€ per month at full ramp. */
  spend: Record<SpendKey, number>;
};

/**
 * Sensible starting points per stage. Pre-seed matters most here: two
 * founders paying themselves nothing genuinely do burn almost nothing, so a
 * seed-shaped default made the tool read as nonsense at that stage.
 */
export const STAGE_DEFAULTS: Record<Stage, Omit<RoundPlanState, "stage" | "mode" | "goal">> = {
  preseed: {
    currentCash: 20,
    currentBurn: 2,
    founders: 2,
    founderSalary: 3.5,
    monthsToMilestone: 9,
    fundraiseMonths: 4,
    targetMonths: 15,
    bufferPct: 0.25,
    rampMonths: 4,
    hires: { eng: 1, product: 0, design: 0, sales: 0, marketing: 0, ops: 0 },
    spend: { marketing: 1, infra: 1, tooling: 0.5, legal: 1, other: 0.5 },
  },
  seed: {
    currentCash: 150,
    currentBurn: 8,
    founders: 2,
    founderSalary: 6,
    monthsToMilestone: 12,
    fundraiseMonths: 5,
    targetMonths: 18,
    bufferPct: 0.25,
    rampMonths: 6,
    hires: { eng: 3, product: 1, design: 0, sales: 1, marketing: 1, ops: 0 },
    spend: { marketing: 8, infra: 4, tooling: 2, legal: 3, other: 2 },
  },
  seriesa: {
    currentCash: 800,
    currentBurn: 60,
    founders: 2,
    founderSalary: 9,
    monthsToMilestone: 14,
    fundraiseMonths: 5,
    targetMonths: 20,
    bufferPct: 0.25,
    rampMonths: 8,
    hires: { eng: 8, product: 2, design: 2, sales: 4, marketing: 2, ops: 2 },
    spend: { marketing: 40, infra: 15, tooling: 8, legal: 8, other: 6 },
  },
  seriesb: {
    currentCash: 3000,
    currentBurn: 220,
    founders: 2,
    founderSalary: 12,
    monthsToMilestone: 15,
    fundraiseMonths: 6,
    targetMonths: 21,
    bufferPct: 0.25,
    rampMonths: 9,
    hires: { eng: 15, product: 4, design: 3, sales: 12, marketing: 5, ops: 4 },
    spend: { marketing: 120, infra: 40, tooling: 20, legal: 15, other: 12 },
  },
};

export const GOAL_DEFAULTS: Record<Stage, GoalState> = {
  // Pre-seed defaults to a product milestone, because that is what pre-seed
  // rounds actually gate on.
  preseed: { kind: "product", currentARR: 0, targetARR: 150, acv: 12, quotaPerRep: 250, cac: 4, engPerRep: 2, currentUsers: 0, targetUsers: 2000, cpa: 8, engMonths: 24 },
  seed: { kind: "revenue", currentARR: 120, targetARR: 1000, acv: 20, quotaPerRep: 400, cac: 6, engPerRep: 1.5, currentUsers: 2000, targetUsers: 25000, cpa: 6, engMonths: 48 },
  seriesa: { kind: "revenue", currentARR: 1200, targetARR: 5000, acv: 35, quotaPerRep: 550, cac: 10, engPerRep: 1.2, currentUsers: 25000, targetUsers: 150000, cpa: 5, engMonths: 120 },
  seriesb: { kind: "revenue", currentARR: 6000, targetARR: 20000, acv: 55, quotaPerRep: 700, cac: 16, engPerRep: 1, currentUsers: 150000, targetUsers: 600000, cpa: 4, engMonths: 240 },
};

export function initialRoundPlan(stage: Stage = "seed"): RoundPlanState {
  return { ...STAGE_DEFAULTS[stage], mode: "plan", goal: GOAL_DEFAULTS[stage], stage };
}

/* ── Goal-first capacity model ───────────────────────────────── */

export type Capacity = {
  kind: MilestoneKind;
  /** Human-readable one-liner for whichever milestone kind is active. */
  summary: string;
  netNewARR: number;
  customersNeeded: number;
  repsNeeded: number;
  engineersNeeded: number;
  /** Monthly marketing spend implied by CAC × customers over the horizon. */
  marketingMonthly: number;
  /** Months a rep is actually productive, after ramping. */
  productiveMonths: number;
  /** Net burn per € of new recurring revenue. The capital-efficiency check. */
  burnMultiple: number;
};

/** A rep is not productive on day one; three months is the usual assumption. */
const REP_RAMP_MONTHS = 3;

/**
 * The way an FP&A team actually sizes a plan: start from the revenue the next
 * round expects, convert it into selling capacity and pipeline spend, and let
 * headcount fall out of that. This is the causal direction — it only works
 * when you know your ACV, quota and CAC well enough for the arithmetic to
 * mean anything, which is exactly the condition early companies fail.
 */
export function computeCapacity(s: RoundPlanState, planCost: number): Capacity {
  const g = s.goal;
  const productiveMonths = Math.max(1, s.monthsToMilestone - REP_RAMP_MONTHS);

  if (g.kind === "revenue") {
    const netNewARR = Math.max(0, g.targetARR - g.currentARR);
    const customersNeeded = g.acv > 0 ? netNewARR / g.acv : 0;
    const perRep = (g.quotaPerRep / 12) * productiveMonths;
    const repsNeeded = perRep > 0 ? Math.ceil(netNewARR / perRep) : 0;
    return {
      kind: "revenue",
      netNewARR,
      customersNeeded,
      repsNeeded,
      engineersNeeded: Math.max(1, Math.round(repsNeeded * g.engPerRep)),
      marketingMonthly: s.monthsToMilestone > 0 ? (customersNeeded * g.cac) / s.monthsToMilestone : 0,
      productiveMonths,
      burnMultiple: netNewARR > 0 ? planCost / netNewARR : Infinity,
      summary: `${Math.round(netNewARR)} k€ of new ARR ≈ ${Math.ceil(customersNeeded)} customers`,
    };
  }

  if (g.kind === "users") {
    // Acquisition-led: the money goes into the channel, not into quota.
    const newUsers = Math.max(0, g.targetUsers - g.currentUsers);
    const acquisitionCost = (newUsers * g.cpa) / 1000; // € → k€
    return {
      kind: "users",
      netNewARR: 0,
      customersNeeded: newUsers,
      repsNeeded: 0,
      engineersNeeded: Math.max(2, Math.ceil(newUsers / 15000) + 1),
      marketingMonthly: s.monthsToMilestone > 0 ? acquisitionCost / s.monthsToMilestone : 0,
      productiveMonths,
      burnMultiple: Infinity,
      summary: `${newUsers.toLocaleString("en")} new users at ${g.cpa} € each`,
    };
  }

  /* Product milestone: there is no capacity arithmetic to do. The goal
     converts into engineering months and stops — which is the honest answer,
     and the reason the two directions cannot disagree by much here. */
  const engineersNeeded = s.monthsToMilestone > 0 ? Math.max(1, Math.ceil(g.engMonths / s.monthsToMilestone)) : 1;
  return {
    kind: "product",
    netNewARR: 0,
    customersNeeded: 0,
    repsNeeded: 0,
    engineersNeeded,
    marketingMonthly: 0,
    productiveMonths,
    burnMultiple: Infinity,
    summary: `${g.engMonths} engineer-months over ${s.monthsToMilestone} months`,
  };
}

/** The hires and spend the goal implies, replacing the hand-made plan. */
export function goalDrivenState(s: RoundPlanState): RoundPlanState {
  const cap = computeCapacity(s, 0);
  return {
    ...s,
    hires: {
      ...s.hires,
      sales: cap.repsNeeded,
      eng: cap.engineersNeeded,
      marketing: cap.kind === "product" ? 0 : Math.max(1, Math.ceil(Math.max(cap.repsNeeded, 1) / 3)),
    },
    spend: { ...s.spend, marketing: Math.round(cap.marketingMonthly * 10) / 10 },
  };
}

/**
 * What the hand-made plan can actually deliver, in the units of the goal.
 * This is the other half of the reconciliation: the top-down number says what
 * the target costs, this says what the team you sketched can reach. Where the
 * two meet is the plan.
 */
export function planReach(s: RoundPlanState): { value: number; label: string } | null {
  const g = s.goal;
  const productiveMonths = Math.max(1, s.monthsToMilestone - REP_RAMP_MONTHS);

  if (g.kind === "revenue") {
    const reps = s.hires.sales ?? 0;
    const reach = g.currentARR + reps * (g.quotaPerRep / 12) * productiveMonths;
    return { value: Math.round(reach), label: `${Math.round(reach)} k€ ARR` };
  }
  if (g.kind === "users") {
    const spend = (s.spend.marketing ?? 0) * s.monthsToMilestone * 1000; // k€ → €
    const reach = g.currentUsers + (g.cpa > 0 ? spend / g.cpa : 0);
    return { value: Math.round(reach), label: `${Math.round(reach).toLocaleString("en")} users` };
  }
  const engMonths = (s.hires.eng ?? 0) * s.monthsToMilestone;
  return { value: engMonths, label: `${engMonths} engineer-months` };
}

/* ── Model ───────────────────────────────────────────────────── */

export type Allocation = { key: AllocationKey; label: string; amount: number; share: number };

export type Flag = { level: "warn" | "note" | "ok"; text: string; sources: string[] };

export type LaneTone = "runway" | "hire" | "build" | "gtm" | "raise" | "safety" | "gap";

export type Lane = {
  key: string;
  label: string;
  detail: string;
  start: number;
  months: number;
  tone: LaneTone;
};

export type Conflict = { level: "warn" | "note"; text: string };

export type Timeline = {
  lanes: Lane[];
  conflicts: Conflict[];
  /** Month at which the next raise should start. */
  startRaisingAt: number;
  /** Month the money runs out. */
  cashOutAt: number;
  /** Runway this plan actually needs: milestone + raise + a safety margin. */
  recommendedMonths: number;
  /** True when the money runs out before the next round could close. */
  raisesOnFumes: boolean;
};

export type RoundPlan = {
  /** The state actually costed — derived from the goal when in goal mode. */
  effective: RoundPlanState;
  capacity: Capacity;
  /** What the other planning direction says, for comparison. */
  alternate: number | null;
  /** Both sides of the reconciliation, in goal units and in euros. */
  converge: {
    goalRaise: number;
    planRaise: number;
    gap: number;
    /** What the target demands, in goal units. */
    targetLabel: string;
    /** What the sketched plan can actually deliver, same units. */
    reachLabel: string;
    reachValue: number;
    targetValue: number;
    agreed: boolean;
  } | null;
  timeline: Timeline;
  founderCost: number;
  /** k€ per month once every hire has landed. */
  steadyBurn: number;
  /** k€ per month averaged across the plan, accounting for the ramp. */
  avgBurn: number;
  hireMonthly: number;
  spendMonthly: number;
  /** Total spend over the planned months, before contingency. */
  planCost: number;
  buffer: number;
  /** What to raise, k€. */
  raise: number;
  /** Months the raise plus existing cash funds at full-team burn. */
  runwayAtFullBurn: number;
  allocation: Allocation[];
  teamShare: number;
  flags: Flag[];
  typicalRound: [number, number];
};

export function computePlan(input: RoundPlanState, withAlternate = true): RoundPlan {
  // In goal mode the headcount and pipeline spend are derived, not entered.
  const s = input.mode === "goal" ? goalDrivenState(input) : input;
  const hireMonthly = ROLES.reduce((a, r) => a + (s.hires[r.key] ?? 0) * r.monthly, 0);
  const spendMonthly = SPEND.reduce((a, k) => a + (s.spend[k.key] ?? 0), 0);
  // Founders start drawing a salary the day the money lands, so unlike hires
  // this is not ramped. It is the line pre-seed founders most often forget.
  const founderCost = s.founders * s.founderSalary;
  const steadyBurn = s.currentBurn + founderCost + hireMonthly + spendMonthly;

  /*
   * Hires land over the ramp rather than on day one, so the plan costs less
   * than months × steady burn. Summed month by month rather than with a
   * closed form — it stays readable and handles ramp > horizon.
   */
  let planCost = 0;
  for (let m = 1; m <= s.targetMonths; m++) {
    const rampFactor = s.rampMonths > 0 ? Math.min(1, m / s.rampMonths) : 1;
    planCost += s.currentBurn + founderCost + spendMonthly + hireMonthly * rampFactor;
  }
  const avgBurn = s.targetMonths > 0 ? planCost / s.targetMonths : 0;

  const buffer = planCost * s.bufferPct;
  // Cash already in the bank counts toward the plan, so it reduces the ask.
  const raise = Math.max(0, planCost + buffer - s.currentCash);
  const runwayAtFullBurn = steadyBurn > 0 ? (raise + s.currentCash) / steadyBurn : 0;

  // Allocation is of the raise, so the buffer shows as its own line — an
  // investor should see the contingency rather than have it hidden in the
  // operating lines.
  const byBucket: Record<AllocationKey, number> = { team: 0, product: 0, gtm: 0, admin: 0, buffer: 0 };
  // The burn you already carry is overwhelmingly the existing team, and it has
  // to appear somewhere or the buckets won't reconcile to the raise.
  byBucket.team += (s.currentBurn + founderCost) * s.targetMonths;
  ROLES.forEach((r) => {
    const months = rampAdjustedMonths(s, r.key);
    byBucket[r.bucket] += (s.hires[r.key] ?? 0) * r.monthly * months;
  });
  SPEND.forEach((k) => (byBucket[k.bucket] += (s.spend[k.key] ?? 0) * s.targetMonths));
  byBucket.buffer = buffer;
  // Existing cash offsets the operating lines proportionally.
  const operating = planCost;
  const scale = operating > 0 ? Math.max(0, (raise - buffer)) / operating : 0;
  (Object.keys(byBucket) as AllocationKey[]).forEach((k) => {
    if (k !== "buffer") byBucket[k] *= scale;
  });

  const total = Object.values(byBucket).reduce((a, b) => a + b, 0) || 1;
  const allocation: Allocation[] = (Object.keys(byBucket) as AllocationKey[])
    .map((k) => ({ key: k, label: ALLOCATION_LABEL[k], amount: byBucket[k], share: byBucket[k] / total }))
    .filter((a) => a.amount > 0.01)
    .sort((a, b) => b.amount - a.amount);

  const operatingTotal = total - byBucket.buffer || 1;
  const teamShare = byBucket.team / operatingTotal;

  const timeline = buildTimeline(s);
  const capacity = computeCapacity(s, planCost);

  // The other direction's answer, so the two can be read against each other.
  const alternate = withAlternate
    ? computePlan({ ...input, mode: input.mode === "goal" ? "plan" : "goal" }, false).raise
    : null;

  const converge = withAlternate ? buildConvergence(input, raise, alternate) : null;

  return {
    effective: s,
    capacity,
    alternate,
    converge,
    timeline,
    founderCost,
    steadyBurn,
    avgBurn,
    hireMonthly,
    spendMonthly,
    planCost,
    buffer,
    raise,
    runwayAtFullBurn,
    allocation,
    teamShare,
    flags: buildFlags(s, { raise, runwayAtFullBurn, teamShare, timeline, capacity }),
    typicalRound: TYPICAL_ROUND[s.stage],
  };
}

/**
 * Turns the plan into a schedule. This is the part that answers "when do I
 * start raising again": you begin the next raise once the milestone is in
 * hand, and the money has to outlast the raise itself — not end when it
 * starts. The safety margin is what's left over.
 */
export function buildTimeline(s: RoundPlanState): Timeline {
  const startRaisingAt = s.monthsToMilestone;
  const closeAt = startRaisingAt + s.fundraiseMonths;
  const recommendedMonths = Math.ceil(closeAt + 3);
  const raisesOnFumes = s.targetMonths < closeAt;

  /*
   * One lane per workstream rather than one track, because these genuinely
   * run in parallel — you are hiring while building while starting to raise.
   * Stacking them is the only way the overlaps are visible, and the overlaps
   * are the part worth looking at.
   */
  const lanes: Lane[] = [
    {
      key: "runway",
      label: "Cash runway",
      detail: `${s.targetMonths} months funded`,
      start: 0,
      months: s.targetMonths,
      tone: "runway",
    },
    {
      key: "hire",
      label: "Hiring ramp",
      detail: `team fully on board by month ${s.rampMonths}`,
      start: 0,
      months: Math.max(s.rampMonths, 0.5),
      tone: "hire",
    },
    {
      key: "build",
      label: "Build to the milestone",
      detail: `milestone in hand at month ${s.monthsToMilestone}`,
      start: 0,
      months: s.monthsToMilestone,
      tone: "build",
    },
    {
      key: "raise",
      label: "Raise the next round",
      detail: `month ${startRaisingAt} to ${closeAt}`,
      start: startRaisingAt,
      months: s.fundraiseMonths,
      tone: "raise",
    },
  ];

  if (!raisesOnFumes && s.targetMonths > closeAt) {
    lanes.push({
      key: "safety",
      label: "Safety margin",
      detail: `${(s.targetMonths - closeAt).toFixed(0)} months spare after close`,
      start: closeAt,
      months: s.targetMonths - closeAt,
      tone: "safety",
    });
  }
  if (raisesOnFumes) {
    lanes.push({
      key: "gap",
      label: "Funding gap",
      detail: `${(closeAt - s.targetMonths).toFixed(0)} months with no cash`,
      start: s.targetMonths,
      months: closeAt - s.targetMonths,
      tone: "gap",
    });
  }

  /* Overlaps that mean something, rather than every intersection. */
  const conflicts: Conflict[] = [];
  if (raisesOnFumes) {
    conflicts.push({
      level: "warn",
      text: `The raise lane runs past the end of the runway lane — you are out of cash for ${(closeAt - s.targetMonths).toFixed(0)} months before the round could close.`,
    });
  }
  if (s.rampMonths > s.monthsToMilestone) {
    conflicts.push({
      level: "warn",
      text: `The hiring ramp finishes after the milestone. You would be paying for a team that arrives too late to have produced the thing you are raising on.`,
    });
  }
  if (s.fundraiseMonths >= s.monthsToMilestone && s.monthsToMilestone > 0) {
    conflicts.push({
      level: "note",
      text: `Raising takes about as long as building the milestone. Worth starting investor conversations early — advice-first, before you need the money.`,
    });
  }

  return { lanes, conflicts, startRaisingAt, cashOutAt: s.targetMonths, recommendedMonths, raisesOnFumes };
}

/**
 * The two directions are independent estimates of the same quantity, so a gap
 * between them means one of the inputs is wrong — not that one method is.
 * Closing it is the planning work: either the target comes down or the plan
 * gets bigger.
 */
function buildConvergence(input: RoundPlanState, raise: number, alternate: number | null) {
  if (alternate === null) return null;
  const goalRaise = input.mode === "goal" ? raise : alternate;
  const planRaise = input.mode === "goal" ? alternate : raise;

  const g = input.goal;
  const targetValue =
    g.kind === "revenue" ? g.targetARR : g.kind === "users" ? g.targetUsers : g.engMonths;
  const targetLabel =
    g.kind === "revenue"
      ? `${g.targetARR} k€ ARR`
      : g.kind === "users"
        ? `${g.targetUsers.toLocaleString("en")} users`
        : `${g.engMonths} engineer-months`;

  // Reach is measured against the hand-made plan, whichever mode is showing.
  const reach = planReach({ ...input, mode: "plan" }) ?? { value: 0, label: "—" };

  return {
    goalRaise,
    planRaise,
    gap: goalRaise - planRaise,
    targetLabel,
    targetValue,
    reachLabel: reach.label,
    reachValue: reach.value,
    agreed: Math.abs(goalRaise - planRaise) < Math.max(50, goalRaise * 0.05),
  };
}

/** Average months a role is on payroll across the horizon, given the ramp. */
function rampAdjustedMonths(s: RoundPlanState, _role: RoleKey): number {
  let months = 0;
  for (let m = 1; m <= s.targetMonths; m++) {
    months += s.rampMonths > 0 ? Math.min(1, m / s.rampMonths) : 1;
  }
  return months;
}

function buildFlags(
  s: RoundPlanState,
  d: { raise: number; runwayAtFullBurn: number; teamShare: number; timeline: Timeline; capacity: Capacity },
): Flag[] {
  const flags: Flag[] = [];
  const [rLo, rHi] = BENCH.runwayMonths;
  const t = d.timeline;

  /* The schedule check comes first, because it is the one that actually
     bites: a plan can sit inside the 18–24 month convention and still run
     out of money halfway through the next raise. */
  if (t.raisesOnFumes) {
    flags.push({
      level: "warn",
      text: `The money runs out in month ${s.targetMonths}, but the next round would not close until month ${t.startRaisingAt + s.fundraiseMonths} — you would be raising on fumes, which is when terms get worst. ${t.recommendedMonths} months of runway covers the milestone, the raise and a margin.`,
      sources: ["gompers95", "sahlman90"],
    });
  } else if (s.targetMonths - (t.startRaisingAt + s.fundraiseMonths) < 2) {
    flags.push({
      level: "note",
      text: `The round closes with under two months to spare. Raises slip more often than they run early, so a little more margin here is cheap insurance.`,
      sources: ["buehler94", "gompers95"],
    });
  } else {
    flags.push({
      level: "ok",
      text: `You hit the milestone in month ${t.startRaisingAt}, start raising then, and close in month ${t.startRaisingAt + s.fundraiseMonths} with ${(s.targetMonths - t.startRaisingAt - s.fundraiseMonths).toFixed(0)} months of margin.`,
      sources: ["gompers95"],
    });
  }

  if (d.runwayAtFullBurn > rHi + 8) {
    flags.push({
      level: "note",
      text: `${d.runwayAtFullBurn.toFixed(0)} months is well past the usual ${rLo}–${rHi}. Raising more than the next milestone needs costs dilution now for information you don't have yet; the cheaper-experimentation literature argues for raising less, more often.`,
      sources: ["ewens18", "kerr14"],
    });
  } else {
    flags.push({
      level: "ok",
      text: `Funds ${d.runwayAtFullBurn.toFixed(0)} months at full-team burn, inside the ${rLo}–${rHi} month convention.`,
      sources: ["gompers95"],
    });
  }

  if (s.bufferPct < 0.15) {
    flags.push({
      level: "warn",
      text: `A ${(s.bufferPct * 100).toFixed(0)}% contingency is thin. Underestimating time and cost is one of the most replicated findings in behavioural research, and founders are measurably overconfident about their own odds — budget for the slip rather than discovering it.`,
      sources: ["buehler94", "cooper88", "astebro14"],
    });
  }

  const [tLo, tHi] = BENCH.teamShare;
  if (d.teamShare > tHi + 0.1) {
    flags.push({
      level: "note",
      text: `Team is ${(d.teamShare * 100).toFixed(0)}% of operating spend, above the ${tLo * 100}–${tHi * 100}% typical for software. Fine if you're building; check there's enough left to actually reach customers.`,
      sources: ["davila03"],
    });
  } else if (d.teamShare < tLo - 0.15 && d.teamShare > 0) {
    flags.push({
      level: "note",
      text: `Team is only ${(d.teamShare * 100).toFixed(0)}% of operating spend, below the ${tLo * 100}–${tHi * 100}% typical for software. Heavy non-personnel spend this early is worth a second look.`,
      sources: ["davila03"],
    });
  }

  /*
   * Burn multiple — net burn per € of new recurring revenue. A practitioner
   * benchmark rather than an academic one, but the standard capital-efficiency
   * read, and the number an investor will compute about you anyway.
   */
  if (s.mode === "goal" && isFinite(d.capacity.burnMultiple) && d.capacity.burnMultiple > 0) {
    const bm = d.capacity.burnMultiple;
    if (bm > 3) {
      flags.push({
        level: "warn",
        text: `A burn multiple of ${bm.toFixed(1)} means ${bm.toFixed(1)}€ of burn per €1 of new recurring revenue. Under about 2 reads as efficient; above 3 an investor will ask whether the motion works at all. At the earliest stages this number is usually meaningless — which is itself a sign that costing from a revenue target is the wrong direction here.`,
        sources: ["sarasvathy01", "wiltbank06"],
      });
    } else {
      flags.push({
        level: "ok",
        text: `Burn multiple of ${bm.toFixed(1)} — ${bm.toFixed(1)}€ of burn per €1 of new recurring revenue, which reads as ${bm < 1.5 ? "efficient" : "reasonable"} for this stage.`,
        sources: ["brinckmann10"],
      });
    }
  }

  const [lo, hi] = TYPICAL_ROUND[s.stage];
  const raiseM = d.raise / 1000;
  if (raiseM > hi) {
    flags.push({
      level: "note",
      text: `${raiseM.toFixed(1)} M€ is above the ${lo}–${hi} M€ typical for this stage. Either the plan is bigger than the stage, or the round is really the next one up.`,
      sources: ["gompers95"],
    });
  } else if (raiseM > 0 && raiseM < lo) {
    flags.push({
      level: "note",
      text: `${raiseM.toFixed(1)} M€ is below the ${lo}–${hi} M€ typical for this stage — which is fine if the milestone genuinely costs that little. Small rounds are cheaper in dilution.`,
      sources: ["ewens18"],
    });
  }

  return flags;
}

/** k€ → a short readable string. */
export function fmtK(v: number): string {
  if (!isFinite(v)) return "—";
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 2)} M€`;
  return `${Math.round(v)} k€`;
}
