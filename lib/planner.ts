/* ══════════════════════════════════════════════════════════════
   Funding planner — pure model layer.

   Ported verbatim (numerically) from the original single-file build.
   Nothing in here touches the DOM: every function takes state and
   returns values, so the maths can be reasoned about and tested on
   its own. Where the original read an <input> mid-calculation, that
   value is now a field on PlannerState.
   ══════════════════════════════════════════════════════════════ */

export type RoundId = "preSeed" | "seed" | "serA" | "serB" | "serC" | "serD";
export type IndustryKey = "custom" | "saas" | "climate" | "health" | "fintech" | "deeptech" | "consumer";
export type InvestorType = "fff" | "angel" | "vc" | "other";
export type LPMode = "none" | "nonpart" | "part" | "2x";
export type StakeholderType = "founder" | "esop" | "investor" | "conv";

export type RoundDef = {
  id: RoundId;
  name: string;
  color: string;
  bg: string;
  investMax: number;
  investStep: number;
};

/** User-editable per-round values. */
export type RoundState = {
  id: RoundId;
  invest: number;
  dilPct: number;
  active: boolean;
};

export type Investor = {
  type: InvestorType;
  name: string;
  /** Ticket in k€. Empty string while the field is blank. */
  amt: number | "";
};

export type PlannerState = {
  ventureName: string;
  ventureDesc: string;
  industry: IndustryKey;
  founderCount: number;
  /** Whole percent, 0–20. */
  esopPct: number;
  /** Numeric inputs are held as strings so a blank field stays blank. */
  grantAmt: string;
  convAmt: string;
  convDiscount: string;
  convCap: string;
  rounds: RoundState[];
  investors: Record<RoundId, Investor[]>;
  exitDirect: string;
  exitMultiple: string;
  /** Which exit field the user touched last; drives sync while linked. */
  exitLastEdited: "direct" | "multiple";
  linked: boolean;
  lpMode: LPMode;
  showVal: boolean;
  showInv: boolean;
};

/* ── Static data ─────────────────────────────────────────────── */

export const ROUND_DEFS: RoundDef[] = [
  { id: "preSeed", name: "Pre-Seed", color: "#7F77DD", bg: "rgba(127,119,221,0.22)", investMax: 5, investStep: 0.1 },
  { id: "seed", name: "Seed", color: "#1D9E75", bg: "rgba(29,158,117,0.20)", investMax: 15, investStep: 0.5 },
  { id: "serA", name: "Series A", color: "#EF9F27", bg: "rgba(239,159,39,0.20)", investMax: 50, investStep: 1 },
  { id: "serB", name: "Series B", color: "#D85A30", bg: "rgba(216,90,48,0.20)", investMax: 150, investStep: 5 },
  { id: "serC", name: "Series C", color: "#D4537E", bg: "rgba(212,83,126,0.20)", investMax: 300, investStep: 10 },
  { id: "serD", name: "Series D", color: "#378ADD", bg: "rgba(55,138,221,0.20)", investMax: 600, investStep: 25 },
];

export const ROUND_DEF_BY_ID = Object.fromEntries(ROUND_DEFS.map((r) => [r.id, r])) as Record<RoundId, RoundDef>;

export const INITIAL_ROUNDS: RoundState[] = [
  { id: "preSeed", invest: 0.5, dilPct: 15, active: true },
  { id: "seed", invest: 2, dilPct: 20, active: true },
  { id: "serA", invest: 8, dilPct: 20, active: false },
  { id: "serB", invest: 25, dilPct: 18, active: false },
  { id: "serC", invest: 60, dilPct: 15, active: false },
  { id: "serD", invest: 150, dilPct: 13, active: false },
];

type IndustryDef = {
  label: string;
  emoji: string;
  rounds: { invest: number; dilPct: number }[];
  exitMultiple: number;
  esop: number;
};

