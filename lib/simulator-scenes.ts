/* ══════════════════════════════════════════════════════════════
   Two chapters of the founder simulator, as content.

   Every choice here is one somebody actually faces, and none of them
   is the obviously right one — a scene with a correct answer teaches
   nothing except that the author had an opinion. What each choice
   carries instead is a line about what it does in reality, and where
   the site can compute the thing properly, a pointer to the tool that
   does it. The game is the hook; the calculator is the help.

   The numbers are deliberately coarse. This is a model of a decision,
   not a forecast, and the moment it pretends to four significant
   figures it is lying.
   ══════════════════════════════════════════════════════════════ */

import type { Chapter, Ending, GameState, Scene } from "./simulator.ts";
import { fmtEuro } from "./simulator.ts";

export const CHAPTERS: Chapter[] = [
  { number: 1, title: "The idea", subtitle: "Two people, one evening, no company yet", firstScene: "c1-split" },
  { number: 2, title: "The first money", subtitle: "Somebody finally wants to give you some", firstScene: "c2-angel" },
];

export const SCENES: Scene[] = [
  /* ── Chapter 1 ───────────────────────────────────────────── */
  {
    id: "c1-split",
    chapter: 1,
    place: "Your kitchen, 23:40",
    title: "You and Jonas have something",
    text: "Four evenings in and the prototype does the one thing you promised it would. Jonas says the sentence that makes it real: “Let's do this properly.” Then the question neither of you wants to open — who owns what.",
    speaker: "Jonas",
    image: "kitchen-night",
    choices: [
      {
        id: "handshake",
        label: "50/50 on a handshake",
        detail: "Fastest, and you both feel good tonight",
        effects: { investors: -5 },
        months: 1,
        reality:
          "Roughly three quarters of teams split equally, and the research finding is not that equal is wrong. It is that arriving there by default rather than by argument made teams markedly likelier to be unhappy later — and markedly less able to change it once the work had turned out to be uneven.",
        tool: { id: "split", label: "Split it by contribution instead" },
        next: "c1-job",
      },
      {
        id: "weighted",
        label: "Argue it out, with vesting",
        detail: "An evening of discomfort and a document",
        effects: { investors: 12, customers: -2 },
        months: 2,
        reality:
          "Vesting is the first thing an investor checks and the only protection either of you has if one leaves in month seven. Four years with a one-year cliff is the convention; without it, a co-founder who quits early keeps everything they were given on day one.",
        tool: { id: "split", label: "Run the weighted split" },
        next: "c1-job",
      },
      {
        id: "solo",
        label: "Keep it yours for now",
        detail: "Jonas helps out, unpaid, no shares",
        effects: { equity: 0, investors: -10, customers: -5 },
        months: 2,
        reality:
          "You keep every share and lose the second pair of hands. Solo founders do raise and do exit — the honest cost is not the ownership arithmetic, it is that the first hard month is one you spend alone, and that investors read a single founder as a single point of failure.",
        next: "c1-job",
      },
    ],
  },
  {
    id: "c1-job",
    chapter: 1,
    place: "The office you still work in",
    title: "The job question",
    text: "Your contract has a three-month notice period and your salary is the only reason the rent is paid. The prototype is not a product, and a product is not revenue.",
    image: "day-job",
    choices: [
      {
        id: "quit-both",
        label: "Both of you quit",
        detail: "Full speed, and the clock starts",
        effects: { investors: 15, customers: 10, burn: 2_800 },
        months: 3,
        reality:
          "Commitment is legible — it is most of what a pre-seed investor is buying. It also multiplies your burn before you have a single customer, and the runway you just created is the only thing standing between you and taking the first term sheet you are offered.",
        next: "c1-customer",
      },
      {
        id: "moonlight",
        label: "Evenings and weekends",
        detail: "Slower, and nobody has to be brave",
        effects: { customers: 5, investors: -8 },
        months: 5,
        reality:
          "Bhidé's hundred bootstrapped companies mostly started exactly here. It costs months you cannot get back in a market that is being taken, and it is the right answer whenever the thing you are unsure about is whether anyone wants this.",
        tool: { id: "bootstrap", label: "Check whether you need outside money at all" },
        next: "c1-customer",
      },
      {
        id: "one-quits",
        label: "One quits, one keeps earning",
        detail: "Jonas goes full time, you fund him",
        effects: { cash: 9_000, investors: 5, customers: 5, burn: 1_400 },
        months: 3,
        reality:
          "The most common real arrangement, and the one that quietly breaks splits: two people with the same shares are now making very different sacrifices. If the equity was agreed before this, it is worth reopening now rather than in a year.",
        tool: { id: "split", label: "Re-check the split" },
        next: "c1-customer",
      },
    ],
  },
  {
    id: "c1-customer",
    chapter: 1,
    place: "A video call that ran over",
    title: "The first customer wants something else",
    text: "A mid-sized logistics company would pay. Not for what you built — for what you built plus an export their old system can read. Their head of ops is enthusiastic and specific, and you could have it done in six weeks.",
    speaker: "Head of Ops",
    image: "first-customer",
    choices: [
      {
        id: "build-it",
        label: "Build exactly what they asked for",
        detail: "€14,000 against delivery",
        effects: { cash: 14_000, customers: 15, investors: -5 },
        months: 3,
        reality:
          "Real money from a real customer is the cheapest funding there is, and an export nobody else wants is a consultancy with extra steps. The question to settle now, not later, is whether the next customer gets the same thing or their own version of it.",
        tool: { id: "recurring", label: "See what counts as recurring revenue" },
        next: "c1-money",
      },
      {
        id: "say-no",
        label: "Say no, build the product",
        detail: "Keep the roadmap yours",
        effects: { customers: -5, investors: 5 },
        months: 2,
        reality:
          "Defensible, and expensive while you have nothing. A no to a paying customer is only strategy if you have a second customer who wants the standard thing — otherwise it is a preference.",
        next: "c1-money",
      },
      {
        id: "pilot",
        label: "Free pilot for a reference",
        detail: "No money, a logo and a quote",
        effects: { customers: 12, investors: 8 },
        months: 3,
        reality:
          "A pilot nobody pays for is a pilot nobody has to defend internally, and most of them end politely. If you do this, put the conversion price and the date in writing on day one — the pilot's value is the commitment it carries, not the logo.",
        next: "c1-money",
      },
    ],
  },
  {
    id: "c1-money",
    chapter: 1,
    place: "Your banking app, Sunday",
    title: "The number that decides the next six months",
    text: "You look at the balance and do the division everybody does: what is in there, divided by what goes out. It is the first honest conversation you have had with the business.",
    image: "money-low",
    choices: [
      {
        id: "cut",
        label: "Cut the burn to the bone",
        detail: "No tools, no salaries, no office",
        effects: { burn: -900, customers: -5, investors: -3 },
        months: 1,
        reality:
          "Buys months, which is the only currency that matters when you have none. It also slows everything that creates the evidence you need, so it is a bridge to something, not a strategy by itself.",
        next: "c2-angel",
      },
      {
        id: "sell",
        label: "Sell harder before asking anyone for money",
        detail: "Thirty conversations in six weeks",
        effects: { customers: 10, cash: 6_000, investors: 6 },
        months: 2,
        reality:
          "Revenue raised at a valuation of nothing is the only funding that costs you no ownership at all. It is also the single best thing you can bring to the conversation you are about to have.",
        tool: { id: "round", label: "Size the round this would buy you" },
        next: "c2-angel",
      },
      {
        id: "ask-around",
        label: "Start asking people for money",
        detail: "Friends, family, the one angel you know",
        effects: { investors: 10, customers: -3 },
        months: 2,
        reality:
          "Fundraising is a job, and while you are doing it nobody is building or selling. Starting before you need it is right; starting instead of selling is how a company ends up optimised for investors it has not met.",
        tool: { id: "ready", label: "Check whether you are ready to raise" },
        next: "c2-angel",
      },
    ],
  },

  /* ── Chapter 2 ───────────────────────────────────────────── */
  {
    id: "c2-angel",
    chapter: 2,
    place: "A café in Hamburg, Tuesday",
    title: "“I'll put in 100,000 for 40 %”",
    text: "He has done this before — twelve companies, two of them you have heard of. He likes you, says so twice, and slides the number across the table like a favour. He wants an answer this week.",
    speaker: "The angel",
    image: "angel-cafe",
    choices: [
      {
        id: "accept",
        label: "Take it",
        detail: "€100,000 now, 40 % of the company gone",
        effects: { cash: 100_000, equity: -40, investors: -12, customers: 3 },
        months: 1,
        reality:
          "The money is real and so is the problem it creates. At 40 % in the first round, the founders are heading for a minority before a Series A is even discussed, and the next investor has to price a company whose team is already diluted — which is why a cap table like this is the most common reason a good company cannot raise again.",
        tool: { id: "planner", label: "Model what 40 % now costs at Series A" },
        next: "c2-hire",
      },
      {
        id: "counter",
        label: "Counter: 100,000 for 15 %",
        detail: "Name a valuation and defend it",
        effects: { cash: 100_000, equity: -22, investors: 6 },
        months: 2,
        reality:
          "He comes back at 22 % and a board seat, which is roughly where this lands when a founder shows up with a number instead of a feeling. The month you spent countering cost you a month of runway — and the deal you signed is worth about eighteen points of the company more than the one on the table.",
        tool: { id: "planner", label: "Compare 40 % against 22 %" },
        next: "c2-hire",
      },
      {
        id: "convertible",
        label: "Propose a convertible loan",
        detail: "€100,000 now, the price set at the next round",
        effects: { cash: 100_000, equity: -12, investors: 4 },
        months: 2,
        reality:
          "A Wandeldarlehen postpones the price rather than avoiding it: he converts at the next round, usually at a discount and under a cap, and the dilution shows up then. It is not non-dilutive — it is equity with the invoice sent later — but it does stop you selling 40 % of a company nobody has valued yet.",
        tool: { id: "planner", label: "Watch a convertible convert" },
        next: "c2-hire",
      },
      {
        id: "walk",
        label: "Say no",
        detail: "Keep all of it, keep the problem",
        effects: { investors: -8, customers: 5 },
        months: 2,
        reality:
          "Nothing about this is automatically wrong. Whether it was brave or expensive is decided entirely by what the next ninety days of revenue look like — a no to money you did not need is strategy, a no to money you did need is a story you tell afterwards.",
        tool: { id: "bootstrap", label: "Check whether you can do without" },
        next: "c2-hire",
      },
    ],
  },
  {
    id: "c2-hire",
    chapter: 2,
    place: "A room with three desks and four people",
    title: "The bottleneck has a name now",
    text: "You are turning work away. Jonas is doing sales in the evenings because the days are full of delivery, and the thing you keep saying in standups is “once we have someone for that”.",
    image: "first-hire",
    choices: [
      {
        id: "hire-sales",
        label: "Hire a salesperson",
        detail: "€7,500 a month, fully loaded",
        effects: { burn: 7_500, customers: 8, investors: 6 },
        months: 2,
        reality:
          "They cost from day one and contribute from month three at the earliest. The test is not whether you can pay them next month — it is whether you still have nine months of runway after they start, counted from their first day and not from today.",
        tool: { id: "bootstrap", label: "Check the hire against your cash" },
        next: "c2-crunch",
      },
      {
        id: "hire-eng",
        label: "Hire an engineer",
        detail: "€8,000 a month, and the product stops wobbling",
        effects: { burn: 8_000, customers: 14, investors: 2 },
        months: 2,
        reality:
          "The slowest ramp of any hire and often the right one anyway: an engineer fixes the reason customers leave, which is worth more than the reason they arrive. Expect six months before the effect is visible in anything an investor would count.",
        next: "c2-crunch",
      },
      {
        id: "freelance",
        label: "Take a freelancer for three months",
        detail: "Expensive per day, cancellable",
        effects: { burn: 4_000, customers: 5 },
        months: 2,
        reality:
          "The honest answer when you are not sure the bottleneck is permanent. It costs more per hour and buys the one thing a hire cannot: the option to stop. What it does not buy is anyone who will still be there when the knowledge matters.",
        next: "c2-crunch",
      },
      {
        id: "no-hire",
        label: "Nobody. Work the weekend.",
        detail: "Keep the burn flat, keep turning work away",
        effects: { customers: -8, investors: -4 },
        months: 3,
        reality:
          "Sustainable for a quarter and corrosive after that. The cost does not show up in the cash line — it shows up in the customers you did not serve and in whichever of you stops being able to do this.",
        next: "c2-crunch",
      },
    ],
  },
  {
    id: "c2-crunch",
    chapter: 2,
    place: "Thursday, 08:15",
    title: "Your biggest customer is leaving",
    text: "Forty percent of your revenue, in an email of four sentences. Their new head of ops has a vendor he worked with before. He is not unhappy with you — he is just not attached to you either.",
    speaker: "The email",
    image: "crunch",
    choices: [
      {
        id: "fight",
        label: "Get on a train and fight for it",
        detail: "Two days, one difficult meeting",
        effects: { customers: 10, investors: 3 },
        months: 1,
        reality:
          "Churn that gets reversed in person is usually churn that was about attention rather than product. Worth doing once; if it works twice, the real finding is that your customers do not have a reason to stay that survives a change of personnel.",
        tool: { id: "recurring", label: "See what this does to retention" },
        next: "c2-round",
      },
      {
        id: "replace",
        label: "Let it go, win two smaller ones",
        detail: "Concentration was the real risk",
        effects: { customers: -4, investors: 5, cash: 8_000 },
        months: 3,
        reality:
          "One customer at forty percent of revenue is not a customer, it is a cliff with an invoice. Replacing them with two smaller accounts reads as a worse month and a much better company, and it is the version an investor will prefer in diligence.",
        tool: { id: "recurring", label: "Model the revenue bridge" },
        next: "c2-round",
      },
      {
        id: "discount",
        label: "Offer them 40 % off to stay",
        detail: "Keep the logo, keep less of the money",
        effects: { customers: 4, cash: -3_000, investors: -6 },
        months: 1,
        reality:
          "A discount to prevent churn resets what that customer will ever pay and tells your sales team what a contract is really worth. It also lands in the one metric investors look at hardest: net revenue retention, which this quietly moves below a hundred percent.",
        tool: { id: "recurring", label: "Watch net retention move" },
        next: "c2-round",
      },
    ],
  },
  {
    id: "c2-round",
    chapter: 2,
    place: "The decision at the end of the year",
    title: "Raise, or keep going on your own money?",
    text: "You have a product, customers who pay, and a bank balance you can read in one glance. Two investors have asked to see numbers. Jonas wants to know what you are going to tell them.",
    image: "the-round",
    choices: [
      {
        id: "go-raise",
        label: "Go and raise the seed",
        detail: "Three months of full-time fundraising",
        effects: { investors: 8, customers: -6 },
        months: 3,
        reality:
          "A seed round is a quarter of your life spent not building, and it is the right trade whenever the market is being taken faster than revenue can fund you. What decides the outcome is almost never the deck — it is whether the last two quarters point in the same direction.",
        tool: { id: "ready", label: "Score your readiness first" },
        next: "@finale",
      },
      {
        id: "stay-indie",
        label: "Keep it yours",
        detail: "Grow on what customers pay you",
        effects: { customers: 8, investors: -15, cash: 12_000 },
        months: 3,
        reality:
          "A company that funds itself answers to nobody and grows at the speed its customers allow. That is a real strategy with a real ceiling, and the only wrong version of it is the one chosen because raising felt frightening.",
        tool: { id: "bootstrap", label: "Pressure-test the independent path" },
        next: "@finale",
      },
      {
        id: "bridge",
        label: "Take a bridge from the angel",
        detail: "Enough to reach better numbers",
        effects: { cash: 60_000, equity: -8, investors: -4 },
        months: 2,
        reality:
          "A bridge is a bet that six more months produce numbers worth a better price. When it works it is the cheapest round you will ever do. When it does not, you arrive at the same conversation with less ownership and less time — which is why bridges are named after the thing you are crossing, not the thing you are standing on.",
        tool: { id: "planner", label: "Model the bridge and the round after it" },
        next: "@finale",
      },
    ],
  },
];

