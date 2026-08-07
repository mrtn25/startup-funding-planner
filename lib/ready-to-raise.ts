/* ══════════════════════════════════════════════════════════════
   Ready to Raise — investor readiness model.

   Inputs are translated from the "Pre-Call Reality Check" survey
   (German original kept in `de` on each item for reference), turned
   from a linear questionnaire into a board you tick.

   Two layers, same shape as the network-strategy model:
     what you have  →  five readiness dimensions  →  ranked actions

   An action ranks high when the dimensions it repairs are weak AND
   those dimensions matter — so the list is ordered by leverage, not
   by how easy each item is.

   Dimension weights are the opinionated part: access carries the most
   because roughly 60% of deal flow arrives through networks, and
   materials carry the least because the evidence says form matters
   less than founders assume. Both are cited below.
   ══════════════════════════════════════════════════════════════ */

export type DimKey = "access" | "signal" | "clarity" | "material" | "process";
export type GroupKey = DimKey;

export type InputId =
  | "knowInvestors"
  | "vouch"
  | "vouchList"
  | "warmIntros"
  | "existingContacts"
  | "eventsOutreach"
  | "platformOutreach"
  | "coldOutreach"
  | "revenue"
  | "logos"
  | "press"
  | "priorExit"
  | "accelerator"
  | "advisors"
  | "goal"
  | "targetProfile"
  | "grants"
  | "storyTest"
  | "teaser"
  | "deck"
  | "readDeck"
  | "dataroom"
  | "crm"
  | "qa"
  | "list"
  | "adviceFirst"
  | "channelTest";

export type ActionKey =
  | "bench"
  | "listBuild"
  | "sharpenAsk"
  | "signalCraft"
  | "adviceFirst"
  | "materialsCore"
  | "dataroom"
  | "instrument";

/** Every input resolves to a level in [0, 1]. Segmented ones offer a middle. */
export type InputDef = {
  id: InputId;
  group: GroupKey;
  label: string;
  /** Original survey wording, for traceability. */
  de: string;
  /** Present for ordinal items; absent means a plain on/off chip. */
  steps?: { value: number; label: string }[];
  hint?: string;
};

export type ReadyState = Record<InputId, number>;

/* ── Sources ─────────────────────────────────────────────────── */

const scholar = (title: string) => `https://scholar.google.com/scholar?q=${encodeURIComponent(title)}`;

