/* ══════════════════════════════════════════════════════════════
   Who should get how much — and what happens if someone leaves.

   The empirical finding that matters is not which split is right but
   that the conversation happens at all. Wasserman and Hoang, across
   1,476 founders in 511 ventures, found roughly three quarters of
   teams splitting equally and often within a month of founding — and
   teams that landed on an equal split by default rather than by
   negotiation were far likelier to be unhappy with it later, and
   less able to renegotiate once it mattered.

   So this tool does not tell you that equal is wrong. Plenty of equal
   splits are correct. It makes the factors explicit, shows what they
   imply, and shows the gap against an equal split — because a split
   you can defend line by line survives a bad year, and a quick
   handshake often doesn't.

   The weighted-factor method is Demmler's Founders' Pie: rate each
   factor's importance to this venture, rate each founder on it, and
   let the arithmetic follow.

   Pure functions, no DOM — see equity-split.test.ts.
   ══════════════════════════════════════════════════════════════ */

export const SRC: Record<string, [string, string]> = {
  wasserman: [
    "Wasserman, N. &amp; Hoang, T. <em>The First Deal: The Division of Founder Equity in New Ventures.</em> NBER Working Paper 16922 — 1,476 founders across 511 ventures.",
    "https://www.nber.org/system/files/working_papers/w16922/w16922.pdf",
  ],
  dilemmas: [
    "Wasserman, N. (2012). <em>The Founder's Dilemmas.</em> Princeton University Press — roughly 10,000 founders and 3,600 startups.",
    "https://press.princeton.edu/books/hardcover/9780691149134/the-founders-dilemmas",
  ],
  demmler: [
    "Demmler, F. <em>Founders' Pie Calculator.</em> Carnegie Mellon University — the weighted-factor method used here.",
    "https://www.andrew.cmu.edu/user/fd0n/35%20Founders'%20Pie%20Calculator.htm",
  ],
};

export type FactorKey = "idea" | "plan" | "expertise" | "commitment" | "responsibility";

export const FACTORS: { key: FactorKey; label: string; note: string }[] = [
  {
    key: "idea",
    label: "The idea",
    note: "Who brought it. Worth less than founders expect — an idea nobody executes is worth nothing, which is why this factor is usually weighted low.",
  },
  {
    key: "plan",
    label: "Groundwork done",
    note: "The research, the plan, the first customer conversations — work already finished before anyone was paid.",
  },
  {
    key: "expertise",
    label: "Domain expertise",
    note: "What each person knows that the venture cannot easily buy. The hardest factor to replace and often the most undervalued.",
  },
  {
    key: "commitment",
    label: "Commitment & risk",
    note: "Full-time or evenings, salary given up, money put in, what happens to them if it fails. Usually the heaviest factor, because it is the one that decides whether anything gets built.",
  },
  {
    key: "responsibility",
    label: "Ongoing responsibility",
    note: "What each person carries from here on. The split is about the future far more than about the past.",
  },
];

export type Founder = {
  id: string;
  name: string;
  /** 0..10 per factor. */
  scores: Record<FactorKey, number>;
  /** Months already worked before the split is agreed. */
  monthsServed: number;
};

export type VestingTerms = {
  /** Standard is four years. */
  years: number;
  /** Standard is twelve months. Nothing vests before it. */
  cliffMonths: number;
  /** Months of past work credited on day one. */
  creditMonths: number;
};

export type SplitInputs = {
  founders: Founder[];
  /** 0..10 per factor: how much this factor matters to this venture. */
  weights: Record<FactorKey, number>;
  vesting: VestingTerms;
  /** Month at which the what-if departure is evaluated. */
  departureMonth: number;
};

export type FounderResult = {
  id: string;
  name: string;
  /** Weighted points. */
  points: number;
  /** Share of the founder equity, 0..1. */
  share: number;
  /** Percentage points above or below an equal split. */
  vsEqual: number;
  /** Share actually vested at the departure month, 0..1 of their own stake. */
  vestedFraction: number;
  /** Of the whole company: what they keep if they walk at that month. */
  keptShare: number;
  /** What they forfeit, which returns to everyone else. */
  forfeitedShare: number;
};