export const INDUSTRIES: Record<IndustryKey, IndustryDef> = {
  custom: {
    label: "Custom",
    emoji: "",
    rounds: [
      { invest: 0.5, dilPct: 15 },
      { invest: 2, dilPct: 20 },
      { invest: 8, dilPct: 20 },
      { invest: 25, dilPct: 18 },
      { invest: 60, dilPct: 15 },
      { invest: 150, dilPct: 13 },
    ],
    exitMultiple: 5,
    esop: 10,
  },
  saas: {
    label: "SaaS / B2B",
    emoji: "💻",
    rounds: [
      { invest: 0.5, dilPct: 12 },
      { invest: 2.5, dilPct: 18 },
      { invest: 10, dilPct: 20 },
      { invest: 30, dilPct: 18 },
      { invest: 75, dilPct: 15 },
      { invest: 200, dilPct: 12 },
    ],
    exitMultiple: 8,
    esop: 12,
  },
  climate: {
    label: "Climate Tech",
    emoji: "🌱",
    rounds: [
      { invest: 1, dilPct: 15 },
      { invest: 4, dilPct: 20 },
      { invest: 15, dilPct: 22 },
      { invest: 50, dilPct: 20 },
      { invest: 120, dilPct: 17 },
      { invest: 300, dilPct: 14 },
    ],
    exitMultiple: 6,
    esop: 10,
  },
  health: {
    label: "Health Tech",
    emoji: "🏥",
    rounds: [
      { invest: 1.5, dilPct: 18 },
      { invest: 5, dilPct: 22 },
      { invest: 20, dilPct: 22 },
      { invest: 60, dilPct: 20 },
      { invest: 150, dilPct: 17 },
      { invest: 400, dilPct: 14 },
    ],
    exitMultiple: 7,
    esop: 12,
  },
  fintech: {
    label: "FinTech",
    emoji: "💳",
    rounds: [
      { invest: 0.8, dilPct: 14 },
      { invest: 3, dilPct: 20 },
      { invest: 12, dilPct: 20 },
      { invest: 40, dilPct: 18 },
      { invest: 100, dilPct: 15 },
      { invest: 250, dilPct: 12 },
    ],
    exitMultiple: 7,
    esop: 10,
  },
  deeptech: {
    label: "Deep Tech",
    emoji: "⚛️",
    rounds: [
      { invest: 2, dilPct: 20 },
      { invest: 6, dilPct: 22 },
      { invest: 20, dilPct: 22 },
      { invest: 70, dilPct: 20 },
      { invest: 180, dilPct: 18 },
      { invest: 500, dilPct: 15 },
    ],
    exitMultiple: 10,
    esop: 15,
  },
  consumer: {
    label: "Consumer",
    emoji: "🛍️",
    rounds: [
      { invest: 0.3, dilPct: 15 },
      { invest: 1.5, dilPct: 20 },
      { invest: 6, dilPct: 20 },
      { invest: 20, dilPct: 18 },
      { invest: 50, dilPct: 15 },
      { invest: 120, dilPct: 12 },
    ],
    exitMultiple: 5,
    esop: 8,
  },
};

export const INV_COUNT_TIPS: Record<RoundId, string> = {
  preSeed: "Typically 1–5 investors (FFF, angels, micro-VCs)",
  seed: "Typically 3–10 investors (angels, syndicates, seed funds)",
  serA: "Typically 1–3 lead VCs, often with 2–4 co-investors",
  serB: "Typically 1–2 lead VCs plus 2–3 follow-on investors",
  serC: "Typically institutional VCs + growth equity, 2–5 investors",
  serD: "Late-stage funds, crossover investors, 1–4 participants",
};

/** Quick-pick ticket sizes, in k€. */
export const TICKET_SIZES: Record<RoundId, number[]> = {
  preSeed: [10, 25, 50, 100, 250],
  seed: [50, 100, 250, 500, 1000],
  serA: [250, 500, 1000, 2000, 5000],
  serB: [500, 1000, 2500, 5000, 10000],
  serC: [1000, 2500, 5000, 10000, 25000],
  serD: [2500, 5000, 10000, 25000, 50000],
};