export const SRC: Record<string, [string, string]> = {
  mason04: [
    "Mason & Harrison (2004). Improving access to early stage venture capital in regional economies: a new approach to investment readiness. <em>Local Economy</em> 19(2), 159–173.",
    scholar("Improving access to early stage venture capital in regional economies: a new approach to investment readiness"),
  ],
  masonkwok10: [
    "Mason & Kwok (2010). Investment readiness programmes and access to finance: a critical review of design issues. <em>Local Economy</em> 25(4), 269–292.",
    scholar("Investment readiness programmes and access to finance: a critical review of design issues"),
  ],
  chen09: [
    "Chen, Yao & Kotha (2009). Entrepreneur passion and preparedness in business plan presentations. <em>Academy of Management Journal</em> 52(1), 199–214.",
    scholar("Entrepreneur passion and preparedness in business plan presentations persuasion analysis venture capitalists"),
  ],
  bernstein17: [
    "Bernstein, Korteweg & Laws (2017). Attracting early-stage investors: evidence from a randomized field experiment. <em>Journal of Finance</em> 72(2), 509–538.",
    scholar("Attracting early-stage investors evidence from a randomized field experiment"),
  ],
  maxwell11: [
    "Maxwell, Jeffrey & Lévesque (2011). Business angel early stage decision making. <em>Journal of Business Venturing</em> 26(2), 212–225.",
    scholar("Business angel early stage decision making Maxwell Jeffrey Levesque"),
  ],
  kirsch09: [
    "Kirsch, Goldfarb & Gera (2009). Form or substance: the role of business plans in venture capital decision making. <em>Strategic Management Journal</em> 30(5), 487–515.",
    scholar("Form or substance the role of business plans in venture capital decision making"),
  ],
  clark08: [
    "Clark (2008). The impact of entrepreneurs' oral pitch presentation skills on business angels' initial screening investment decisions. <em>Venture Capital</em> 10(3), 257–279.",
    scholar("impact of entrepreneurs oral pitch presentation skills business angels initial screening"),
  ],
  huang15: [
    "Huang & Pearce (2015). Managing the unknowable: the effectiveness of early-stage investor gut feel. <em>Administrative Science Quarterly</em> 60(4), 634–670.",
    scholar("Managing the unknowable the effectiveness of early-stage investor gut feel"),
  ],
  zott07: [
    "Zott & Huy (2007). How entrepreneurs use symbolic management to acquire resources. <em>Administrative Science Quarterly</em> 52(1), 70–105.",
    scholar("How entrepreneurs use symbolic management to acquire resources"),
  ],
  ko18: [
    "Ko & McKelvie (2018). Signaling for more money: the roles of founders' human capital and investor prominence. <em>Journal of Business Venturing</em> 33(4), 438–454.",
    scholar("Signaling for more money the roles of founders human capital and investor prominence"),
  ],
  plummer16: [
    "Plummer, Allison & Connelly (2016). Better together? Signaling interactions in new venture pursuit of initial external capital. <em>Academy of Management Journal</em> 59(5), 1585–1604.",
    scholar("Better together signaling interactions in new venture pursuit of initial external capital"),
  ],
  drover17: [
    "Drover, Busenitz, Matusik, Townsend, Anglin & Dushnitsky (2017). A review and road map of entrepreneurial equity financing research. <em>Journal of Management</em> 43(6), 1820–1853.",
    scholar("A review and road map of entrepreneurial equity financing research"),
  ],
  gompers20: [
    "Gompers, Gornall, Kaplan & Strebulaev (2020). How do venture capitalists make decisions? <em>Journal of Financial Economics</em> 135(1), 169–190.",
    "https://www.sciencedirect.com/science/article/abs/pii/S0304405X19301680",
  ],
  shane02: [
    "Shane & Cable (2002). Network ties, reputation, and the financing of new ventures. <em>Management Science</em> 48(3), 364–381.",
    "https://pubsonline.informs.org/doi/abs/10.1287/mnsc.48.3.364.7731",
  ],
  hallen12: [
    "Hallen & Eisenhardt (2012). Catalyzing strategies and efficient tie formation. <em>Academy of Management Journal</em> 55(1), 35–70.",
    "https://journals.aom.org/doi/10.5465/amj.2009.0620",
  ],
  persist10: [
    "Gompers, Kovner, Lerner & Scharfstein (2010). Performance persistence in entrepreneurship. <em>Journal of Financial Economics</em> 96(1), 18–32.",
    "https://www.sciencedirect.com/science/article/abs/pii/S0304405X09002311",
  ],
};

/* ── Dimensions ──────────────────────────────────────────────── */

export const DIMS: { key: DimKey; label: string; blurb: string; sources: string[] }[] = [
  {
    key: "access",
    label: "Access",
    blurb:
      "Whether you can reach the people who write cheques at all. Over 30% of deal flow comes through professional networks and another ~20% through co-investor referral, against roughly 10% inbound — so this is the dimension with the most raw throughput behind it.",
    sources: ["gompers20", "shane02", "hallen12"],
  },
  {
    key: "signal",
    label: "Signals",
    blurb:
      "Third-party-verifiable evidence an investor can check cheaply. Bernstein, Korteweg & Laws randomised what information investors saw and found they respond strongly to information about the <strong>team</strong> — and much less to traction or lead-investor detail than founders expect.",
    sources: ["bernstein17", "zott07", "ko18", "plummer16"],
  },
  {
    key: "clarity",
    label: "Clarity of the ask",
    blurb:
      "Knowing what you are raising, what it buys, and who it is for. Chen, Yao & Kotha analysed VC funding decisions and found <strong>preparedness</strong> — not passion — predicted funding interest. Angels also screen by elimination: one unresolved flaw ends the conversation.",
    sources: ["chen09", "maxwell11", "clark08"],
  },
  {
    key: "material",
    label: "Materials",
    blurb:
      "The artefacts: teaser, deck, read-deck, data room, Q&A. Deliberately the <strong>lowest-weighted</strong> dimension here — Kirsch, Goldfarb & Gera found the formal plan carried little weight in VC decisions relative to the relationship the deal arrived through. Necessary, not sufficient, and easy to over-invest in.",
    sources: ["kirsch09", "mason04", "clark08"],
  },
  {
    key: "process",
    label: "Process",
    blurb:
      "Whether the raise is run as a process — a ranked list, tracked conversations, tested channels — or improvised. This is the operational half of what investment-readiness programmes actually teach.",
    sources: ["mason04", "masonkwok10", "hallen12"],
  },
];

