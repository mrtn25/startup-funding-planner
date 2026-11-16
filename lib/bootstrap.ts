/* ══════════════════════════════════════════════════════════════
   Can this business fund itself?

   Not a question of temperament. Whether a company can pay for its
   own growth out of what customers pay is mostly a property of the
   business: how long until the first euro, how much has to be spent
   before anything can be sold, how much of each sale survives the
   cost of delivering it, and whether the customer pays before or
   sixty days after you do the work.

   Those four facts are largely decided by the kind of business you
   picked — which is why this starts with the model and not with a
   spreadsheet. A consultancy invoices in week two with no capital at
   risk. A hardware company spends two years and a factory before the
   first unit ships. Both can be good businesses. Only one of them can
   be funded by its own customers.

   The criteria follow Bhidé's study of the Inc. 500 founders: get
   operational fast, look for early cash-generating work, sell at a
   price that lets the founders do the selling, watch cash rather than
   profit. Winborg and Landström catalogued what founders actually do
   when the money is short, and Ebben and Johnson showed the mix
   shifts as a firm stabilises — owner money early, customer money
   later. Mullins put names to the customer-funded models.

   Pure functions, no DOM — see bootstrap.test.ts.
   ══════════════════════════════════════════════════════════════ */

export const SRC: Record<string, [string, string]> = {
  bhide: [
    "Bhidé, A. (1992). <em>Bootstrap finance: the art of start-ups.</em> Harvard Business Review 70(6). A study of 100 companies from the 1989 Inc. 500 list: they started with a median of $10,000, got operational fast and took work that paid immediately.",
    "https://hbr.org/1992/11/bootstrap-finance-the-art-of-start-ups",
  ],
  winborg: [
    "Winborg, J. &amp; Landström, H. (2001). <em>Financial bootstrapping in small businesses: examining small business managers' resource acquisition behaviors.</em> Journal of Business Venturing 16(3), 235–254. The catalogue of techniques, grouped into owner financing, delaying payments, minimising capital, joint use of resources, customer-related methods and subsidy finance.",
    "https://doi.org/10.1016/S0883-9026(99)00055-5",
  ],
  ebben06: [
    "Ebben, J. &amp; Johnson, A. (2006). <em>Bootstrapping in small firms: an empirical analysis of change over time.</em> Journal of Business Venturing 21(6), 851–865. The mix shifts as a firm stabilises: owner money and delayed payments early, customer-related methods later.",
    "https://doi.org/10.1016/j.jbusvent.2005.06.007",
  ],
  vanacker11: [
    "Vanacker, T., Manigart, S., Meuleman, M. &amp; Sels, L. (2011). <em>A longitudinal study on the relationship between financial bootstrapping and new venture growth.</em> Entrepreneurship &amp; Regional Development 23(9–10). Bootstrapping is not only what you do when no one will fund you — some techniques go with higher growth, others with less.",
    "https://doi.org/10.1080/08985626.2011.577818",
  ],
  sarasvathy: [
    "Sarasvathy, S. (2001). <em>Causation and effectuation: toward a theoretical shift from economic inevitability to entrepreneurial contingency.</em> Academy of Management Review 26(2), 243–263. Start from what you have and what you can afford to lose rather than from the plan the capital would require.",
    "https://doi.org/10.5465/amr.2001.4378020",
  ],
  mullins14: [
    "Mullins, J. (2014). <em>The Customer-Funded Business.</em> Wiley. Five ways customers pay for growth: matchmaker, pay-in-advance, subscription, scarcity and service-to-product models.",
    "https://www.wiley.com/en-us/The+Customer+Funded+Business-p-9781118878859",
  ],
};

/* ── The four structural facts ───────────────────────────────── */

/** Money that has to be spent before anything can be sold. */
export type Upfront = "none" | "small" | "heavy";
/** How long until the first invoice. */
export type FirstEuro = "now" | "months" | "years";
/** How much of each euro survives delivering the thing. */
export type Margin = "high" | "mixed" | "thin";
/** When the customer's money actually arrives. */
export type Terms = "upfront" | "on-delivery" | "late";

export type Facts = { upfront: Upfront; firstEuro: FirstEuro; margin: Margin; terms: Terms };

