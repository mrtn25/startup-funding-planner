/* ══════════════════════════════════════════════════════════════
   Exit Strategies — the ways out, and what each one asks of you.

   The honest frame first: an exit is not a goal, it is something that
   happens to a company worth owning. DeTienne, McKelvie and Chandler
   show the exit route a founder plans follows from what they wanted
   in the first place — money, autonomy, or something that outlasts
   them — not the other way round. And the base rates are unkind:
   most companies never have a harvest exit at all, and among those
   that do, acquisitions outnumber public offerings many times over.

   So this tool does not rank routes by payout. It takes what you want
   and what you have built, and says which doors are actually open,
   what each one costs, and what it would take to open it — including
   the uncomfortable answer that the open door is "keep running it".

   Three families, after DeTienne et al. (2015):
     harvest      — turn the thing into money
     stewardship  — hand it to someone who keeps it alive
     cessation    — stop, on your own terms

   Pure functions, no DOM — see exits.test.ts.
   ══════════════════════════════════════════════════════════════ */

const scholar = (title: string) => `https://scholar.google.com/scholar?q=${encodeURIComponent(title)}`;

export const SRC: Record<string, [string, string]> = {
  detienne15: [
    "DeTienne, McKelvie &amp; Chandler (2015). <em>Making sense of entrepreneurial exit strategies: a typology and test.</em> Journal of Business Venturing 30(2), 255–272. The three families used here — financial harvest, stewardship, voluntary cessation — and the finding that the route follows the founder's original motivation.",
    "https://ideas.repec.org/a/eee/jbvent/v30y2015i2p255-272.html",
  ],
  wennberg10: [
    "Wennberg, Wiklund, DeTienne &amp; Cardon (2010). <em>Reconceptualizing entrepreneurial exit: divergent exit routes and their drivers.</em> Journal of Business Venturing 25(4), 361–375. Separates exits that harvest value from exits made under distress — the same door, a very different price.",
    scholar("Reconceptualizing entrepreneurial exit divergent exit routes and their drivers"),
  ],
  detienne10: [
    "DeTienne (2010). <em>Entrepreneurial exit as a critical component of the entrepreneurial process.</em> Journal of Business Venturing 25(2), 203–215. Exit as part of the process rather than its failure state.",
    "https://effectuation.org/hubfs/Journal%20Articles/2017/05/Entrepreneurial-exit-as-a-critical-component-of-the-entrepreneurial-process-Theoretical-development-%E2%98%86.pdf",
  ],
  graebner04: [
    "Graebner &amp; Eisenhardt (2004). <em>The seller's side of the story: acquisition as courtship and governance as syndicate in entrepreneurial firms.</em> Administrative Science Quarterly 49(3), 366–403. Twelve technology ventures: sales were set off by ordinary strategic moments — a CEO search, a funding round — and the seller chose the buyer.",
    "https://www.jstor.org/stable/4131440",
  ],
  graebner09: [
    "Graebner (2009). <em>Caveat venditor: trust asymmetries in acquisitions of entrepreneurial firms.</em> Academy of Management Journal 52(3), 435–472. What a seller is promised before signing and what happens afterwards are not the same thing.",
    scholar("Caveat venditor trust asymmetries in acquisitions of entrepreneurial firms"),
  ],
  kerr14: [
    "Kerr, Nanda &amp; Rhodes-Kropf (2014). <em>Entrepreneurship as experimentation.</em> Journal of Economic Perspectives 28(3), 25–48. Roughly three quarters of US venture-backed firms funded 1986–1997 had shut down by 2007.",
    "https://www.aeaweb.org/articles?id=10.1257/jep.28.3.25",
  ],
  hall10: [
    "Hall &amp; Woodward (2010). <em>The burden of the nondiversifiable risk of entrepreneurship.</em> American Economic Review 100(3), 1163–1194. Of venture-backed startups, roughly 9 % reached an IPO and about a quarter were acquired; the rest ended or went unfunded.",
    "https://www.aeaweb.org/articles?id=10.1257/aer.100.3.1163",
  ],
  ritter: [
    "Ritter, J. (2026). <em>Initial public offerings: updated statistics.</em> University of Florida, updated annually. The running count of how few companies list in a given year, and at what size.",
    "https://site.warrington.ufl.edu/ritter/files/IPO-Statistics.pdf",
  ],
  battisti13: [
    "Battisti &amp; Okamuro (2013). <em>Selling, passing on or closing? Determinants of entrepreneurial intentions on exit modes.</em> Hitotsubashi University. Owner age, firm size and whether a successor exists predict the intended exit — profitability does not.",
    scholar("Selling passing on or closing determinants of entrepreneurial intentions on exit modes"),
  ],
  eot: [
    "Nuttall (2012). <em>Sharing Success: the Nuttall Review of Employee Ownership.</em> UK Department for Business — and, for Germany, the steward-ownership (<em>Verantwortungseigentum</em>) model. Employee and steward ownership pay the founder out over years instead of at once.",
    "https://www.gov.uk/government/publications/nuttall-review-of-employee-ownership",
  ],
  eta: [
    "Ruback &amp; Yudkoff (2017). <em>HBR Guide to Buying a Small Business.</em> Harvard Business Review Press. The search-fund route: an individual raises money specifically to buy and then run one small company.",
    "https://hbr.org/product/hbr-guide-to-buying-a-small-business/10031",
  ],
};