/** How much each dimension contributes to the headline score. Sums to 1. */
export const DIM_WEIGHT: Record<DimKey, number> = {
  access: 0.3,
  signal: 0.25,
  clarity: 0.2,
  process: 0.15,
  material: 0.1,
};

export const GROUP_LABEL: Record<GroupKey, string> = {
  access: "Access & relationships",
  signal: "Signals you already have",
  clarity: "Clarity of the ask",
  material: "Materials",
  process: "Process & discipline",
};

/* ── Inputs ──────────────────────────────────────────────────── */

export const INPUTS: InputDef[] = [
  // Access
  {
    id: "knowInvestors",
    group: "access",
    label: "I personally know investors who could write a cheque",
    de: "Wie nah stehst du potenziellen Investor/innen?",
  },
  {
    id: "vouch",
    group: "access",
    label: "People vouch for me with investors",
    de: "Hast du Personen, die dich aktiv bei Investor/innen empfehlen (vouchen)?",
    steps: [
      { value: 0, label: "No one" },
      { value: 0.5, label: "If I ask" },
      { value: 1, label: "Proactively" },
    ],
  },
  {
    id: "vouchList",
    group: "access",
    label: "I can name 3+ specific people who would vouch",
    de: "Liste 3–10 Personen auf, die für dich vouchen könnten",
    hint: "Named, not theoretical — if you can't list them, you don't have them yet.",
  },
  {
    id: "warmIntros",
    group: "access",
    label: "I'm getting warm introductions",
    de: "Wie hast du bisher Investor/innen angesprochen? — Warm Introductions",
  },
  {
    id: "existingContacts",
    group: "access",
    label: "I'm working existing contacts directly",
    de: "… Bestandskontakte (WhatsApp)",
  },
  {
    id: "eventsOutreach",
    group: "access",
    label: "I meet investors at events",
    de: "… Ansprache auf Events",
  },
  {
    id: "platformOutreach",
    group: "access",
    label: "I use investor platforms (OpenVC etc.)",
    de: "… Ansprache auf Plattformen (z. B. OpenVC)",
  },
  {
    id: "coldOutreach",
    group: "access",
    label: "I do cold outreach (email / LinkedIn)",
    de: "… Kaltakquise (E-Mail/Telefon/LinkedIn)",
    hint: "Counts for something, but it is the lowest-yield channel in the data.",
  },

  // Signals
  { id: "revenue", group: "signal", label: "Revenue / MRR", de: "Umsatz / MRR" },
  { id: "logos", group: "signal", label: "Recognisable customers", de: "Namhafte Kund/innen" },
  { id: "press", group: "signal", label: "Press / awards", de: "Presse / Awards" },
  { id: "priorExit", group: "signal", label: "A prior exit", de: "Frühere Exits" },
  { id: "accelerator", group: "signal", label: "Accelerator / programme", de: "Accelerator / Programme" },
  { id: "advisors", group: "signal", label: "Well-known advisors", de: "Bekannte Berater/innen" },

  // Clarity
  {
    id: "goal",
    group: "clarity",
    label: "The raise target is defined",
    de: "Hast du ein klares Finanzierungs-Ziel definiert?",
    steps: [
      { value: 0, label: "Not yet" },
      { value: 0.5, label: "Rough idea" },
      { value: 1, label: "Amount + use of funds" },
    ],
  },
  {
    id: "targetProfile",
    group: "clarity",
    label: "I know which investors fit — stage, ticket, sector, region",
    de: "Welche Investor/innen passen strategisch zu dir?",
  },
  { id: "grants", group: "clarity", label: "I've considered grants / non-dilutive", de: "Hast du auch über Grants nachgedacht?" },
  { id: "storyTest", group: "clarity", label: "I'm testing different storylines", de: "Verschiedene Storylines (Industrie Insider vs Outsider)" },

  // Materials
  { id: "teaser", group: "material", label: "Teaser deck (2 minutes)", de: "Teaser Deck (2 Minuten)" },
  { id: "deck", group: "material", label: "Pitch deck (15+ slides)", de: "Pitch Deck (≥15 Folien)" },
  { id: "readDeck", group: "material", label: "Read-deck to share after meetings", de: "Read-Deck (Post-Meeting zum Teilen)" },
  { id: "dataroom", group: "material", label: "Data room with access control", de: "Datenraum mit Freigabe-Optionen" },
  { id: "crm", group: "material", label: "Investor CRM set up", de: "Investor CRM aufgesetzt" },
  { id: "qa", group: "material", label: "Investor Q&A document", de: "Investor Q&A Fragebogen" },

  // Process
  {
    id: "list",
    group: "process",
    label: "Structured investor list",
    de: "Hast du eine strukturierte Investorenliste?",
    steps: [
      { value: 0, label: "Not yet" },
      { value: 0.5, label: "50–200, unsorted" },
      { value: 1, label: "≥50, ranked" },
    ],
  },
  {
    id: "adviceFirst",
    group: "process",
    label: "I run advice-first conversations",
    de: "Casual Dating mit Investoren (asking for advice not for money)",
  },
  { id: "channelTest", group: "process", label: "I'm testing outreach channels", de: "Outreach Kanäle" },
];