export const ITYPES: { id: InvestorType; label: string; cls: string }[] = [
  { id: "fff", label: "FFF", cls: "t-fff" },
  { id: "angel", label: "Angel", cls: "t-angel" },
  { id: "vc", label: "VC", cls: "t-vc" },
  { id: "other", label: "Other", cls: "t-other" },
];

export function itype(id: InvestorType) {
  return ITYPES.find((x) => x.id === id) ?? ITYPES[3];
}

export const INVESTOR_BADGE_COLORS: Record<InvestorType, { bg: string; c: string }> = {
  fff: { bg: "#FDE8FE", c: "#7B0F8C" },
  angel: { bg: "#E8F4FF", c: "#0A5EA8" },
  vc: { bg: "#E1F5EE", c: "#085041" },
  other: { bg: "var(--surface2)", c: "var(--text2)" },
};

export const MILESTONE_COLORS: Record<string, { bg: string; c: string }> = {
  "Pre-Seed": { bg: "#EEEDFE", c: "#3C3489" },
  Seed: { bg: "#E1F5EE", c: "#085041" },
  "Series A": { bg: "#FAEEDA", c: "#633806" },
  "Series B": { bg: "#fee2e2", c: "#991b1b" },
  "Series C": { bg: "#E8F4FF", c: "#0A5EA8" },
  "Series D": { bg: "#EAF3DE", c: "#27500A" },
};

export const FALLBACK_MILESTONES: Record<RoundId, string[]> = {
  preSeed: ["MVP launched & tested with 10+ users", "Clear problem-solution fit documented with user interviews"],
  seed: ["€10k–50k MRR or 1,000+ active users", "Repeatable customer acquisition channel identified"],
  serA: ["€500k+ ARR with <10% monthly churn", "Unit economics positive (CAC payback < 18 months)"],
  serB: ["€3M+ ARR, proven scalable GTM motion", "Expansion to 2nd market or product line underway"],
  serC: ["€15M+ ARR, market leadership in core segment", "Clear path to profitability within 24 months"],
  serD: ["€50M+ ARR, profitability or near-breakeven", "IPO readiness or strategic M&A pipeline active"],
};

/* ── Formatters ──────────────────────────────────────────────── */

export function fmtM(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return "—";
  if (v >= 1000) return (v / 1000).toFixed(1).replace(".0", "") + "Mrd €";
  if (v < 1) return Math.round(v * 1000) + " Tsd €";
  if (v < 10) return v.toFixed(1) + " Mio €";
  return Math.round(v) + " Mio €";
}

export function pct(v: number): string {
  return v.toFixed(1) + "%";
}

/** Formats a k€ amount, rolling over to M€ at 1000. */
export function fmtKeur(v: number | "" | null | undefined): string {
  if (v === "" || v == null || !isFinite(Number(v))) return "";
  const k = Number(v);
  if (k >= 1000) return (k / 1000).toFixed(k % 1000 === 0 ? 0 : 1) + " M€";
  return k + " k€";
}

/** Matches the original's `parseFloat(input.value) || 0`. */
export function num(value: string): number {
  const n = parseFloat(value);
  return isFinite(n) ? n : 0;
}

/* ── Derived state ───────────────────────────────────────────── */

export function getActive(state: PlannerState): RoundState[] {
  return state.rounds.filter((r) => r.active);
}

export function roundName(id: RoundId): string {
  return ROUND_DEF_BY_ID[id].name;
}

/** Post-money of the last active round, at unscaled amounts. */
export function getLastPostM(state: PlannerState): number | null {
  const a = getActive(state);
  if (!a.length) return null;
  const last = a[a.length - 1];
  return (last.invest / last.dilPct) * 100;
}

/**
 * Scale factor for "reverse mode": when the exit is linked to the last
 * round, every investment is scaled so the round ladder lands on the
 * requested exit valuation.
 */