/* ── What you want, and what you have ────────────────────────── */

/** Why you are in this. The strongest predictor of the route you take. */
export type Motive = "money" | "autonomy" | "legacy" | "step-back";

export const MOTIVES: { key: Motive; label: string; blurb: string }[] = [
  { key: "money", label: "A single payout", blurb: "You want the value you built turned into money, and then to do something else." },
  { key: "autonomy", label: "Independence", blurb: "You want to decide what you work on and for how long. Selling is a means, not the point." },
  { key: "legacy", label: "It should outlast you", blurb: "The customers, the people, the thing itself — it should still be there without you." },
  { key: "step-back", label: "Out of the day job", blurb: "You no longer want to run it. You do not want it to stop either." },
];

export type Owner = "founders" | "angels" | "vc";
export type Size = "small" | "mid" | "large";
export type Growth = "flat" | "steady" | "steep";

export const OWNERS: { key: Owner; label: string; hint: string }[] = [
  { key: "founders", label: "Us", hint: "No outside shareholders, or only tiny ones." },
  { key: "angels", label: "Us and angels", hint: "Private investors, no fund with a return clock." },
  { key: "vc", label: "A fund is in", hint: "Venture capital, with the expectations that come with it." },
];

export const SIZES: { key: Size; label: string; hint: string }[] = [
  { key: "small", label: "Under €1m", hint: "Annual revenue." },
  { key: "mid", label: "€1m – €10m", hint: "Annual revenue." },
  { key: "large", label: "Over €10m", hint: "Annual revenue." },
];

export const GROWTHS: { key: Growth; label: string; hint: string }[] = [
  { key: "flat", label: "Flat", hint: "Roughly the same as last year." },
  { key: "steady", label: "Steady", hint: "Growing, at a pace you could explain." },
  { key: "steep", label: "Steep", hint: "Doubling or better." },
];

export type ExitState = {
  motive: Motive;
  owner: Owner;
  size: Size;
  growth: Growth;
  /** Do you want to still be working in it afterwards? */
  stay: boolean;
  /** Is there anyone inside who could take it over? */
  successor: boolean;
  /** Do partners, customers or competitors already talk to you? */
  relationships: boolean;
  /** Does it fund itself out of its own profit? */
  selfFunding: boolean;
};

export const EMPTY: ExitState = {
  motive: "autonomy",
  owner: "founders",
  size: "small",
  growth: "steady",
  stay: true,
  successor: false,
  relationships: false,
  selfFunding: false,
};

/* ── The routes ──────────────────────────────────────────────── */

export type Family = "harvest" | "stewardship" | "cessation" | "none";