export type Warning = {
  key: string;
  level: "warn" | "note";
  text: string;
  sources: string[];
};

export type SplitResult = {
  founders: FounderResult[];
  /** How far the split is from equal, in percentage points of the largest gap. */
  spread: number;
  isEssentiallyEqual: boolean;
  warnings: Warning[];
};

/* ── Vesting ─────────────────────────────────────────────────── */

/**
 * What fraction of a stake has vested after so many months.
 *
 * Nothing vests before the cliff, and then the cliff pays out in one
 * lump — that discontinuity is the whole point of it. Past work can be
 * credited so a founder who has already been at it a year is not asked
 * to start from zero.
 */
export function vestedFraction(terms: VestingTerms, monthsServed: number): number {
  const total = Math.max(1, Math.round(terms.years * 12));
  const effective = Math.max(0, monthsServed) + Math.max(0, terms.creditMonths);
  if (effective < terms.cliffMonths) return 0;
  return Math.min(1, effective / total);
}

/* ── The split ───────────────────────────────────────────────── */

export function computeSplit(input: SplitInputs): SplitResult {
  const { founders, weights, vesting, departureMonth } = input;

  const points = founders.map((f) =>
    FACTORS.reduce((a, factor) => a + (weights[factor.key] ?? 0) * (f.scores[factor.key] ?? 0), 0),
  );
  const total = points.reduce((a, p) => a + p, 0);
  const equal = founders.length > 0 ? 1 / founders.length : 0;

  /* With no weights or no scores there is nothing to divide by. Falling back
     to an equal split is the honest answer — not a division by zero, and not
     a spurious ranking out of noise. */
  const shares = founders.map((_, i) => (total > 0 ? points[i] / total : equal));

  const results: FounderResult[] = founders.map((f, i) => {
    const vested = vestedFraction(vesting, f.monthsServed + departureMonth);
    return {
      id: f.id,
      name: f.name,
      points: points[i],
      share: shares[i],
      vsEqual: (shares[i] - equal) * 100,
      vestedFraction: vested,
      keptShare: shares[i] * vested,
      forfeitedShare: shares[i] * (1 - vested),
    };
  });

  const spread = results.length > 1 ? (Math.max(...shares) - Math.min(...shares)) * 100 : 0;
  const isEssentiallyEqual = spread < 2;

  return { founders: results, spread, isEssentiallyEqual, warnings: warningsFor(input, results, spread) };
}