export const FACT_LABEL: Record<keyof Facts, string> = {
  upfront: "Capital before the first sale",
  firstEuro: "Time to the first invoice",
  margin: "What survives delivering it",
  terms: "When the money arrives",
};

export const FACT_TEXT: Record<keyof Facts, Record<string, string>> = {
  upfront: {
    none: "Almost nothing — a laptop and your time",
    small: "A few thousand: tools, a first batch, a licence",
    heavy: "Six figures or more before anyone can buy",
  },
  firstEuro: {
    now: "Weeks. You can invoice before anything is finished",
    months: "Three to nine months of building first",
    years: "Years — approval, research or a network has to exist first",
  },
  margin: {
    high: "Most of it. Delivery costs little beyond your time",
    mixed: "Roughly half. Delivery has real cost attached",
    thin: "A fraction. Goods, fees or hardware eat the rest",
  },
  terms: {
    upfront: "Before you do the work, or at the moment of sale",
    "on-delivery": "Within a month of delivering",
    late: "Thirty to ninety days later, if you chase it",
  },
};

/** Each fact scores 0–1 toward "this can fund itself". */
const FACT_SCORE: { [K in keyof Facts]: Record<string, number> } = {
  upfront: { none: 1, small: 0.6, heavy: 0 },
  firstEuro: { now: 1, months: 0.45, years: 0 },
  margin: { high: 1, mixed: 0.5, thin: 0.15 },
  terms: { upfront: 1, "on-delivery": 0.65, late: 0.25 },
};

/* Time to the first euro and the capital needed before it carry the
   most: Bhidé's founders did not start cheap by preference, they
   started with work that paid at once. Margin and terms decide how
   fast the money that does arrive can be put back to work. */
export const FACT_WEIGHT: { [K in keyof Facts]: number } = {
  firstEuro: 0.32,
  upfront: 0.28,
  margin: 0.22,
  terms: 0.18,
};

export function factScore(f: Facts): number {
  return (Object.keys(FACT_WEIGHT) as (keyof Facts)[]).reduce(
    (sum, k) => sum + FACT_SCORE[k][f[k]] * FACT_WEIGHT[k],
    0,
  );
}

/* ── The models ──────────────────────────────────────────────── */

export type ModelId =
  | "consulting"
  | "productized"
  | "service-to-product"
  | "saas-smb"
  | "saas-enterprise"
  | "marketplace"
  | "ecommerce"
  | "hardware"
  | "deeptech"
  | "content"
  | "consumer-free";

export type Archetype = {
  id: ModelId;
  label: string;
  /** One sentence: what you actually sell. */
  what: string;
  facts: Facts;
  /** The honest sentence about funding it yourself. */
  note: string;
  /** The move that makes it fundable by customers anyway. */
  lever: string;
  sources: string[];
};