export const FAMILIES: { key: Family; label: string; blurb: string }[] = [
  { key: "harvest", label: "Turn it into money", blurb: "The value is paid out once. You are out afterwards — fully or in stages." },
  { key: "stewardship", label: "Hand it over", blurb: "The company keeps going without you at the top. You get paid over years, not on one day." },
  { key: "cessation", label: "End it", blurb: "You stop before someone decides it for you. Done in order, that is not a failure." },
  { key: "none", label: "Keep it", blurb: "No exit. It is yours and it pays you something every year." },
];

export type Route = {
  id: string;
  label: string;
  family: Family;
  /** One sentence: what actually happens. */
  what: string;
  /** Who is on the other side. */
  who: string;
  /** How often this really occurs. */
  frequency: string;
  /** How long you have to work at it beforehand. */
  leadTime: string;
  /** What it costs you — not in percent, in truth. */
  price: string;
  /** The mistake almost everyone makes. */
  trap: string;
  sources: string[];
  /** How well it fits your situation, 0–100, and why. */
  fit: (s: ExitState) => { score: number; because: string };
};

const If = (b: boolean, yes: number, no: number) => (b ? yes : no);

export const ROUTES: Route[] = [
  {
    id: "strategic",
    label: "Strategic acquisition",
    family: "harvest",
    what: "A company in your industry buys you because you have something it lacks: a product, customers, a team, a way into a market.",
    who: "Competitors, suppliers, customers, platforms — almost always someone you already had dealings with.",
    frequency: "By far the most common exit. Acquisitions outnumber public offerings several times over.",
    leadTime: "One to three years. Not negotiation — relationship.",
    price: "Earn-out and a stay clause: part of the price depends on you staying two or three years and hitting targets you no longer fully control.",
    trap: "Running a process with bankers before a single buyer is interested. These deals come out of a relationship, not an auction.",
    sources: ["graebner04", "graebner09", "hall10"],
    fit: (s) => ({
      score:
        40 +
        If(s.relationships, 25, -10) +
        If(s.motive === "money", 15, 0) +
        If(s.growth === "steep", 10, 0) +
        If(s.owner === "vc", 10, 0) +
        If(s.size === "small", -10, 5),
      because: s.relationships
        ? "You already talk to people in the industry — that is exactly where these deals come from."
        : "Nobody in the industry knows you yet. That is two years of work, not a two-month process.",
    }),
  },
  {
    id: "financial",
    label: "Sale to a financial buyer",
    family: "harvest",
    what: "A buyout fund takes the majority because the business throws off predictable profit. It tightens the company and sells it again in four to seven years.",
    who: "Private equity, mid-market holdings, and increasingly succession holdings buying up small profitable firms.",
    frequency: "Normal from roughly €1–2m of recurring profit — profit, not revenue.",
    leadTime: "About a year: clean numbers, a managing director who is not you, contracts without surprises.",
    price: "The price follows profit, not the story. And you are selling to someone whose next move is cutting costs.",
    trap: "Assuming growth is what counts here. What counts is how boring and repeatable the profit is.",
    sources: ["wennberg10", "battisti13"],
    fit: (s) => ({
      score:
        20 +
        If(s.selfFunding, 30, -20) +
        If(s.size === "large", 25, s.size === "mid" ? 10 : -15) +
        If(s.motive === "money", 15, 0) +
        If(s.owner === "founders", 10, -5),
      because: s.selfFunding
        ? "You have what this buyer looks at: profit that comes back every year."
        : "While the company burns money there is nothing here to buy — this buyer buys profit, not potential.",
    }),
  },
  {
    id: "ipo",
    label: "Going public",
    family: "harvest",
    what: "The company sells shares to the public. You do not get out — you get a market for your shares, at the earliest once the lock-up ends.",
    who: "Institutional investors, through banks.",
    frequency: "Rare. Of venture-backed companies roughly nine in a hundred list, and most companies never raise venture capital at all.",
    leadTime: "Two to four years, and a scale almost nobody in Europe reaches.",
    price: "Quarterly numbers, disclosure, and an organisation that spends a third of its time reporting.",
    trap: "Treating it as an exit. It is a financing round with an audience.",
    sources: ["hall10", "ritter", "kerr14"],
    fit: (s) => ({
      /* Auch im besten Fall unter dem strategischen Verkauf: es gibt
         vielfach mehr Übernahmen als Börsengänge. */
      score: If(s.owner === "vc", 20, 0) + If(s.size === "large", 20, -20) + If(s.growth === "steep", 15, -15),
      because:
        s.size === "large" && s.growth === "steep"
          ? "The order of magnitude is at least in the right region. It is still the rarest route on this list."
          : "You are a zero or two short. That is not a weakness — it is the distribution.",
    }),
  },
  {
    id: "acquihire",
    label: "The team gets bought",
    family: "harvest",
    what: "Someone buys the people, not the product. You get employment contracts with a bonus; your customers get an email with a deadline.",
    who: "Larger technology companies that want to hire faster than they could on their own.",
    frequency: "More common than founders admit, usually when the money runs short — the price of a failed round.",
    leadTime: "Weeks. That is the point: it arrives when there is no time left.",
    price: "Little is left for investors and a salary for you. The product gets switched off.",
    trap: "Selling it as a win. Customers notice, and so does the market.",
    sources: ["wennberg10", "graebner09"],
    fit: (s) => ({
      /* Das hier passiert, wenn eine Runde scheitert — also nur, wenn
         es Investoren gibt, die ein Ergebnis brauchen. */
      score:
        5 +
        If(!s.selfFunding, 20, -15) +
        If(s.owner !== "founders", 15, -5) +
        If(s.size === "small", 10, -10) +
        If(s.growth === "flat", 10, 0),
      because: s.selfFunding
        ? "While you fund yourself, you do not need this door."
        : "When money gets short this is the door that opens first — and pays least.",
    }),
  },
  {
    id: "secondary",
    label: "Sell shares, keep the company",
    family: "harvest",
    what: "You sell part of your own shares to an investor and take money off the table without giving up the company.",
    who: "Existing or incoming investors, usually alongside a financing round.",
    frequency: "Normal from seed or Series A onwards, in small amounts — investors dislike it in large ones.",
    leadTime: "Rides along with a round that is happening anyway.",
    price: "The optics of taking money out while others put money in. In return, your decisions stop being driven by fear.",
    trap: "Too much at once. Ten to twenty percent of your holding reads as sensible; more answers questions nobody asked.",
    sources: ["detienne10", "wennberg10"],
    fit: (s) => ({
      score: 20 + If(s.owner !== "founders", 25, -15) + If(s.motive === "money", 15, 0) + If(s.stay, 15, -10),
      because: s.stay
        ? "The only route where you see money and still carry on."
        : "If you want to stop anyway, this solves half the problem.",
    }),
  },
  {
    id: "mbo",
    label: "Management buys you out",
    family: "stewardship",
    what: "People already inside take over the company, paid for out of what it earns from then on.",
    who: "Your own management, often with a bank or a silent partner behind them.",
    frequency: "In Germany the standard case for succession in established mid-sized firms.",
    leadTime: "Two to five years: someone has to grow into the role first.",
    price: "You get paid over years rather than on one day, and carry some of the risk that it works without you.",
    trap: "Starting too late. Looking for a successor at 62 means selling below value or closing.",
    sources: ["detienne15", "battisti13"],
    fit: (s) => ({
      score:
        25 +
        If(s.successor, 35, -20) +
        If(s.motive === "step-back" || s.motive === "legacy", 20, 0) +
        If(s.selfFunding, 15, -15),
      because: s.successor
        ? "Someone inside could do it. That is the rare ingredient here."
        : "The person is missing. You do not find them — you grow them, over years.",
    }),
  },
  {
    id: "employee",
    label: "Hand it to the people who run it",
    family: "stewardship",
    what: "Ownership moves to the staff — through an employee trust, a cooperative, or steward ownership.",
    who: "Your own employees, a foundation, or both.",
    frequency: "Established in the UK and the US; in Germany growing through steward ownership.",
    leadTime: "A year or two of structuring, plus time to finance the payout.",
    price: "Less than a strategic sale would pay. In exchange the company stays the thing it is.",
    trap: "Treating it as a gift. It is a financing: somebody has to pay you out, usually the company itself, over years.",
    sources: ["eot", "detienne15"],
    fit: (s) => ({
      score: 20 + If(s.motive === "legacy", 35, -5) + If(s.selfFunding, 20, -20) + If(s.owner === "founders", 15, -20),
      because:
        s.owner === "founders"
          ? "Because the company is yours, this is yours to decide."
          : "With investors on the cap table this only works if they are bought out — and they expect something else.",
    }),
  },
  {
    id: "successor",
    label: "Sell to a single owner-operator",
    family: "stewardship",
    what: "One person buys your company in order to run it, often having raised money specifically to do that.",
    who: "Successors from the industry, search funds, individual buyers.",
    frequency: "A growing market for companies doing €1–5m, the ones no fund calls about.",
    leadTime: "Six to eighteen months, provided the company runs without you.",
    price: "The price depends on how little the company depends on you. Every customer relationship held in your name lowers it.",
    trap: "Being the bottleneck. If you decide everything, you are selling your job, not your company.",
    sources: ["eta", "battisti13"],
    fit: (s) => ({
      score:
        25 +
        If(s.selfFunding, 25, -20) +
        If(s.size !== "small", 20, -5) +
        If(!s.stay, 15, -5) +
        If(s.owner === "founders", 10, -15),
      because: s.selfFunding
        ? "A company that earns money and runs without you is exactly what this buyer wants."
        : "This buyer is buying a running business, not a plan.",
    }),
  },
  {
    id: "winddown",
    label: "Close it in order",
    family: "cessation",
    what: "You stop while there is still money: customers get notice, contracts get settled, whatever has value gets sold.",
    who: "Nobody. That is the point: this is the one route on the list with no counterparty to convince.",
    frequency: "More common than every sale combined. Around three quarters of venture-backed companies end roughly this way.",
    leadTime: "Three to six months, if you start early enough. Wait, and the choice is gone.",
    price: "None in the literal sense — which is exactly why nobody talks about it.",
    trap: "Carrying on too long. Between an orderly close and an insolvency lie about six months of deciding.",
    sources: ["kerr14", "wennberg10", "detienne15"],
    fit: (s) => ({
      score: 10 + If(!s.selfFunding, 25, -10) + If(s.growth === "flat", 20, -5) + If(s.size === "small", 10, -5),
      because: s.selfFunding
        ? "Listed so you have seen it. It is not your situation."
        : "It is a decision, not a defeat — and it only gets worse by being postponed.",
    }),
  },
  {
    id: "keep",
    label: "Keep it and take the profit",
    family: "none",
    what: "No exit. The company is yours, pays out something every year, and you keep deciding.",
    who: "You, for as long as you want it — and your co-founders, who have to want the same thing.",
    frequency: "The majority of companies in the world. Nobody writes about them.",
    leadTime: "None. It is the default when you do nothing — as long as the company funds itself.",
    price: "Your shares are worth a lot on paper and nothing in your hand until someone buys them.",
    trap: "Treating it as a holding pattern. Plan that way and you underinvest in the things that carry a company for ten years.",
    sources: ["detienne15", "detienne10"],
    fit: (s) => ({
      score: 25 + If(s.selfFunding, 35, -15) + If(s.motive === "autonomy", 25, 0) + If(s.owner === "founders", 15, -25),
      because:
        s.motive === "autonomy"
          ? "You want independence. This is the only route that does not eventually sign it away."
          : s.selfFunding
            ? "The company funds itself, which makes doing nothing a real option rather than an excuse."
            : "Without profit of your own this is not a decision, it is a deadline.",
    }),
  },
];