function warningsFor(input: SplitInputs, results: FounderResult[], spread: number): Warning[] {
  const w: Warning[] = [];
  const { vesting, founders } = input;

  if (results.length > 1 && spread < 2) {
    w.push({
      key: "equal",
      level: "note",
      text: "This comes out essentially equal. That is a perfectly good answer — around three quarters of teams land there. What the research warns about is arriving at it by default instead of by argument: teams that split equally without negotiating were markedly likelier to be unhappy with it later, and much less able to change it once it mattered. If you can defend this line by line, you are fine.",
      sources: ["wasserman", "dilemmas"],
    });
  }

  if (vesting.years <= 0) {
    w.push({
      key: "no-vesting",
      level: "warn",
      text: "No vesting means a co-founder who leaves in month three keeps their entire stake for ever, and the people who stay carry the company for a shareholder who does nothing. It is the single most expensive thing to leave out of a founder agreement.",
      sources: ["dilemmas"],
    });
  } else if (Math.abs(vesting.years - 4) > 1.5) {
    w.push({
      key: "odd-vesting",
      level: "note",
      text: `${vesting.years} years is outside the four-year convention. Investors will expect four, and a shorter schedule is one of the things they routinely ask to have reset at the first priced round.`,
      sources: ["dilemmas"],
    });
  }

  if (vesting.years > 0 && vesting.cliffMonths <= 0) {
    w.push({
      key: "no-cliff",
      level: "warn",
      text: "Without a cliff, someone who leaves after six weeks still walks away with shares. The one-year cliff exists precisely for the co-founder who turns out not to be one.",
      sources: ["dilemmas"],
    });
  }

  if (vesting.creditMonths > 24) {
    w.push({
      key: "much-credit",
      level: "note",
      text: `Crediting ${vesting.creditMonths} months of past work means a large part of the stake is vested on day one. Defensible where the work really happened — but it removes most of what vesting is for.`,
      sources: [],
    });
  }

  const dominant = results.find((r) => r.share > 0.8) ;
  if (dominant && results.length > 1) {
    w.push({
      key: "dominant",
      level: "note",
      text: `${dominant.name || "One founder"} takes ${Math.round(dominant.share * 100)} %. At that point the others are early employees rather than co-founders, and it is usually kinder to both sides to say so — and to pay them a salary instead.`,
      sources: [],
    });
  }

  const idleWeight = input.weights.idea ?? 0;
  const totalWeight = FACTORS.reduce((a, f) => a + (input.weights[f.key] ?? 0), 0);
  if (totalWeight > 0 && idleWeight / totalWeight > 0.35) {
    w.push({
      key: "idea-heavy",
      level: "note",
      text: "The idea carries more than a third of the weight here. Ideas are cheap relative to execution — nearly every venture that fails had a decent one. Weighting it this heavily tends to be a founder arguing for their own past rather than for the company's future.",
      sources: ["demmler"],
    });
  }

  if (founders.some((f) => f.monthsServed > 12) && vesting.creditMonths === 0) {
    w.push({
      key: "no-credit",
      level: "note",
      text: "Someone here has been at it over a year but gets no credit for it in the vesting schedule. That is a defensible choice, but make it deliberately rather than by omission.",
      sources: [],
    });
  }

  return w;
}

/* ── Reference splits ────────────────────────────────────────── */

export type Preset = { key: string; label: string; note: string; weights: Record<FactorKey, number> };

/** Weightings that encode a particular argument about what matters. */
export const PRESETS: Preset[] = [
  {
    key: "execution",
    label: "Execution-weighted",
    note: "The common default: what you do from here outweighs what you brought. Commitment and responsibility carry most of the weight.",
    weights: { idea: 2, plan: 3, expertise: 6, commitment: 9, responsibility: 8 },
  },
  {
    key: "balanced",
    label: "Balanced",
    note: "Every factor counts for something. Tends to produce splits close to equal unless the founders are genuinely very different.",
    weights: { idea: 5, plan: 5, expertise: 5, commitment: 6, responsibility: 6 },
  },
  {
    key: "founder-idea",
    label: "Idea & groundwork",
    note: "For a venture where one person carried it alone for a long time before anyone joined. Use it knowingly — it is the weighting most likely to be resented later.",
    weights: { idea: 7, plan: 7, expertise: 5, commitment: 6, responsibility: 5 },
  },
  {
    key: "expertise",
    label: "Expertise-led",
    note: "Deep-tech and regulated markets, where what someone knows is the thing that cannot be bought or hurried.",
    weights: { idea: 3, plan: 3, expertise: 9, commitment: 8, responsibility: 6 },
  },
];

export const DEFAULT_VESTING: VestingTerms = { years: 4, cliffMonths: 12, creditMonths: 0 };

let seq = 0;
export function newFounder(name = "", partial: Partial<Founder> = {}): Founder {
  seq++;
  return {
    id: `f${Date.now().toString(36)}${seq.toString(36)}`,
    name,
    scores: { idea: 5, plan: 5, expertise: 5, commitment: 8, responsibility: 5 },
    monthsServed: 0,
    ...partial,
  };
}

export const DEFAULT_SPLIT: SplitInputs = {
  founders: [
    newFounder("Founder A", {
      scores: { idea: 8, plan: 7, expertise: 6, commitment: 9, responsibility: 8 },
      monthsServed: 9,
    }),
    newFounder("Founder B", {
      scores: { idea: 3, plan: 4, expertise: 8, commitment: 9, responsibility: 7 },
      monthsServed: 3,
    }),
  ],
  weights: PRESETS[0].weights,
  vesting: DEFAULT_VESTING,
  departureMonth: 18,
};