export const MODELS: Archetype[] = [
  {
    id: "consulting",
    label: "Consulting / done-for-you work",
    what: "You sell your own hours to solve a problem a company already knows it has.",
    facts: { upfront: "none", firstEuro: "now", margin: "high", terms: "on-delivery" },
    note: "The most bootstrappable thing there is: you can invoice in week two, and the only capital at risk is the time you would have spent anyway.",
    lever: "Ask for half up front. It is normal in this business and turns your customers into your bank.",
    sources: ["bhide", "mullins14"],
  },
  {
    id: "productized",
    label: "Productized service",
    what: "The same engagement, fixed scope and fixed price, sold over and over — an audit, a migration, a monthly retainer.",
    facts: { upfront: "none", firstEuro: "now", margin: "high", terms: "upfront" },
    note: "Everything consulting has, plus the part that compounds: the second delivery costs you less than the first, and the price does not drop.",
    lever: "Charge monthly in advance. You get predictable money without having built a product.",
    sources: ["bhide", "mullins14", "winborg"],
  },
  {
    id: "service-to-product",
    label: "Service first, product later",
    what: "You deliver by hand for paying customers, and turn what you keep repeating into software.",
    facts: { upfront: "none", firstEuro: "now", margin: "mixed", terms: "on-delivery" },
    note: "The ladder most bootstrapped software companies actually climbed. Customers pay for the problem while you learn which half of it is worth automating.",
    lever: "Keep the service running longer than feels comfortable. It is the thing paying for the product.",
    sources: ["mullins14", "bhide", "sarasvathy"],
  },
  {
    id: "saas-smb",
    label: "Software for small companies",
    what: "A self-serve subscription at a price a manager can approve without a meeting.",
    facts: { upfront: "small", firstEuro: "months", margin: "high", terms: "upfront" },
    note: "Fundable by customers once it exists — card on file, paid in advance, cheap to serve. The gap is the months before the first subscriber.",
    lever: "Sell annual plans at a discount from day one. A year paid up front funds the next six months of building.",
    sources: ["mullins14", "winborg"],
  },
  {
    id: "saas-enterprise",
    label: "Software for large companies",
    what: "A system a big organisation buys after a pilot, a security review and three meetings you were not in.",
    facts: { upfront: "small", firstEuro: "months", margin: "high", terms: "late" },
    note: "The margin is excellent and the cash cycle is brutal: nine months of selling, then sixty days of payment terms. That gap is what outside money is usually for.",
    lever: "Charge for the pilot. A paid pilot is both revenue and the only reliable proof that they will buy.",
    sources: ["bhide", "winborg", "ebben06"],
  },
  {
    id: "marketplace",
    label: "Marketplace",
    what: "You bring two sides together and take a cut of what they do with each other.",
    facts: { upfront: "small", firstEuro: "months", margin: "high", terms: "upfront" },
    note: "Once it turns, the money is excellent and arrives immediately. Before it turns, you are paying for both sides of an empty room.",
    lever: "Be the supply yourself at the start, in one city or one category, and charge for the match by hand.",
    sources: ["mullins14", "sarasvathy"],
  },
  {
    id: "ecommerce",
    label: "Physical products online",
    what: "You buy or make goods and sell them, one at a time, to people who found you.",
    facts: { upfront: "small", firstEuro: "months", margin: "thin", terms: "upfront" },
    note: "Customers pay immediately, which helps — but inventory eats the money before they do, and every growth step needs more stock than the last.",
    lever: "Pre-sell the batch before you order it. Money in, then goods out, not the other way round.",
    sources: ["mullins14", "winborg"],
  },
  {
    id: "hardware",
    label: "Hardware",
    what: "A physical device that has to be designed, certified, tooled and manufactured before anyone can use it.",
    facts: { upfront: "heavy", firstEuro: "years", margin: "thin", terms: "on-delivery" },
    note: "Not fundable by its own customers in any ordinary way. Tooling and the first production run are due long before revenue exists.",
    lever: "Pre-orders and development contracts: get a customer to pay for the first units as a project, not a product.",
    sources: ["bhide", "winborg"],
  },
  {
    id: "deeptech",
    label: "Deep tech, biotech, regulated",
    what: "Something that needs research, approval or a licence before it may legally be sold.",
    facts: { upfront: "heavy", firstEuro: "years", margin: "high", terms: "late" },
    note: "The one case where bootstrapping is not a choice. Years pass before a sale is permitted, and nobody's customers fund that.",
    lever: "Grants, public research funding and industry partnerships are the bridge. They cost paperwork, not equity.",
    sources: ["winborg", "bhide"],
  },
  {
    id: "content",
    label: "Content, courses, community",
    what: "You sell access to something you made once — a course, a publication, a membership.",
    facts: { upfront: "none", firstEuro: "months", margin: "high", terms: "upfront" },
    note: "Almost no capital, paid in advance, cheap to deliver. What it needs instead is an audience, and that takes the same months the money would have bought.",
    lever: "Sell the thing before you make it. A pre-sale that does not sell has saved you the work.",
    sources: ["mullins14", "sarasvathy"],
  },
  {
    id: "consumer-free",
    label: "Free consumer app",
    what: "Something people use for nothing, paid for later by advertising or a fraction who upgrade.",
    facts: { upfront: "small", firstEuro: "years", margin: "mixed", terms: "late" },
    note: "Revenue arrives after scale, and scale costs money you do not have. This is the model that most needs outside capital and least admits it.",
    lever: "Find the slice who would pay today — a professional version, a paid tier — or accept that this needs a round.",
    sources: ["bhide", "vanacker11"],
  },
];