export const ROUTE_BY_ID = Object.fromEntries(ROUTES.map((r) => [r.id, r])) as Record<string, Route>;

/** The routes, ordered by how well they fit this situation. */
export function ranked(s: ExitState): { route: Route; score: number; because: string }[] {
  return ROUTES.map((route) => {
    const { score, because } = route.fit(s);
    return { route, score: Math.max(0, Math.min(100, score)), because };
  }).sort((a, b) => b.score - a.score || a.route.label.localeCompare(b.route.label));
}

/* ── How a strategic buyer comes about ───────────────────────── */

/**
 * The part most founders mistake for negotiation.
 *
 * Graebner and Eisenhardt followed twelve sales of technology
 * ventures: they were set off by ordinary moments — a funding round,
 * a search for a CEO — and the buyer was almost always someone there
 * was already a relationship with. A sale process does not create a
 * buyer. It only sorts the ones that already exist.
 */
export type Approach = {
  id: string;
  label: string;
  what: string;
  /** How long until it is worth anything. */
  horizon: string;
  sources: string[];
};

export const APPROACHES: Approach[] = [
  {
    id: "integration",
    label: "Plug into their product",
    what: "Build the integration into the system your customers already use. Appear on a larger company's product map and you get discussed there.",
    horizon: "Works after six to twelve months.",
    sources: ["graebner04"],
  },
  {
    id: "co-sell",
    label: "Sell alongside them",
    what: "A partner carries you in their offering. Their sales people learn what you are worth before their engineers propose rebuilding it.",
    horizon: "Shows up within the first year.",
    sources: ["graebner04"],
  },
  {
    id: "corpdev",
    label: "Talk to corporate development without selling",
    what: "Large companies employ people whose job is watching. Two conversations a year, with nothing to sell, build the familiarity an offer later comes out of.",
    horizon: "Two years before it is worth anything.",
    sources: ["graebner04", "graebner09"],
  },
  {
    id: "strategic-investor",
    label: "Take a strategic investor",
    what: "A corporate takes a small stake. That makes them your most likely buyer — and makes you look spoken for to every other buyer.",
    horizon: "Immediate, in both directions.",
    sources: ["graebner04", "graebner09"],
  },
  {
    id: "visible",
    label: "Be visible in your industry",
    what: "Trade press, talks, associations. Buyers do not search databases; they ask people they know who is good.",
    horizon: "Continuous, pays from year two.",
    sources: ["graebner04"],
  },
  {
    id: "clean",
    label: "Stay sellable",
    what: "A clean cap table, no verbal promises, customer contracts that survive a change of control. None of this sells anything — it stops an offer dying in diligence.",
    horizon: "Ongoing. Only expensive if you leave it until the end.",
    sources: ["graebner09"],
  },
];