export const INPUT_BY_ID = Object.fromEntries(INPUTS.map((i) => [i.id, i])) as Record<InputId, InputDef>;

/** Input → dimension weights. An input can feed more than one dimension. */
export const W1: Partial<Record<InputId, Partial<Record<DimKey, number>>>> = {
  knowInvestors: { access: 1.0 },
  vouch: { access: 0.9, signal: 0.3 },
  vouchList: { access: 0.7, process: 0.2 },
  warmIntros: { access: 0.8 },
  existingContacts: { access: 0.5 },
  eventsOutreach: { access: 0.4 },
  platformOutreach: { access: 0.3 },
  coldOutreach: { access: 0.15, process: 0.2 },

  revenue: { signal: 1.0 },
  logos: { signal: 0.9 },
  press: { signal: 0.4 },
  priorExit: { signal: 1.0, access: 0.4 },
  accelerator: { signal: 0.6, access: 0.4 },
  advisors: { signal: 0.6, access: 0.4 },

  goal: { clarity: 1.0 },
  targetProfile: { clarity: 0.8, process: 0.3 },
  grants: { clarity: 0.3 },
  storyTest: { clarity: 0.6, process: 0.2 },

  teaser: { material: 1.0 },
  deck: { material: 0.8 },
  readDeck: { material: 0.7 },
  dataroom: { material: 0.6 },
  crm: { material: 0.4, process: 0.6 },
  qa: { material: 0.5, clarity: 0.2 },

  list: { process: 1.0 },
  adviceFirst: { process: 0.6, access: 0.5 },
  channelTest: { process: 0.5 },
};

/* ── Actions ─────────────────────────────────────────────────── */

export type ActionDef = {
  key: ActionKey;
  label: string;
  /** Which dimensions this repairs, and how strongly. */
  fixes: Partial<Record<DimKey, number>>;
  why: string;
  steps: string[];
  sources: string[];
  /** Suggests jumping to another tool on the site. */
  crossLink?: { tool: "network" | "planner"; label: string };
};