export const SCENE_BY_ID = Object.fromEntries(SCENES.map((s) => [s.id, s])) as Record<string, Scene>;

/* ── Endings ─────────────────────────────────────────────────
   Scored on the state you arrive with, not on a single choice.
   Four of the five are survivable, because most companies neither
   die nor exit — they continue, which is the outcome a game about
   founding should be willing to show.
   ────────────────────────────────────────────────────────────── */

export const ENDINGS: Ending[] = [
  {
    id: "insolvent",
    title: "The money ran out",
    tone: "loss",
    image: "ending-empty",
    text: "There is no dramatic scene. There is a month where the salaries do not clear, a conversation with an accountant about what you are legally required to do next, and a list of people to call before they hear it elsewhere. Nothing you chose was stupid; the runway was just shorter than the distance.",
    payout: (s) => `${s.month} months, ${Math.round(s.equity)} % of nothing.`,
  },
  {
    id: "seed",
    title: "The round comes together",
    tone: "win",
    image: "ending-round",
    text: "Two term sheets, one of them serious. The numbers pointed the same way for two quarters and that turned out to be the whole argument. You sign, the money lands, and the company you run in January is a different company from the one you ran in November.",
    payout: (s) =>
      `${Math.round(s.equity)} % of it is still yours going into the round — and a seed round will take roughly twenty of those points.`,
  },
  {
    id: "down",
    title: "You raise, but not like that",
    tone: "mixed",
    image: "ending-round",
    text: "The round happens at a price nobody puts in a press release, from the one investor who stayed interested. It is money, it is a year, and it is a cap table with a story you will be explaining in every conversation from here.",
    payout: (s) => `${Math.round(s.equity)} % left, and the next round prices off this one.`,
  },
  {
    id: "indie",
    title: "It is yours, and it pays",
    tone: "win",
    image: "ending-indie",
    text: "No round, no board, no quarterly performance of optimism. Customers pay for something they would miss, the team is small enough to fit in one room, and the growth rate is whatever that produces. Nobody writes about this outcome and most founders would take it.",
    payout: (s) => `${Math.round(s.equity)} % of a company that owes nobody anything.`,
  },
  {
    id: "stalled",
    title: "Still here, barely",
    tone: "mixed",
    image: "ending-empty",
    text: "The product works, a few customers pay, and neither the investors nor the market has made a decision about you. That is not failure — it is the most common place to be after two years, and the hardest one to write a plan from.",
    payout: (s) => `${s.month} months in, ${fmtEuro(s.cash)} in the bank.`,
  },
];

export const ENDING_BY_ID = Object.fromEntries(ENDINGS.map((e) => [e.id, e])) as Record<string, Ending>;

/**
 * Which ending the run earned.
 *
 * Investors decide whether there is a round at all, customers decide
 * whether it is a round anyone wants, and the independent ending is
 * only available to a company that actually sells — otherwise "we chose
 * not to raise" is just the stalled ending with better lighting.
 */
export function pickEnding(s: GameState): string {
  if (s.cash <= 0) return "insolvent";
  if (s.investors >= 55 && s.customers >= 45) return "seed";
  if (s.customers >= 55 && s.cash >= 40_000) return "indie";
  if (s.investors >= 30) return "down";
  return "stalled";
}