export function getSF(state: PlannerState): number {
  if (!state.linked) return 1;
  const lp = getLastPostM(state);
  if (!lp) return 1;
  const d = parseFloat(state.exitDirect);
  const m = num(state.exitMultiple) || 1;
  return (isFinite(d) && d > 0 ? d : lp * m) / lp;
}

export function calcExitM(state: PlannerState): number | null {
  const m = num(state.exitMultiple) || 1;
  const d = parseFloat(state.exitDirect);
  const lp = getLastPostM(state);
  if (!lp) return null;
  if (state.linked) return lp * getSF(state);
  if (isFinite(d) && d > 0) return d;
  return lp * m;
}

/**
 * While linked, the two exit fields mirror each other. The original did
 * this by writing back into the DOM behind a `suppressSync` flag; here it
 * is a pure derivation, with `exitLastEdited` deciding which field wins.
 */
export function deriveExitFields(state: PlannerState): { exitDirect: string; exitMultiple: string } {
  let { exitDirect, exitMultiple } = state;
  const lp = getLastPostM(state);
  if (!state.linked || !lp) return { exitDirect, exitMultiple };

  const d = parseFloat(exitDirect);
  if (state.exitLastEdited === "multiple" || !(isFinite(d) && d > 0)) {
    exitDirect = String(Math.round(lp * (num(exitMultiple) || 1)));
  } else {
    exitMultiple = (d / lp).toFixed(2);
  }
  return { exitDirect, exitMultiple };
}

export type ConvertibleEffect = {
  pct: number;
  amt: number;
  effectiveVal: number;
  discount: number;
  cap: number;
};

/**
 * Dilution contributed by a convertible note when it converts at the
 * first active round. Discount and cap both push the conversion price
 * down; whichever is more favourable to the noteholder wins.
 */
export function getConvertibleEffect(state: PlannerState, firstActivePostM: number): ConvertibleEffect {
  const convAmt = num(state.convAmt);
  if (convAmt <= 0) return { pct: 0, amt: 0, effectiveVal: 0, discount: 0, cap: 0 };

  const discount = (num(state.convDiscount) || 20) / 100;
  const cap = num(state.convCap);
  let effectiveVal = firstActivePostM * (1 - discount);
  if (cap > 0) effectiveVal = Math.min(effectiveVal, cap);

  const convPct = convAmt / Math.max(effectiveVal, 0.001);
  return { pct: Math.min(convPct * 100, 50), amt: convAmt, effectiveVal, discount, cap };
}

/* ── Core calculation ────────────────────────────────────────── */

export type Stakeholder = {
  name: string;
  shares: number;
  type: StakeholderType;
  pct: number;
  color?: string;
  /** Round name, for investor entries. */
  rnd?: string;
};

export type Snapshot = {
  founderPct: number;
  esopPct: number;
  roundPcts: Record<string, number>;
  postM: number | null;
  cumInvest: number;
};

export type CalcResult = {
  allStakeholders: Stakeholder[];
  snaps: Record<string, Snapshot>;
  exitM: number | null;
  fc: number;
  active: RoundState[];
  lastPostM: number | null;
  sf: number;
  totalShares: number;
  totalInvested: number;
  totalNonDilutive: number;
  grantAmt: number;
  convEffect: ConvertibleEffect;
};

const TOTAL_INIT = 10_000_000;