export const ACTIONS: ActionDef[] = [
  {
    key: "bench",
    label: "Build a voucher bench",
    fixes: { access: 1.0, signal: 0.3 },
    why: "Ties matter because they transfer private information about founder reliability — not merely because they are contacts. A referrer the partner already trusts does work no deck can do.",
    steps: [
      "Write down every person who could credibly vouch for you. Not funds — <strong>people</strong>. Aim for ten names.",
      "For each, note which investors they can actually reach. If you can't answer that, the name is aspirational and doesn't count.",
      "Give each of them a five-line forwardable blurb: what you do, the one number that matters, what you're raising, and the specific person you want to reach.",
      "Ask for double opt-in — let them check the investor wants the intro before it is sent. It protects the relationship and roughly doubles the reply rate in practice.",
      "Re-contact everyone who introduced you within a week. The evidence is blunt here: exposure without follow-up produces nothing.",
    ],
    sources: ["shane02", "gompers20"],
    crossLink: { tool: "network", label: "Work out which route into a network fits your profile" },
  },
  {
    key: "listBuild",
    label: "Build and rank the investor list",
    fixes: { process: 1.0, clarity: 0.4, access: 0.3 },
    why: "An unranked list is a to-do list, not a strategy. Investment-readiness programmes converge on this as the first operational step because everything downstream — sequencing, messaging, follow-up — depends on it.",
    steps: [
      "Get to 50+ genuinely relevant names, filtered by stage, ticket size, sector and region. Below 50 you'll run out before you've learned anything.",
      "For each fund, name the <strong>specific partner</strong> who leads your stage and sector. Firms don't invest; partners do.",
      "Rank into three tiers by fit, not fame. Tier 3 goes first so you're practised by the time you reach tier 1.",
      "Add a path column: warm intro / broker / event / cold. Any name without a path is a research task, not an outreach task.",
      "Track first contact, second meeting and outcome. Time-to-second-meeting is the metric that tells you whether the story is landing.",
    ],
    sources: ["mason04", "masonkwok10", "gompers20"],
  },
  {
    key: "sharpenAsk",
    label: "Sharpen the ask",
    fixes: { clarity: 1.0, material: 0.3 },
    why: "Preparedness — a specific, defensible ask — predicted VC funding interest where passion did not. Angels screen by elimination, so a vague number is not a neutral omission; it is a reason to stop reading.",
    steps: [
      "Fix one number and what it buys: “€1.2M for two engineers and go-to-market through Q3 next year”, not “around one to two million”.",
      "Write the 18-month milestone that money reaches, and the metric that proves it. That milestone is what you are actually selling.",
      "Define the investor profile you want: stage, ticket, sector, region. It's the filter for everything else and it's the question every intro request needs answered.",
      "Prepare answers to the three questions most likely to kill the deal, before anyone asks them. Unresolved flaws end first screenings.",
      "Check whether non-dilutive money covers part of it — grants change the ask and the dilution story.",
    ],
    sources: ["chen09", "maxwell11", "clark08"],
    crossLink: { tool: "planner", label: "Model what that raise costs you in dilution" },
  },
  {
    key: "signalCraft",
    label: "Manufacture a verifiable signal",
    fixes: { signal: 1.0, clarity: 0.2 },
    why: "Investors respond to information they can check cheaply, and the randomised evidence says team information moves them most. Where your own record is thin, borrowed credibility — advisors, angels, named design partners — carries a similar signal.",
    steps: [
      "Pick the one signal you could genuinely earn in the next 60 days: a named design partner, a first paying customer, a recognisable advisor.",
      "Prefer a customer logo over press. It is harder to get and much harder to discount.",
      "If your own track record is thin, borrow: two or three advisors with recognisable affiliations do measurable work.",
      "Make every signal verifiable in one click — logos on the site, advisors named publicly, metrics defined so they can't be read as inflated.",
      "Lead with the team. That is the information the experimental evidence says investors actually move on.",
    ],
    sources: ["bernstein17", "zott07", "ko18", "persist10"],
  },
  {
    key: "adviceFirst",
    label: "Run advice-first conversations",
    fixes: { access: 0.8, process: 0.5, clarity: 0.3 },
    why: "Asking for advice rather than money converts a cold ask into a low-stakes conversation, and gives you the timing and attention that catalyzing strategies depend on. It is also the cheapest way to test a story before it matters.",
    steps: [
      "Pick ten investors you are <em>not</em> ready to pitch. Ask each for 20 minutes on a specific question you genuinely have.",
      "Ask something only they can answer — about their portfolio, their thesis, a market they've seen. Generic questions read as a disguised pitch.",
      "Close with: “who else should I be learning from?” That one question is what turns a conversation into a chain of introductions.",
      "Send a short update to everyone you spoke to six to eight weeks later, showing what you did with their advice. This is the single highest-yield fundraising habit.",
      "When you do open the round, they already know you — you are re-contacting, not cold-starting.",
    ],
    sources: ["hallen12", "huang15", "shane02"],
  },
  {
    key: "materialsCore",
    label: "Ship the teaser + read-deck pair",
    fixes: { material: 1.0, clarity: 0.3 },
    why: "Two artefacts do most of the work: something forwardable in two minutes, and something that survives being read without you in the room. The formal plan matters less than founders assume — build the minimum that lets a conversation travel.",
    steps: [
      "Teaser first: 5–8 slides someone can forward without explaining you. This is the one that actually gets sent.",
      "Read-deck second: the version that answers the obvious questions on its own, for after the meeting.",
      "The 15-slide presentation deck is third, and only exists for live meetings. Don't start here — most founders do, and it's the least-used artefact.",
      "One number per slide, defined precisely. Ambiguous metrics get discounted to zero.",
      "Stop when these exist and go back to outreach. Polishing materials is the most comfortable way to avoid raising.",
    ],
    sources: ["kirsch09", "clark08", "mason04"],
  },
  {
    key: "dataroom",
    label: "Set up the data room and Q&A",
    fixes: { material: 0.9, process: 0.4 },
    why: "Diligence stalls kill momentum that took months to build. Having answers ready shortens the gap between interest and decision, which is where most early-stage rounds quietly die.",
    steps: [
      "One folder, access-controlled, with cap table, incorporation docs, key contracts, metrics and the financial model.",
      "Write the investor Q&A before diligence: the 20 questions you know are coming, answered in writing.",
      "Use per-investor access links so you can see who actually opened what — real interest is visible in the logs.",
      "Keep the metrics file to one source of truth. Two versions of a number in a data room is a credibility problem, not a formatting problem.",
    ],
    sources: ["mason04", "drover17"],
  },
  {
    key: "instrument",
    label: "Instrument the funnel",
    fixes: { process: 1.0, signal: 0.2 },
    why: "A raise is a funnel with a small number of conversions. Without tracking you cannot tell a story problem from a targeting problem, and you will spend the round changing the wrong thing.",
    steps: [
      "Put every conversation in one CRM — a spreadsheet is fine. Stage, path, owner, next step, date.",
      "Test two storylines against comparable halves of your list. Reply rate answers the question that opinion cannot.",
      "Watch time-to-second-meeting rather than meetings booked. Momentum shows up there first.",
      "Set a weekly outreach quota and a review slot. Discipline, not volume, is what separates raises that close.",
      "If reply rates are fine but second meetings aren't happening, the problem is the story, not the list.",
    ],
    sources: ["masonkwok10", "hallen12"],
  },
];

