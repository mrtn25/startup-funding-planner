/* ══════════════════════════════════════════════════════════════
   The vocabulary of a term sheet, in plain words.

   Every entry answers the same three questions: what it is, why it
   exists, and what it does to you. The third is the one term sheets
   are quietest about — a clause is rarely hostile in itself, it is
   hostile in combination with a bad outcome, and that is exactly the
   case nobody models before signing.

   `size` is a layout hint. The grid packs densely, so the mix of
   sizes is what stops a glossary from reading like a wall.
   ══════════════════════════════════════════════════════════════ */

/* ── Sources ──────────────────────────────────────────────────
   Peer-reviewed work and primary documents only. Where a term is a
   practitioner convention with no research behind it — the SaaS
   metrics mostly are — the entry says so rather than dressing a blog
   post up as evidence. An invented citation is worse than an honest
   "this is convention".
   ────────────────────────────────────────────────────────────── */

export const SRC: Record<string, [string, string]> = {
  kaplanStromberg: [
    "Kaplan, S. &amp; Strömberg, P. (2003). <em>Financial Contracting Theory Meets the Real World: An Empirical Analysis of Venture Capital Contracts.</em> Review of Economic Studies 70(2), 281–315 — the empirical study of what is actually in VC contracts.",
    "https://www.nber.org/papers/w7660",
  ],
  gornallStrebulaev: [
    "Gornall, W. &amp; Strebulaev, I. (2020). <em>Squaring Venture Capital Valuations with Reality.</em> Journal of Financial Economics 135(1), 120–143 — 135 unicorns; reported post-money valuations average 48 % above fair value, common shares 56 % overvalued.",
    "https://www.nber.org/papers/w23895",
  ],
  sahlman: [
    "Sahlman, W. (1990). <em>The structure and governance of venture-capital organizations.</em> Journal of Financial Economics 27(2), 473–521 — fund lifecycle, carried interest, why the portfolio maths works as it does.",
    "https://doi.org/10.1016/0304-405X(90)90065-8",
  ],
  gompers: [
    "Gompers, P., Gornall, W., Kaplan, S. &amp; Strebulaev, I. (2020). <em>How do venture capitalists make decisions?</em> Journal of Financial Economics 135(1), 169–190 — survey of 885 VCs on sourcing, diligence and deal selection.",
    "https://www.nber.org/papers/w22587",
  ],
  wassermanHoang: [
    "Wasserman, N. &amp; Hoang, T. <em>The First Deal: The Division of Founder Equity in New Ventures.</em> NBER Working Paper 16922 — 1,476 founders across 511 ventures.",
    "https://www.nber.org/system/files/working_papers/w16922/w16922.pdf",
  ],
  bhide: [
    "Bhidé, A. (1992). <em>Bootstrap Finance: The Art of Start-ups.</em> Harvard Business Review 70(6) — 100 companies from the Inc. 500.",
    "https://hbr.org/1992/11/bootstrap-finance-the-art-of-start-ups",
  ],
  nvca: [
    "National Venture Capital Association — <em>Model Legal Documents.</em> The primary source for what a standard clause actually says.",
    "https://nvca.org/model-legal-documents/",
  ],
};

export type Category = "deal" | "money" | "ownership" | "metrics" | "process";

export const CATEGORIES: { key: Category; label: string; color: string }[] = [
  { key: "deal", label: "Deal terms", color: "#2200FF" },
  { key: "ownership", label: "Ownership", color: "#7c3aed" },
  { key: "money", label: "The money", color: "#00B5AD" },
  { key: "metrics", label: "Metrics", color: "#a8cf12" },
  { key: "process", label: "Process", color: "#d85a30" },
];

export type Entry = {
  id: string;
  term: string;
  category: Category;
  /** One line, the definition. */
  short: string;
  /** The body — why it exists and what it does to you. */
  body: string;
  /** A worked number, where one makes the point better than prose. */
  example?: string;
  size: "s" | "m" | "l" | "wide";
  /** Keys into SRC. Empty where the term is a practitioner convention. */
  sources?: string[];
  /** Set where there is no research behind the term, only usage. */
  convention?: string;
  /** Tool that lets you play with it. */
  tool?: { id: string; label: string };
};