export function calc(state: PlannerState): CalcResult {
  const fc = state.founderCount;
  const esopFrac = state.esopPct / 100;
  const grantAmt = num(state.grantAmt);
  const sf = getSF(state);
  const active = getActive(state);

  let totalShares = TOTAL_INIT;

  const founders: Stakeholder[] = [];
  for (let i = 0; i < fc; i++) {
    founders.push({
      name: "Founder " + (i + 1),
      shares: Math.round((TOTAL_INIT * (1 - esopFrac)) / fc),
      type: "founder",
      pct: 0,
    });
  }
  const esopEntry: Stakeholder = { name: "ESOP Pool", shares: Math.round(TOTAL_INIT * esopFrac), type: "esop", pct: 0 };

  const firstActive = active[0];
  const convEffect: ConvertibleEffect = firstActive
    ? getConvertibleEffect(state, ((firstActive.invest * sf) / firstActive.dilPct) * 100)
    : { pct: 0, amt: 0, effectiveVal: 0, discount: 0, cap: 0 };
  let convEntry: Stakeholder | null = null;

  const roundEntries: Stakeholder[] = [];
  const snaps: Record<string, Snapshot> = {};
  const initRP: Record<string, number> = {};
  active.forEach((r) => (initRP[roundName(r.id)] = 0));
  snaps["Founding"] = {
    founderPct: (1 - esopFrac) * 100,
    esopPct: esopFrac * 100,
    roundPcts: { ...initRP },
    postM: null,
    cumInvest: 0,
  };

  let lastPostM: number | null = null;
  let cumInvest = 0;

  for (let ri = 0; ri < active.length; ri++) {
    const r = active[ri];
    const name = roundName(r.id);
    const si = r.invest * sf;
    const sp = (si / r.dilPct) * 100;

    // A convertible converts immediately before the first priced round.
    if (ri === 0 && convEffect.pct > 0) {
      const convDilFrac = convEffect.pct / 100;
      const convShares = Math.round((totalShares * convDilFrac) / (1 - convDilFrac));
      totalShares += convShares;
      convEntry = { name: "Convertible Loan", shares: convShares, type: "conv", color: "#BA7517", pct: 0 };
    }

    const dilFrac = r.dilPct / 100;
    const newShares = Math.round((totalShares * dilFrac) / (1 - dilFrac));
    totalShares += newShares;
    cumInvest += si;

    roundEntries.push({
      name: name + " Investors",
      shares: newShares,
      type: "investor",
      rnd: name,
      color: ROUND_DEF_BY_ID[r.id].color,
      pct: 0,
    });
    lastPostM = sp;

    const rp: Record<string, number> = {};
    active.forEach((ar) => {
      const arName = roundName(ar.id);
      const re = roundEntries.find((e) => e.rnd === arName);
      rp[arName] = re ? (re.shares / totalShares) * 100 : 0;
    });

    snaps[name] = {
      founderPct: (founders.reduce((a, s) => a + s.shares, 0) / totalShares) * 100,
      esopPct: (esopEntry.shares / totalShares) * 100,
      roundPcts: rp,
      postM: sp,
      cumInvest,
    };
  }

  const withPct = (s: Stakeholder): Stakeholder => ({ ...s, pct: (s.shares / totalShares) * 100 });
  const allStakeholders: Stakeholder[] = [
    ...founders.map(withPct),
    withPct(esopEntry),
    ...(convEntry ? [withPct(convEntry)] : []),
    ...roundEntries.map(withPct),
  ];

  return {
    allStakeholders,
    snaps,
    exitM: calcExitM(state),
    fc,
    active,
    lastPostM,
    sf,
    totalShares,
    totalInvested: active.reduce((a, r) => a + r.invest * sf, 0),
    totalNonDilutive: grantAmt + num(state.convAmt),
    grantAmt,
    convEffect,
  };
}

/* ── Liquidation preference ──────────────────────────────────── */

export type LPScenario = {
  noLP: { inv: number; founder: number };
  withLP: { inv: number; founder: number; lb: number; rem: number; part?: boolean; twoX?: boolean };
  invPct: number;
  founderPct: number;
};