export const MODEL_BY_ID = Object.fromEntries(MODELS.map((m) => [m.id, m])) as Record<ModelId, Archetype>;

/* ── The conditions you tick ─────────────────────────────────── */

export type CondId = "paid" | "byHand" | "founderSells" | "ownRunway" | "noApproval" | "slowMarket";

export type Condition = {
  id: CondId;
  label: string;
  /** What ticking it means, so nobody ticks it wrongly. */
  hint: string;
  /** How much it moves the verdict. */
  weight: number;
  /** What to do when it is not true. */
  fix: string;
  sources: string[];
};

export const CONDITIONS: Condition[] = [
  {
    id: "paid",
    label: "Someone has already paid us",
    hint: "Real money from someone who is not a friend — a deposit, a pilot fee, a first invoice. A letter of intent does not count.",
    weight: 0.3,
    fix: "Go and get one invoice paid, at any size. Until money has moved, everything here is a plan.",
    sources: ["bhide", "mullins14"],
  },
  {
    id: "byHand",
    label: "We can deliver the first version by hand",
    hint: "You could serve the first ten customers with spreadsheets and your own labour, and they would still get the value.",
    weight: 0.2,
    fix: "Find the manual version of your product. If there isn't one, the months before revenue have to be paid for somehow.",
    sources: ["sarasvathy", "mullins14"],
  },
  {
    id: "founderSells",
    label: "We can do the selling ourselves",
    hint: "The price is high enough to be worth a conversation and low enough not to need a sales team.",
    weight: 0.15,
    fix: "A price that needs a sales organisation needs the capital to build one. Either raise the price or simplify the sale.",
    sources: ["bhide"],
  },
  {
    id: "ownRunway",
    label: "We can go six months without a salary",
    hint: "Savings, part-time work, a partner's income — anything that means the company does not have to pay you yet.",
    weight: 0.15,
    fix: "This is the most common real constraint, and the most fixable: part-time work alongside buys months that no investor can sell you.",
    sources: ["winborg", "ebben06"],
  },
  {
    id: "noApproval",
    label: "Nothing has to be approved before we can sell",
    hint: "No licence, no certification, no regulator standing between you and the first customer.",
    weight: 0.12,
    fix: "Where approval comes first, grants and research funding are the bridge — not customers.",
    sources: ["winborg"],
  },
  {
    id: "slowMarket",
    label: "Nobody is racing us for this market",
    hint: "No funded competitor taking the same customers right now. Growing slowly has to be survivable.",
    weight: 0.08,
    fix: "In a market being taken, slow growth is a decision to lose it. That is the one case where outside money buys something real.",
    sources: ["vanacker11", "bhide"],
  },
];

/* ── Verdict ─────────────────────────────────────────────────── */

export type Verdict = "yes" | "maybe" | "no";

export type BootstrapState = {
  model: ModelId;
  ticked: CondId[];
};

export const EMPTY: BootstrapState = { model: "service-to-product", ticked: [] };

export type Assessment = {
  /** 0–1. Half the business, half what is actually true today. */
  score: number;
  verdict: Verdict;
  headline: string;
  /** The model's own structural score, 0–1. */
  modelScore: number;
  /** The fact that holds this model back most, if any. */
  weakFact: { key: keyof Facts; value: string } | null;
  /** The unticked condition that costs the most. */
  blocker: Condition | null;
  /** Conditions still open, worst first. */
  open: Condition[];
};