/* ── The warning up front ────────────────────────────────────── */

/**
 * Why the exit should not be the plan.
 *
 * Not as a moral, but because that is what the numbers say: the way
 * out follows what you wanted going in, and most companies never walk
 * through any of these doors.
 */
export const CAVEATS: { title: string; text: string; sources: string[] }[] = [
  {
    title: "The strategy follows the motive, not the other way round",
    text: "Founders driven by money end up at sales and listings; founders who care about autonomy hand the company on rather than hand it over. Which also means: planning an exit that does not match your motive is years of working against yourself.",
    sources: ["detienne15"],
  },
  {
    title: "Most companies never reach an exit",
    text: "About three quarters of US venture-backed firms funded in the late eighties and nineties had closed twenty years later, and of those that got through, roughly one in eleven went public. A plan that only works if someone buys you is usually not a plan.",
    sources: ["kerr14", "hall10"],
  },
  {
    title: "Buyers do not buy an intention to sell",
    text: "Across twelve studied sales, not one was set off by a sale process — it was ordinary strategic moments and existing relationships. A company that wants to be bought is easier to spot than a company that is good, and it is paid less.",
    sources: ["graebner04"],
  },
  {
    title: "The difference is timing, not route",
    text: "The same door — sale, succession, closure — pays very differently depending on whether you walk through it by choice or under pressure. The work is not in picking the route. It is in still having the choice.",
    sources: ["wennberg10"],
  },
];