export function calcLPScenario(
  allStakeholders: Stakeholder[],
  exitM: number | null,
  totalInvested: number,
  mode: LPMode,
): LPScenario | null {
  if (!exitM || mode === "none") return null;

  const invPct =
    allStakeholders.filter((s) => s.type === "investor" || s.type === "conv").reduce((a, s) => a + s.pct, 0) / 100;
  const founderPct = 1 - invPct;
  const noLP = { inv: exitM * invPct, founder: exitM * founderPct };

  // Every mode pays a liquidation preference off the top, then splits the
  // remainder pro-rata. They differ only in the size of that preference.
  const multiple = mode === "2x" ? 2 : 1;
  const lb = Math.min(totalInvested * multiple, exitM);
  const rem = Math.max(0, exitM - lb);
  const withLP = {
    inv: lb + rem * invPct,
    founder: rem * founderPct,
    lb,
    rem,
    ...(mode === "part" ? { part: true } : {}),
    ...(mode === "2x" ? { twoX: true } : {}),
  };

  return { noLP, withLP, invPct, founderPct };
}

/* ── Cap-table investor detail rows ──────────────────────────── */

export type InvestorDetailRow = {
  key: string;
  type: InvestorType;
  name: string;
  /** Ownership of the whole company, in percent. */
  pct: number;
  amtK: number;
  exitProceeds: number | null;
};

/**
 * Per-investor rows nested under each round in the cap table.
 *
 * The original derived these by scraping the rendered table and running
 * parseFloat over the round's "12.3%" cell, so the round percentage was
 * already rounded to one decimal. That rounding is reproduced here to
 * keep the displayed numbers identical.
 */
export function investorDetailRows(
  state: PlannerState,
  roundId: RoundId,
  roundPctOfCompany: number,
  exitM: number | null,
): InvestorDetailRow[] {
  const round = state.rounds.find((r) => r.id === roundId);
  const list = state.investors[roundId] ?? [];
  if (!round || !list.length) return [];

  const rp = Number(roundPctOfCompany.toFixed(1));

  return list.map((x, i) => {
    const amtK = typeof x.amt === "number" ? x.amt : 0;
    const amtM = amtK / 1000;
    const p = round.invest > 0 ? (amtM / round.invest) * rp : 0;
    return {
      key: `${roundId}-${i}`,
      type: x.type,
      name: x.name,
      pct: p,
      amtK,
      exitProceeds: exitM ? (exitM * p) / 100 : null,
    };
  });
}

/** Total assigned to named investors in a round, in M€. */
export function assignedM(list: Investor[]): number {
  return list.reduce((s, x) => s + (typeof x.amt === "number" ? x.amt : 0), 0) / 1000;
}

/* ── Initial state ───────────────────────────────────────────── */

export function initialPlannerState(): PlannerState {
  return {
    ventureName: "",
    ventureDesc: "",
    industry: "custom",
    founderCount: 2,
    esopPct: 10,
    grantAmt: "0",
    convAmt: "0",
    convDiscount: "20",
    convCap: "0",
    rounds: INITIAL_ROUNDS.map((r) => ({ ...r })),
    investors: { preSeed: [], seed: [], serA: [], serB: [], serC: [], serD: [] },
    exitDirect: "",
    exitMultiple: "3",
    exitLastEdited: "direct",
    linked: false,
    lpMode: "none",
    showVal: false,
    showInv: false,
  };
}

/** Applies an industry preset. `custom` leaves the user's numbers alone. */
export function applyIndustry(state: PlannerState, key: IndustryKey): PlannerState {
  if (key === "custom") return { ...state, industry: key };

  const ind = INDUSTRIES[key];
  const rounds = state.rounds.map((r, i) => ({
    ...r,
    invest: ind.rounds[i].invest,
    dilPct: ind.rounds[i].dilPct,
  }));

  const next: PlannerState = {
    ...state,
    industry: key,
    rounds,
    esopPct: ind.esop,
    exitMultiple: String(ind.exitMultiple),
  };

  // The original pushed a matching exit valuation into the direct field.
  const lp = getLastPostM(next);
  return lp ? { ...next, exitDirect: String(Math.round(lp * ind.exitMultiple)), exitLastEdited: "direct" } : next;
}
