/* ══════════════════════════════════════════════════════════════
   What the data actually says, and what it does not.

   Every figure here is one I could trace to a named source: a
   peer-reviewed paper, a working paper, or a government series. The
   numbers that circulate loudest in this space — "90 % of startups
   fail", unicorn league tables, founder-archetype infographics —
   mostly cannot be traced anywhere, so they are not here. An empty
   slot is more useful than a confident invention.

   The most commonly abused figure is survival. The government series
   measures *all new employer establishments*, which is overwhelmingly
   restaurants, salons and contractors — not venture-backed startups.
   It is a real number about a different population, and quoting it as
   a startup failure rate is the single most frequent misuse of
   business statistics in a pitch deck.
   ══════════════════════════════════════════════════════════════ */

export const SRC: Record<string, [string, string]> = {
  sbaBls: [
    "U.S. Small Business Administration, Office of Advocacy — tabulation of the Bureau of Labor Statistics <em>Business Employment Dynamics</em> series, averaged 1994–2022.",
    "https://www.bls.gov/bdm/",
  ],
  vcImpact: [
    "Gornall, W. &amp; Strebulaev, I. — <em>The Economic Impact of Venture Capital: Evidence from Public Companies.</em> Stanford GSB working paper.",
    "https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2681841",
  ],
  unicorns: [
    "Gornall, W. &amp; Strebulaev, I. (2020). <em>Squaring Venture Capital Valuations with Reality.</em> Journal of Financial Economics 135(1), 120–143.",
    "https://www.nber.org/papers/w23895",
  ],
  persistence: [
    "Gompers, P., Kovner, A., Lerner, J. &amp; Scharfstein, D. (2010). <em>Performance Persistence in Entrepreneurship.</em> Journal of Financial Economics 96(1), 18–32.",
    "https://www.newyorkfed.org/medialibrary/media/research/economists/kovner/performance_persistence.pdf",
  ],
  decisions: [
    "Gompers, P., Gornall, W., Kaplan, S. &amp; Strebulaev (2020). <em>How do venture capitalists make decisions?</em> Journal of Financial Economics 135(1), 169–190 — a survey of 885 institutional VCs.",
    "https://www.nber.org/papers/w22587",
  ],
  founderEquity: [
    "Wasserman, N. &amp; Hoang, T. — <em>The First Deal: The Division of Founder Equity in New Ventures.</em> NBER Working Paper 16922.",
    "https://www.nber.org/system/files/working_papers/w16922/w16922.pdf",
  ],
};

/** Share of new employer establishments still trading after n years. */
export const SURVIVAL: { year: number; share: number }[] = [
  { year: 0, share: 1 },
  { year: 1, share: 0.779 },
  { year: 2, share: 0.677 },
  { year: 5, share: 0.492 },
  { year: 10, share: 0.339 },
];

export type Stat = {
  id: string;
  /** The number, already formatted — these are quoted, not computed. */
  value: string;
  label: string;
  /** What it actually measures, including what it does not. */
  detail: string;
  sources: string[];
  size?: "s" | "m" | "l";
};

export const VC_SHARE: { label: string; share: number; note: string }[] = [
  { label: "US market capitalisation", share: 0.41, note: "of every listed dollar" },
  { label: "R&D spending", share: 0.62, note: "of public-company research" },
  { label: "Patent value", share: 0.48, note: "across the whole sample" },
];

/** The same measures, restricted to companies young enough for VC to have existed. */
export const VC_SHARE_MODERN: { label: string; share: number }[] = [
  { label: "By number", share: 0.5 },
  { label: "By value", share: 0.75 },
  { label: "R&D spending", share: 0.92 },
  { label: "Patent value", share: 0.93 },
];

export const STATS: Stat[] = [
  {
    id: "survival-5",
    value: "49 %",
    label: "of new US businesses reach year five",
    detail:
      "Averaged across 1994–2022. Note what this counts: every new employer establishment, overwhelmingly restaurants, shops and contractors. It is not a startup failure rate, and using it as one is the most common misuse of business statistics in a deck — venture-backed companies are a tiny, unrepresentative slice of this population.",
    sources: ["sbaBls"],
    size: "l",
  },
  {
    id: "survival-10",
    value: "34 %",
    label: "reach year ten",
    detail:
      "And of those that reach five, roughly seven in ten reach ten. The hazard is heavily front-loaded: surviving the early years changes the odds substantially.",
    sources: ["sbaBls"],
  },
  {
    id: "vc-marketcap",
    value: "41 %",
    label: "of US public market value is VC-backed",
    detail:
      "Venture capital funds a vanishingly small share of companies and ends up owning a large share of the value — the clearest statement of how skewed the outcomes are. Among companies young enough for venture capital to have existed when they started, it is around three quarters by value.",
    sources: ["vcImpact"],
    size: "l",
  },
  {
    id: "vc-rd",
    value: "62 %",
    label: "of public-company R&D spending",
    detail:
      "Rising to 92 % if you look only at companies founded after 1968. Whatever else venture capital does, it concentrates in the part of the economy that does the research.",
    sources: ["vcImpact"],
  },
  {
    id: "unicorn-gap",
    value: "48 %",
    label: "average overvaluation of unicorn headline numbers",
    detail:
      "Across 135 US unicorns, reported post-money valuations averaged 48 % above fair value once the preference terms were priced properly. Common shares — the founders' and employees' class, which carries none of the protections — were 56 % overvalued. After adjusting, 65 of the 135 no longer cleared a billion at all. The headline number and the number your shares are worth are different numbers.",
    sources: ["unicorns"],
    size: "l",
  },
  {
    id: "pedigree",
    value: "Yes, but",
    label: "does a prior success predict the next one?",
    detail:
      "It does — founders with a track record succeed at a materially higher rate than first-timers, and than those who failed before. The more interesting finding is what happens to the VC's contribution: a top-tier investor measurably improves the odds for a first-time or previously-failed founder, and makes no measurable difference for one who has already succeeded. The pedigree and the investor are partly substitutes.",
    sources: ["persistence"],
    size: "l",
  },
  {
    id: "equal-splits",
    value: "73 %",
    label: "of founding teams split equity equally",
    detail:
      "Usually within a month of founding. Teams who landed there by default rather than by negotiation were markedly likelier to be unhappy with it later, and much less able to renegotiate when it mattered.",
    sources: ["founderEquity"],
  },
  {
    id: "vc-survey",
    value: "885",
    label: "VCs surveyed on how they actually decide",
    detail:
      "The team ranks above the market for most of them, deal flow comes overwhelmingly through networks rather than inbound, and the great majority of the value they expect comes from a handful of investments. The last point is the arithmetic behind every conversation about market size.",
    sources: ["decisions"],
  },
];

/* Deliberately absent: a geographic breakdown of unicorns. The published
   counts come from commercial trackers with proprietary, shifting inclusion
   rules and no methodology anyone can check, and a map is exactly the format
   that makes unverifiable numbers look authoritative. */
export const OMITTED = {
  title: "What is not here, and why",
  body: "There is no unicorn map and no founder-archetype breakdown. The counts that circulate come from commercial trackers with proprietary inclusion rules that change without notice, and a map is precisely the format that lends unverifiable numbers an air of authority. If a figure could not be traced to a paper or a government series, it was left out rather than dressed up.",
};