/* ── Model ───────────────────────────────────────────────────── */

export type ScoredAction = { key: ActionKey; def: ActionDef; priority: number };

export type ReadyResult = {
  dim: Record<DimKey, number>;
  /** 0–100 headline readiness. */
  score: number;
  band: { key: "early" | "building" | "close" | "ready"; label: string; note: string };
  /** Weakest dimension by weighted shortfall; null once nothing is meaningfully short. */
  bottleneck: DimKey | null;
  actions: ScoredAction[];
  anySelected: boolean;
};

export function initialReadyState(): ReadyState {
  return Object.fromEntries(INPUTS.map((i) => [i.id, 0])) as ReadyState;
}

/** Maximum achievable raw score per dimension — used to normalise. */
const DIM_MAX: Record<DimKey, number> = (() => {
  const max = { access: 0, signal: 0, clarity: 0, material: 0, process: 0 } as Record<DimKey, number>;
  INPUTS.forEach((i) => {
    const w = W1[i.id] ?? {};
    (Object.keys(w) as DimKey[]).forEach((d) => (max[d] += w[d]!));
  });
  return max;
})();

/** The most headline score any single action could recover, used to scale priorities. */
const MAX_REACH = Math.max(
  ...ACTIONS.map((a) => (Object.keys(a.fixes) as DimKey[]).reduce((s, d) => s + a.fixes[d]! * DIM_WEIGHT[d], 0)),
);