export const ENTRIES: Entry[] = [
  {
    id: "liquidation-preference",
    term: "Liquidation preference",
    category: "deal",
    size: "l",
    sources: ["kaplanStromberg", "gornallStrebulaev", "nvca"],
    short: "Who gets paid first when the company is sold, and how much before anyone else sees anything.",
    body: "A 1× preference means investors take their money back off the top before the ordinary shares — the founders' shares — get anything. It exists because investors buy a minority stake at a price that only makes sense if the upside is real; the preference is their protection against a mediocre exit being sold as a success. It costs you nothing in a good outcome and everything in a mediocre one. The two words that matter are participating and non-participating.",
    example:
      "2 M€ invested at a 1× non-participating preference, company sold for 6 M€ with investors holding 30 %: they take the higher of 2 M€ or 30 % of 6 M€ = 1.8 M€ — so 2 M€, and 4 M€ is left. Make it participating and they take 2 M€ first and then 30 % of the remaining 4 M€ on top: 3.2 M€, leaving you 2.8 M€.",
    tool: { id: "planner", label: "Model it in the Dilution Planner" },
  },
  {
    id: "participating",
    term: "Participating vs non-participating",
    category: "deal",
    size: "m",
    sources: ["kaplanStromberg", "gornallStrebulaev"],
    short: "Whether the preference is instead of the pro-rata share, or on top of it.",
    body: "Non-participating: investors choose the better of their money back or their percentage. Participating — sometimes called double dip — they get both. The difference only shows up in mid-range exits, which is where most exits actually happen.",
  },
  {
    id: "pre-post-money",
    term: "Pre-money vs post-money",
    category: "money",
    size: "m",
    sources: ["gornallStrebulaev"],
    short: "The valuation before the new money goes in, and after.",
    body: "Post-money = pre-money + the round. The percentage sold is round ÷ post-money, never ÷ pre-money. Agreeing a number without saying which one you mean is the most expensive ambiguity in early-stage fundraising.",
    example: "4 M€ pre + 1 M€ round = 5 M€ post. The investor owns 1 ÷ 5 = 20 %, not 25 %.",
  },
  {
    id: "dilution",
    term: "Dilution",
    category: "ownership",
    size: "s",
    sources: ["kaplanStromberg"],
    short: "Your percentage shrinks because new shares exist, not because yours were taken.",
    body: "You keep every share you had. There are simply more of them in total. A smaller slice of a bigger pie is the whole argument for raising at all.",
    tool: { id: "planner", label: "Dilution Planner" },
  },
  {
    id: "esop",
    term: "ESOP / option pool",
    category: "ownership",
    size: "m",
    sources: ["kaplanStromberg"],
    short: "Shares set aside for employees — and usually carved out of your side, not the investor's.",
    body: "Investors ask for a pool to be created before their money goes in, which means it comes out of the pre-money valuation and therefore dilutes the founders alone. Negotiating whether the pool sits pre- or post-money is worth as much as several points of valuation.",
    example: "A 10 % pool created pre-money on a 4 M€ pre effectively values you at 3.6 M€.",
  },
  {
    id: "safe",
    term: "SAFE / convertible note",
    category: "money",
    size: "l",
    sources: ["kaplanStromberg", "nvca"],
    short: "Money now, price later. It is equity with the valuation postponed — not debt, and not non-dilutive.",
    body: "You take the cash and agree the ownership at the next priced round. It is faster and cheaper than a priced round, which is why it dominates pre-seed. The catch is that you do not know what you have sold until later, and stacking several notes with different caps can dilute you far past what any single one implied.",
    tool: { id: "planner", label: "See it convert in the Dilution Planner" },
  },
  {
    id: "valuation-cap",
    term: "Valuation cap",
    category: "money",
    size: "m",
    sources: ["gornallStrebulaev", "nvca"],
    short: "The highest valuation at which a note converts — the note-holder's reward for early risk.",
    body: "If the next round prices above the cap, the note converts as though the valuation were the cap, so the early investor gets more shares for the same money. A low cap on a round that goes well is where founders discover they sold more than they thought.",
    example: "500 k€ note, 5 M€ cap, next round prices at 15 M€: the note converts at 5 M€ — three times the shares.",
  },
  {
    id: "discount",
    term: "Discount",
    category: "money",
    size: "s",
    sources: ["nvca"],
    short: "A percentage off the next round's price, for having gone first.",
    body: "Typically 15–25 %. Where a note has both a cap and a discount, whichever is better for the investor applies.",
  },
  {
    id: "anti-dilution",
    term: "Anti-dilution",
    category: "deal",
    size: "m",
    sources: ["kaplanStromberg", "nvca"],
    short: "Protection for investors if the next round prices lower than theirs.",
    body: "Broad-based weighted average is the market standard and adjusts their price partially. Full ratchet re-prices their entire holding as if they had paid the new, lower price — brutal in a down round and worth refusing.",
  },
  {
    id: "pro-rata",
    term: "Pro-rata rights",
    category: "deal",
    size: "s",
    sources: ["kaplanStromberg", "nvca"],
    short: "The right, not the obligation, to keep their percentage by investing in later rounds.",
    body: "Standard and usually fine. It matters when a later lead wants a bigger slice than the round leaves available.",
  },
  {
    id: "vesting",
    term: "Vesting & cliff",
    category: "ownership",
    size: "m",
    sources: ["kaplanStromberg", "wassermanHoang"],
    short: "Founders earn their own shares back over time, typically four years with a one-year cliff.",
    body: "Leave before the cliff and you keep nothing. It exists to protect the co-founders who stay — and each other — far more than it protects the investor. Agreeing it between founders before anyone asks is a sign of seriousness, not paranoia.",
  },
  {
    id: "drag-tag",
    term: "Drag-along & tag-along",
    category: "deal",
    size: "m",
    sources: ["kaplanStromberg", "nvca"],
    short: "Drag: a majority can force you to sell with them. Tag: you can insist on selling alongside them.",
    body: "Tag-along protects minorities, drag-along protects a sale from being blocked by a holdout. Look at the threshold that triggers a drag — it decides who can actually sell the company.",
  },
  {
    id: "down-round",
    term: "Down round",
    category: "process",
    size: "s",
    sources: ["gornallStrebulaev", "kaplanStromberg"],
    short: "Raising at a lower valuation than last time.",
    body: "Triggers anti-dilution, resets everyone's expectations, and is survivable. Running out of cash is not.",
  },
  {
    id: "bridge",
    term: "Bridge",
    category: "process",
    size: "s",
    sources: ["sahlman"],
    short: "A small round between rounds, usually to reach a milestone that makes the real round possible.",
    body: "A bridge to somewhere is sensible. A bridge to nowhere is the same instrument with no milestone attached.",
  },
  {
    id: "term-sheet",
    term: "Term sheet",
    category: "process",
    size: "m",
    sources: ["kaplanStromberg", "nvca"],
    short: "A mostly non-binding summary of the deal — and in practice the moment the deal is decided.",
    body: "Almost nothing in it is legally binding except confidentiality and exclusivity, yet renegotiating a term after signing costs enormous goodwill. Read the economics and the control clauses with equal care; founders tend to read only the valuation.",
  },
  {
    id: "runway",
    term: "Runway & burn",
    category: "metrics",
    size: "s",
    sources: ["bhide"],
    short: "Months of cash left at the current net burn.",
    body: "Cash ÷ monthly net burn. Below six months your negotiating position is gone, which is why raising starts long before you need it.",
    tool: { id: "round", label: "Round Planner" },
  },
  {
    id: "burn-multiple",
    term: "Burn multiple",
    category: "metrics",
    size: "m",
    convention: "A practitioner convention with no research behind it — useful as a shared yardstick, not as evidence.",
    short: "Net burn divided by net new ARR — how much you spend to add a euro of recurring revenue.",
    body: "Under 1× is exceptional, 1–2× good, above 3× means growth is being bought rather than earned. It is the single number that most reliably separates efficient growth from expensive growth.",
  },
  {
    id: "ltv-cac",
    term: "LTV : CAC",
    category: "metrics",
    size: "m",
    convention: "A practitioner convention. The customer-lifetime-value maths is well established in marketing research; the 3:1 threshold is a rule of thumb, not a finding.",
    short: "What a customer is worth over their life, against what they cost to win.",
    body: "Below 1 you lose money on every customer. Around 3 is the conventional threshold for scaling acquisition. The ratio is only as honest as the churn assumption inside the LTV — and early on, nobody knows their churn.",
  },
  {
    id: "arr",
    term: "ARR / MRR",
    category: "metrics",
    size: "s",
    convention: "Definitional rather than researched — but how it is counted is exactly what auditors and investors dispute.",
    short: "Annual or monthly recurring revenue — contracted and repeating, not one-off.",
    body: "One-off project fees are revenue but not ARR. Counting them as ARR is the most common way a deck overstates a business.",
  },
  {
    id: "lead-investor",
    term: "Lead investor",
    category: "process",
    size: "m",
    sources: ["gompers"],
    short: "The investor who sets the terms, does the deepest diligence, and usually takes the largest cheque.",
    body: "A round without a lead rarely closes: everyone else is waiting for someone to price it. Finding the lead is most of the work of a round; the rest follows quickly once one exists.",
    tool: { id: "network", label: "Network Strategy" },
  },
  {
    id: "power-law",
    term: "Power law & fund maths",
    category: "process",
    size: "wide",
    sources: ["sahlman", "gompers"],
    short: "Why an investor who likes you can still say no — and why they ask about a market you find implausibly large.",
    body: "A venture fund returns its capital from a very small number of investments; most of the portfolio returns little or nothing. That arithmetic means every single investment has to be capable, on its own, of returning the whole fund. A company that will plausibly be worth 30 M€ is a good business and a bad fit for a 100 M€ fund — not because anyone doubts it, but because it cannot move the fund even if it works perfectly. Knowing the fund's size and age tells you more about your odds than any pitch feedback will.",
    tool: { id: "bootstrap", label: "Or don't raise at all — Bootstrap" },
  },
  {
    id: "diligence",
    term: "Due diligence",
    category: "process",
    size: "s",
    sources: ["gompers"],
    short: "The verification between a term sheet and money in the bank.",
    body: "Cap table, contracts, IP assignment, employment. Most delays are missing paperwork, not bad news — having it ready is free speed.",
  },
];