export function assess(s: BootstrapState): Assessment {
  const model = MODEL_BY_ID[s.model];
  const modelScore = factScore(model.facts);

  const open = CONDITIONS.filter((c) => !s.ticked.includes(c.id)).sort((a, b) => b.weight - a.weight);
  const condScore = CONDITIONS.filter((c) => s.ticked.includes(c.id)).reduce((n, c) => n + c.weight, 0);

  /* Both halves have to hold. A perfect business you have not sold
     anything in is still a plan, and a signed customer does not fix a
     model that needs a factory. */
  const score = modelScore * 0.5 + condScore * 0.5;

  const faktoren = (Object.keys(FACT_WEIGHT) as (keyof Facts)[])
    .map((k) => ({ key: k, value: model.facts[k], s: FACT_SCORE[k][model.facts[k]] }))
    .sort((a, b) => a.s - b.s);
  const weakFact = faktoren[0].s < 0.5 ? { key: faktoren[0].key, value: faktoren[0].value } : null;

  const verdict: Verdict = score >= 0.62 ? "yes" : score >= 0.38 ? "maybe" : "no";
  const headline =
    verdict === "yes"
      ? "This can pay for itself."
      : verdict === "maybe"
        ? "Possible, but only with discipline about cash."
        : "This one needs money from somewhere else.";

  return { score, verdict, headline, modelScore, weakFact, blocker: open[0] ?? null, open };
}

/** The models, ordered by how well they fund themselves. */
export function byFundability(): Archetype[] {
  return [...MODELS].sort((a, b) => factScore(b.facts) - factScore(a.facts));
}

/* ── Getting money in now ────────────────────────────────────── */

/**
 * What founders actually do when the money is short.
 *
 * Winborg and Landström's categories, written as things you could do
 * this month. Ebben and Johnson found the mix shifts over time: your
 * own money and stretched payment terms early, customer money once
 * the business stands — so the order here is roughly the order you
 * will need them in.
 */
export type Technique = {
  id: string;
  label: string;
  what: string;
  /** Which of Winborg and Landström's families this belongs to. */
  family: string;
  /** How fast it puts money in. */
  speed: string;
  sources: string[];
};

export const TECHNIQUES: Technique[] = [
  {
    id: "service",
    label: "Sell the work before the product",
    family: "Customer-related",
    what: "Do by hand, for money, what the product will do later. You are paid to learn what to build, and the customer is paid back in results.",
    speed: "First invoice in weeks.",
    sources: ["bhide", "mullins14"],
  },
  {
    id: "advance",
    label: "Get paid before you deliver",
    family: "Customer-related",
    what: "Deposits, annual plans at a discount, half up front. The oldest form of startup finance and the only one that costs no equity and no interest.",
    speed: "Immediate, on every new deal.",
    sources: ["winborg", "mullins14"],
  },
  {
    id: "pilot",
    label: "Charge for the pilot",
    family: "Customer-related",
    what: "A free trial proves someone was curious. A paid pilot proves there is a budget — and pays for the month in which you run it.",
    speed: "Weeks, and it qualifies the deal.",
    sources: ["mullins14", "bhide"],
  },
  {
    id: "terms",
    label: "Stretch what you pay out",
    family: "Delaying payments",
    what: "Negotiate supplier terms, pay by card at the end of a cycle, lease instead of buy. Every day between your invoice and theirs is a day of free financing.",
    speed: "Works from the next invoice.",
    sources: ["winborg", "ebben06"],
  },
  {
    id: "chase",
    label: "Stop financing your customers",
    family: "Minimising receivables",
    what: "Invoice the day you deliver, chase on day one of being late, and decline the customer who always pays at ninety days. This is where small companies quietly lend out their runway.",
    speed: "Frees cash within one cycle.",
    sources: ["winborg", "ebben06"],
  },
  {
    id: "share",
    label: "Use what already exists",
    family: "Joint utilisation",
    what: "Shared space, borrowed equipment, someone else's warehouse, a contractor instead of a hire. Capacity without the fixed cost of owning it.",
    speed: "Cuts the monthly number straight away.",
    sources: ["winborg", "sarasvathy"],
  },
  {
    id: "own",
    label: "Buy time with your own money",
    family: "Owner financing",
    what: "Savings, part-time work, a delayed salary. The most used technique in every study, and the one nobody puts in a pitch deck.",
    speed: "Buys months, not revenue.",
    sources: ["ebben06", "winborg"],
  },
  {
    id: "subsidy",
    label: "Take the money that is not equity",
    family: "Subsidy finance",
    what: "Grants, research funding, innovation programmes, tax credits on development. Slow and full of paperwork, and it costs you nothing but time.",
    speed: "Three to nine months from application.",
    sources: ["winborg", "vanacker11"],
  },
];