const BANDS = [
  { key: "early" as const, min: 0, label: "Not raising yet", note: "There is groundwork to do before outreach pays off. Fix the top item first — starting now mostly burns the contacts you have." },
  { key: "building" as const, min: 35, label: "Building", note: "The foundations are forming. Keep going on the top two items; a raise opened now would be slower than it needs to be." },
  { key: "close" as const, min: 60, label: "Close", note: "Close enough that momentum matters more than polish. Clear the top item, then open the round rather than perfecting the rest." },
  { key: "ready" as const, min: 80, label: "Ready to raise", note: "Nothing structural is missing. From here the binding constraint is sequencing and timing, not readiness." },
];

export function compute(state: ReadyState): ReadyResult {
  const dim = { access: 0, signal: 0, clarity: 0, material: 0, process: 0 } as Record<DimKey, number>;

  INPUTS.forEach((i) => {
    const level = state[i.id] ?? 0;
    if (!level) return;
    const w = W1[i.id] ?? {};
    (Object.keys(w) as DimKey[]).forEach((d) => (dim[d] += w[d]! * level));
  });

  (Object.keys(dim) as DimKey[]).forEach((d) => {
    dim[d] = DIM_MAX[d] > 0 ? Math.min(1, dim[d] / DIM_MAX[d]) : 0;
  });

  const score = Math.round(
    (Object.keys(DIM_WEIGHT) as DimKey[]).reduce((a, d) => a + dim[d] * DIM_WEIGHT[d], 0) * 100,
  );

  /* An action's priority is the ABSOLUTE weighted shortfall of the dimensions
     it repairs — points of headline score it could recover.

     It deliberately is not normalised by the action's own reach: dividing by
     that would cancel DIM_WEIGHT out and let an action addressing an empty but
     lightly-weighted dimension outrank one addressing the real bottleneck.
     Scaling by the largest reach any action has keeps the 0–100 range while
     preserving magnitude, so the numbers stay comparable across actions. */
  const actions: ScoredAction[] = ACTIONS.map((def) => {
    const need = (Object.keys(def.fixes) as DimKey[]).reduce(
      (a, d) => a + def.fixes[d]! * (1 - dim[d]) * DIM_WEIGHT[d],
      0,
    );
    return { key: def.key, def, priority: Math.round((need / MAX_REACH) * 100) };
  }).sort((a, b) => b.priority - a.priority);

  const weakest = (Object.keys(DIM_WEIGHT) as DimKey[]).reduce((worst, d) =>
    (1 - dim[d]) * DIM_WEIGHT[d] > (1 - dim[worst]) * DIM_WEIGHT[worst] ? d : worst,
  );
  // With nothing meaningfully short there is no bottleneck to name.
  const bottleneck = dim[weakest] >= 0.999 ? null : weakest;

  const band = [...BANDS].reverse().find((b) => score >= b.min)!;

  return { dim, score, band, bottleneck, actions, anySelected: INPUTS.some((i) => (state[i.id] ?? 0) > 0) };
}

/* ── Investor priorities → who to target ─────────────────────── */

export type PrioKey = "ticket" | "network" | "reputation" | "hnwi" | "speed" | "fit";

