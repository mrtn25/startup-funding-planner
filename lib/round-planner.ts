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
  davila03: [
    "Davila, Foster & Gupta (2003). Venture capital financing and the growth of startup firms. <em>Journal of Business Venturing</em> 18(6), 689–708.",
    scholar("Venture capital financing and the growth of startup firms Davila Foster Gupta"),
  ],
};

/* ── State ───────────────────────────────────────────────────── */

export type RoundPlanState = {
  stage: Stage;
  /** Cash in the bank today, k€. */
  currentCash: number;
  /** Net burn today, k€ per month, before any new hires. */
  currentBurn: number;
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

export function initialRoundPlan(): RoundPlanState {
  return {
    stage: "seed",
    currentCash: 150,
    currentBurn: 35,
    targetMonths: 18,
    bufferPct: 0.25,
    rampMonths: 6,
    hires: { eng: 3, product: 1, design: 0, sales: 1, marketing: 1, ops: 0 },
    spend: { marketing: 8, infra: 4, tooling: 2, legal: 3, other: 2 },
  };
}

/* ── Model ───────────────────────────────────────────────────── */

export type Allocation = { key: AllocationKey; label: string; amount: number; share: number };

export type Flag = { level: "warn" | "note" | "ok"; text: string; sources: string[] };

export type RoundPlan = {
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

export function computePlan(s: RoundPlanState): RoundPlan {
  const hireMonthly = ROLES.reduce((a, r) => a + (s.hires[r.key] ?? 0) * r.monthly, 0);
  const spendMonthly = SPEND.reduce((a, k) => a + (s.spend[k.key] ?? 0), 0);
  const steadyBurn = s.currentBurn + hireMonthly + spendMonthly;

  /*
   * Hires land over the ramp rather than on day one, so the plan costs less
   * than months × steady burn. Summed month by month rather than with a
   * closed form — it stays readable and handles ramp > horizon.
   */
  let planCost = 0;
  for (let m = 1; m <= s.targetMonths; m++) {
    const rampFactor = s.rampMonths > 0 ? Math.min(1, m / s.rampMonths) : 1;
    planCost += s.currentBurn + spendMonthly + hireMonthly * rampFactor;
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
  byBucket.team += s.currentBurn * s.targetMonths;
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

  return {
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
    flags: buildFlags(s, { raise, runwayAtFullBurn, teamShare }),
    typicalRound: TYPICAL_ROUND[s.stage],
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
  d: { raise: number; runwayAtFullBurn: number; teamShare: number },
): Flag[] {
  const flags: Flag[] = [];
  const [rLo, rHi] = BENCH.runwayMonths;

  if (d.runwayAtFullBurn < rLo) {
    flags.push({
      level: "warn",
      text: `At full-team burn this funds ${d.runwayAtFullBurn.toFixed(0)} months, under the ${rLo}–${rHi} month convention. You would be back out raising before the milestone lands — which is the position staged financing is designed to avoid.`,
      sources: ["gompers95", "sahlman90"],
    });
  } else if (d.runwayAtFullBurn > rHi + 8) {
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