export const PRIORITIES: { key: PrioKey; label: string; de: string; hint: string }[] = [
  {
    key: "ticket",
    label: "Minimum ticket of €50k",
    de: "Mindestticketgröße von 50k",
    hint: "“I don't want 10k tickets that cost me six weeks of work.”",
  },
  {
    key: "network",
    label: "Industry network",
    de: "Industrie Netzwerk",
    hint: "“Our investors should know potential customers too.”",
  },
  {
    key: "reputation",
    label: "Reputation",
    de: "Reputation",
    hint: "“I want known angels so VCs and press notice us.”",
  },
  {
    key: "hnwi",
    label: "Deep pockets (follow-on)",
    de: "High Net Worth Individual",
    hint: "“I don't want to start from zero next round — they should be able to follow on.”",
  },
  {
    key: "speed",
    label: "Speed of decision",
    de: "Geschwindigkeit und Entscheidungsprozess",
    hint: "“I don't mind who it is, as long as they decide quickly.”",
  },
  {
    key: "fit",
    label: "Personal fit",
    de: "Persönlicher Fit",
    hint: "“I have to enjoy having lunch with them, or I don't want them on the cap table.”",
  },
];

export type Archetype = { key: string; label: string; blurb: string; watch: string };

const ARCHETYPES: (Archetype & { w: Partial<Record<PrioKey, number>> })[] = [
  {
    key: "leadAngel",
    label: "Lead angel with follow-on capacity",
    blurb:
      "One individual who can write a meaningful first cheque and keep writing. Anchors the round and spares you re-starting from zero next time.",
    watch: "Ask directly what they have reserved for follow-on. “I usually follow on” is not a reserve.",
    w: { ticket: 1.0, hnwi: 1.0, speed: 0.3 },
  },
  {
    key: "operator",
    label: "Operator angel in your vertical",
    blurb:
      "Someone who has built in your market and whose address book contains your customers. Their introductions are worth more than their money.",
    watch: "Agree what “helping” means before the cheque — customer intros, or advice you didn't ask for.",
    w: { network: 1.0, fit: 0.4, ticket: 0.2 },
  },
  {
    key: "marquee",
    label: "Marquee name for signalling",
    blurb:
      "A recognisable investor whose participation makes the next conversation easier. You are buying a credential as much as capital.",
    watch: "A famous name with a small cheque can still anchor your round — but only if they let you use it publicly.",
    w: { reputation: 1.0, hnwi: 0.4, network: 0.3 },
  },
  {
    key: "soloDecider",
    label: "Solo decision-makers",
    blurb:
      "Individual angels and solo GPs who can say yes without a partner meeting. The fastest path to a first close and to momentum.",
    watch: "Speed cuts both ways — a fast yes from someone who did no diligence is a weaker signal to the next investor.",
    w: { speed: 1.0, ticket: 0.3 },
  },
  {
    key: "partner",
    label: "Long-horizon partner",
    blurb:
      "Chemistry over pedigree. Someone you would willingly call on the worst day of the company, which is when it actually counts.",
    watch: "Run reference calls with founders they backed who <em>struggled</em>, not the ones who did well.",
    w: { fit: 1.0, network: 0.3, hnwi: 0.2 },
  },
];

export function rankArchetypes(prio: Record<PrioKey, number>): (Archetype & { score: number })[] {
  return ARCHETYPES.map((a) => {
    let raw = 0;
    let total = 0;
    (Object.keys(a.w) as PrioKey[]).forEach((p) => {
      // Priorities are 1–5; centre at 3 so "unimportant" pushes an archetype down.
      raw += a.w[p]! * ((prio[p] - 1) / 4);
      total += a.w[p]!;
    });
    const { w: _w, ...rest } = a;
    return { ...rest, score: total > 0 ? Math.round((raw / total) * 100) : 0 };
  }).sort((x, y) => y.score - x.score);
}

export function initialPriorities(): Record<PrioKey, number> {
  return { ticket: 3, network: 3, reputation: 3, hnwi: 3, speed: 3, fit: 3 };
}
