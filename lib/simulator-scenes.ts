/* ══════════════════════════════════════════════════════════════
   Palettio — the company, the people, and everything that happens.

   One concrete business, not "a startup": a logistics engineer in
   Hamburg who spent three years watching one truck in four drive
   back empty, and built the thing that fills them. Concrete because
   the alternative — "you have an idea with a friend" — gives a player
   nothing to reason with. You cannot judge whether 890 € a month is
   the right price for nothing in particular.

   Scene texts are two sentences. The clock is running while they are
   read, which is the whole point, so anything longer is a tax.

   Consequences come in Klimakanzler's two beats: what happened, then
   what it cost, and the second beat usually lands on a different
   meter than the one the decision aimed at.
   ══════════════════════════════════════════════════════════════ */

import type { Chapter, Ending, GameEvent, GameState, Scene } from "./simulator.ts";
import { fmtEuro } from "./simulator.ts";

export const INTRO = {
  image: "kitchen-night",
  who: "Lena Brandt, 29, logistics engineer",
  lines: [
    "For three years you dispatched trucks in Hamburg and watched one in four drive home empty. Palettio is what you built at night: it fills those return trips.",
    "Jonas Ritter, 34, dispatched them with you. He does the talking, you do the software. Neither of you has quit anything yet.",
    "In the bank: 12,400 €. Out every month: 1,650 €. One forwarder — Spedition Krämer, 18 trucks — has now said “interesting” twice.",
  ],
  rules: [
    "The clock runs while you decide. Months pass, cash leaves, investors forget you.",
    "Four meters, and most choices move more than one of them.",
    "Two chapters, five endings. You can pause, and nothing here is advice.",
  ],
};

export const CHAPTERS: Chapter[] = [
  { number: 1, title: "Getting it off the kitchen table", months: 18, firstScene: "c1-split" },
  { number: 2, title: "The first money", months: 24, firstScene: "c2-angel" },
];

export const SCENES: Scene[] = [
  /* ── Chapter 1 ───────────────────────────────────────────── */
  {
    id: "c1-split",
    chapter: 1,
    place: "Your kitchen, 23:40",
    title: "Jonas asks for half",
    text: "“Fifty-fifty, and we start Monday.” He has written no code and brought both customers you have spoken to.",
    speaker: "Jonas",
    image: "kitchen-night",
    choices: [
      {
        id: "handshake",
        label: "Fifty-fifty, handshake",
        detail: "Decided in four seconds",
        effects: { investors: -4 },
        months: 1,
        beats: [
          "You shake on it and open a second beer. It is the easiest conversation about equity either of you will ever have.",
          "No vesting, nothing on paper. Oltmanns will ask about this in eleven months and you will not enjoy the answer.",
        ],
        next: "c1-job",
      },
      {
        id: "vesting",
        label: "Fifty-fifty, with vesting",
        detail: "Four years, one-year cliff",
        effects: { investors: 10 },
        months: 2,
        beats: [
          "Two evenings and a notary appointment later, you both own half of something with rules attached.",
          "It cost two months and a slightly cold Sunday. Every investor who sees it will stop reading that page early, which is exactly what you want.",
        ],
        next: "c1-job",
      },
      {
        id: "sixtyforty",
        label: "Sixty-forty, you ahead",
        detail: "You built it. Say so.",
        effects: { investors: 2, customers: -3 },
        months: 2,
        beats: [
          "Jonas goes quiet, then agrees. “Fair enough. You wrote it.”",
          "He is slower on the phone for a month. Nothing you could point at, and both of you notice.",
        ],
        next: "c1-job",
      },
    ],
  },
  {
    id: "c1-job",
    chapter: 1,
    place: "Dispatch office, Thursday",
    title: "Your notice period is three months",
    text: "Your salary is the only reason the rent is paid. Krämer wants a demo in six weeks.",
    image: "day-job",
    choices: [
      {
        id: "quit",
        label: "Hand in your notice",
        detail: "Jonas too. Both of you, all in.",
        effects: { investors: 14, customers: 8, burn: 2_700 },
        months: 3,
        beats: [
          "Your boss is decent about it and asks to be an early customer. Jonas quits the same week.",
          "Your burn is now 3,950 € a month and nobody is paying you anything. The runway you just built is the only thing between you and a bad term sheet.",
        ],
        next: "c1-kraemer",
      },
      {
        id: "moonlight",
        label: "Nights and weekends",
        detail: "Nobody has to be brave yet",
        effects: { customers: 4, investors: -7 },
        months: 5,
        beats: [
          "Five months of 22:00 to 01:00. The demo is late, the product is better than it would have been.",
          "Krämer's interest cools to politeness, and five months is five months. The thing you bought is certainty you did not need.",
        ],
        next: "c1-kraemer",
      },
      {
        id: "jonas-only",
        label: "Jonas quits, you keep earning",
        detail: "You fund him out of your salary",
        effects: { cash: 7_800, investors: 4, customers: 4, burn: 1_300 },
        months: 3,
        beats: [
          "Jonas is full time on 1,300 € a month, which is less than he spends. You transfer 2,600 € to the company account.",
          "It works, and the two of you now own the same share of very different sacrifices. That conversation is coming.",
        ],
        next: "c1-kraemer",
      },
    ],
  },
  {
    id: "c1-kraemer",
    chapter: 1,
    place: "Krämer's yard, Harburg",
    title: "They want it to talk to their 2008 TMS",
    text: "Spedition Krämer will sign — if Palettio exports to the dispatch system they have run since 2008. Six weeks of work nobody else needs.",
    speaker: "Krämer, dispatcher",
    image: "first-customer",
    choices: [
      {
        id: "build",
        label: "Build the export",
        detail: "12,000 € on signature",
        effects: { cash: 12_000, customers: 16, investors: -3 },
        months: 3,
        beats: [
          "Six weeks, one invoice, eighteen trucks live. Your first real customer is a reference and a payer.",
          "You also own an export for a system from 2008 now, forever. The next forwarder will want their own.",
        ],
        next: "c1-price",
      },
      {
        id: "refuse",
        label: "Say no, keep one product",
        detail: "They can use the web view",
        effects: { customers: -6, investors: 4 },
        months: 2,
        beats: [
          "Krämer does not sign. Their dispatcher keeps using the free trial and keeps saying nice things.",
          "You have a clean product and no revenue. That is a strategy only if a second forwarder shows up soon.",
        ],
        next: "c1-price",
      },
      {
        id: "half",
        label: "Build a CSV they can import",
        detail: "Two weeks, half the money",
        effects: { cash: 5_000, customers: 9 },
        months: 2,
        beats: [
          "A CSV export and a ten-minute phone call with their IT. It is ugly and it works.",
          "Krämer signs for 890 € a month and tells two other forwarders at the Christmas thing.",
        ],
        next: "c1-price",
      },
    ],
  },
  {
    id: "c1-price",
    chapter: 1,
    place: "A spreadsheet, Sunday",
    title: "What does Palettio cost?",
    text: "Krämer pays 890 € a month because you said that number out loud once. Four more forwarders are asking.",
    image: "money-low",
    choices: [
      {
        id: "flat",
        label: "890 € a month, everyone",
        detail: "Simple, and easy to say",
        effects: { cash: 9_000, customers: 8 },
        months: 3,
        beats: [
          "Three of the four sign within a month. Nobody argues about the price.",
          "The one with 60 trucks also pays 890 €. You are leaving most of your revenue on their yard.",
        ],
        next: "c2-angel",
      },
      {
        id: "pertruck",
        label: "49 € per truck per month",
        detail: "Grows with them",
        effects: { cash: 14_000, customers: 2, investors: 6 },
        months: 4,
        beats: [
          "Two sign, one negotiates for a month, one disappears. The 60-truck firm pays 2,940 €.",
          "Revenue per customer triples and the sales cycle doubles. Investors like the first number much more than you like the second.",
        ],
        next: "c2-angel",
      },
      {
        id: "success",
        label: "A cut of every filled return trip",
        detail: "They only pay when it works",
        effects: { cash: 4_000, customers: 14, investors: -4 },
        months: 4,
        beats: [
          "Nobody says no to this. All four are live within six weeks.",
          "Your revenue now depends on their dispatchers actually using it, and it arrives three months late. Cash-wise you have bought a problem.",
        ],
        next: "c2-angel",
      },
    ],
  },

  /* ── Chapter 2 ───────────────────────────────────────────── */
  {
    id: "c2-angel",
    chapter: 2,
    place: "Café Nord, Tuesday 09:00",
    title: "“100,000 for 40 percent”",
    text: "Henning Oltmanns sold a freight exchange in 2014 and has backed eleven companies since. He wants an answer by Friday.",
    speaker: "Oltmanns",
    image: "angel-cafe",
    choices: [
      {
        id: "accept",
        label: "Take the 100,000",
        detail: "40 % of Palettio, gone by Friday",
        effects: { cash: 100_000, equity: -40, investors: -10 },
        months: 1,
        beats: [
          "The money is in the account on Friday. For the first time, the number in the bank is not frightening.",
          "Forty percent in the first round. Every investor after him now has to price a company whose founders are halfway out of it — and most of them will pass rather than explain that to a committee.",
        ],
        next: "c2-hire",
      },
      {
        id: "counter",
        label: "Counter: 100,000 for 15 %",
        detail: "Name a valuation, defend it",
        effects: { cash: 100_000, equity: -22, investors: 5 },
        months: 2,
        beats: [
          "He laughs, goes quiet for ten days, and comes back at 22 % with a board seat.",
          "Two months gone and eighteen points of the company saved. He also respects you slightly more, which will matter at the next round.",
        ],
        next: "c2-hire",
      },
      {
        id: "convertible",
        label: "Offer him a convertible loan",
        detail: "Money now, price at the next round",
        effects: { cash: 100_000, equity: -11, investors: 3 },
        months: 2,
        beats: [
          "100,000 € as a Wandeldarlehen: 20 % discount, 4 M€ cap, converts when somebody prices the company.",
          "Nobody had to agree what Palettio is worth today. He converts at the seed round and takes his share then — postponed, not avoided.",
        ],
        next: "c2-hire",
      },
      {
        id: "walk",
        label: "Say no",
        detail: "Keep all of it, keep the problem",
        effects: { investors: -6, customers: 6 },
        months: 2,
        beats: [
          "He takes it well and asks to be kept posted. You go back to selling because there is nothing else to do.",
          "Two forwarders sign in the next eight weeks. Whether that was brave or expensive is decided by the next quarter, not by this scene.",
        ],
        next: "c2-hire",
      },
    ],
  },
  {
    id: "c2-hire",
    chapter: 2,
    place: "Two desks and a kettle, Ottensen",
    title: "You are turning forwarders away",
    text: "Jonas is doing demos until 21:00 and onboarding at weekends. Eleven forwarders are waiting for a call back.",
    image: "first-hire",
    choices: [
      {
        id: "sales",
        label: "Hire a salesperson",
        detail: "7,500 € a month, fully loaded",
        effects: { burn: 7_500, customers: 10, investors: 5 },
        months: 2,
        beats: [
          "Marie comes from a freight exchange and knows half the dispatchers in Niedersachsen by first name.",
          "She costs 7,500 € from day one and closes nothing for three months. That gap is the whole risk of the hire.",
        ],
        next: "c2-churn",
      },
      {
        id: "engineer",
        label: "Hire an engineer",
        detail: "8,000 € a month, and it stops wobbling",
        effects: { burn: 8_000, customers: 15 },
        months: 2,
        beats: [
          "The matching runs nightly instead of when you remember, and the Rostock bug class disappears.",
          "Six months before any of it shows up in a number an investor counts. Your customers notice in three weeks.",
        ],
        next: "c2-churn",
      },
      {
        id: "working-student",
        label: "Two working students",
        detail: "1,900 € a month together",
        effects: { burn: 1_900, customers: 5 },
        months: 2,
        beats: [
          "They do onboarding calls and the data cleaning nobody wants. It buys Jonas four hours a day.",
          "Cheap, cancellable, and neither of them will still be here when the knowledge matters.",
        ],
        next: "c2-churn",
      },
      {
        id: "nobody",
        label: "Nobody. Work the weekend.",
        detail: "Keep the burn where it is",
        effects: { customers: -9, investors: -3 },
        months: 3,
        beats: [
          "You ship, you sell, you onboard, and the waiting list gets longer.",
          "Four of the eleven stop waiting. The cost never appears in the cash line, which is why this one is so easy to keep choosing.",
        ],
        next: "c2-churn",
      },
    ],
  },
  {
    id: "c2-churn",
    chapter: 2,
    place: "Thursday, 08:15",
    title: "Krämer is leaving",
    text: "Four sentences from their new dispatcher. He worked with a competitor at his last job and 38 % of your revenue walks with him.",
    speaker: "The email",
    image: "crunch",
    choices: [
      {
        id: "fight",
        label: "Drive to Harburg today",
        detail: "One uncomfortable meeting",
        effects: { customers: 9, investors: 2 },
        months: 1,
        beats: [
          "Ninety minutes in a portacabin. He stays, on the condition that you build him a weekly report.",
          "Churn you can reverse in person was never about the product. It was about nobody having called him.",
        ],
        next: "c2-round",
      },
      {
        id: "replace",
        label: "Let them go, win two smaller ones",
        detail: "One customer at 38 % was the real risk",
        effects: { customers: -3, investors: 6, cash: 9_000 },
        months: 3,
        beats: [
          "Two forwarders from Krämer's own network sign within the quarter, at 890 € each.",
          "A worse month and a much better company: no single customer can now take more than a fifth of your revenue with them.",
        ],
        next: "c2-round",
      },
      {
        id: "discount",
        label: "Offer 40 % off to stay",
        detail: "Keep the logo, keep less money",
        effects: { customers: 3, cash: -3_500, investors: -7 },
        months: 1,
        beats: [
          "He stays for 534 € a month and mentions it to the two forwarders he drinks with.",
          "You have just told the market what Palettio really costs, and your retention number now reads below a hundred percent.",
        ],
        next: "c2-round",
      },
    ],
  },
  {
    id: "c2-round",
    chapter: 2,
    place: "The whiteboard, end of the year",
    title: "Raise, or keep it yours?",
    text: "Two funds have asked to see numbers. Jonas wants to know what you are going to tell them.",
    image: "the-round",
    choices: [
      {
        id: "raise",
        label: "Go and raise the seed",
        detail: "A quarter of your life, spent on a deck",
        effects: { investors: 7, customers: -7 },
        months: 3,
        beats: [
          "Three months of trains, forty calls, one real conversation.",
          "Nobody sold anything while you did it, and that shows up in exactly the numbers the funds are reading.",
        ],
        next: "@finale",
      },
      {
        id: "indie",
        label: "Keep it yours",
        detail: "Grow on what forwarders pay",
        effects: { customers: 9, investors: -14, cash: 14_000 },
        months: 3,
        beats: [
          "You tell both funds no, and tell Oltmanns before he reads it somewhere.",
          "Nine forwarders, no board, and a growth rate your customers decide. The ceiling is real and so is the quiet.",
        ],
        next: "@finale",
      },
      {
        id: "bridge",
        label: "Take a bridge from Oltmanns",
        detail: "Six months to better numbers",
        effects: { cash: 60_000, equity: -7, investors: -3 },
        months: 2,
        beats: [
          "60,000 €, converting at the next round, agreed over one phone call.",
          "A bet that six more months produce a better price. When it works it is the cheapest money you will ever take.",
        ],
        next: "@finale",
      },
    ],
  },
];

export const SCENE_BY_ID = Object.fromEntries(SCENES.map((s) => [s.id, s])) as Record<string, Scene>;

/* ── What happens while you are deciding ─────────────────────
   Unprompted, one at a time, and mostly not about the thing you
   are currently thinking about. That is what makes the clock feel
   like a world rather than a progress bar.
   ────────────────────────────────────────────────────────────── */

export const EVENTS: GameEvent[] = [
  {
    id: "holiday",
    beats: [
      { text: "Krämer's dispatcher is on holiday. Three weeks, no handover." },
      { text: "Nobody else in the yard knows what Palettio is for. The trial quietly stops being used.", effects: { customers: -5 } },
    ],
  },
  {
    id: "rotterdam",
    beats: [
      { text: "A Rotterdam company doing almost exactly this raises 4 M€." },
      { text: "Oltmanns sends you the article at 23:12 with a single question mark.", effects: { investors: -7 } },
    ],
  },
  {
    id: "dvz",
    beats: [
      { text: "The DVZ runs two hundred words about empty return trips and mentions you by name." },
      { text: "Four forwarders ask for a demo before Friday.", effects: { customers: 7, investors: 2 } },
    ],
  },
  {
    id: "rostock",
    beats: [
      { text: "A rounding error in the matching sends a truck to Rostock instead of Rotterdam." },
      { text: "Jonas spends two hours apologising. They stay, and they tell people.", effects: { customers: -4, investors: -2 } },
    ],
  },
  {
    id: "professor",
    beats: [
      { text: "Your old professor forwards your deck to a founder he supervised in 2016." },
      { text: "She replies the same evening and offers to introduce you to her seed investor.", effects: { investors: 8 } },
    ],
  },
  {
    id: "finanzamt",
    beats: [
      { text: "The Finanzamt reassesses last year's advance payments." },
      { text: "2,400 € leaves the account in a week you had planned differently.", effects: { cash: -2_400 } },
    ],
  },
  {
    id: "strike",
    beats: [
      { text: "Warning strike at the container terminal. Nothing moves for four days." },
      { text: "Your customers have larger problems than your onboarding call this week.", effects: { customers: -3 } },
    ],
  },
  {
    id: "recruiter",
    chapter: 2,
    beats: [
      { text: "A recruiter offers Jonas 95,000 € at a Series-B company in Berlin." },
      { text: "He says no, and mentions it twice. You raise his draw, which was overdue anyway.", effects: { burn: 700 } },
    ],
  },
  {
    id: "renewal",
    when: (s: GameState) => s.customers >= 40,
    beats: [
      { text: "Two forwarders renew for twelve months instead of month to month." },
      { text: "21,360 € of contracted revenue, and the first time anyone has committed to you in advance.", effects: { cash: 10_680, investors: 4 } },
    ],
  },
  {
    id: "winter",
    beats: [
      { text: "Mild winter, freight volumes down across the north." },
      { text: "Fewer trips to fill means less for Palettio to do, and your usage numbers show it.", effects: { customers: -3 } },
    ],
  },
  {
    id: "aws",
    beats: [
      { text: "The nightly matching run is suddenly nine times more expensive." },
      { text: "Someone left a loop in. It costs 1,900 € before anybody notices.", effects: { cash: -1_900 } },
    ],
  },
  {
    id: "referral",
    when: (s: GameState) => s.customers >= 30,
    beats: [
      { text: "A dispatcher you have never met calls. His brother-in-law runs a forwarder in Bremen." },
      { text: "He signs without a demo, because somebody he trusts already did the demo for him.", effects: { customers: 5, cash: 2_670 } },
    ],
  },
];

/* ── Endings ─────────────────────────────────────────────── */

export const ENDINGS: Ending[] = [
  {
    id: "insolvent",
    title: "Palettio runs out of money",
    tone: "loss",
    image: "ending-empty",
    text: "There is no dramatic scene. A month where the salaries do not clear, a conversation with a Steuerberater about what you are legally obliged to do next, and a list of forwarders to call before they hear it from somebody else.",
    payout: (s) => `${s.month} months. ${Math.round(s.equity)} % of nothing.`,
  },
  {
    id: "seed",
    title: "The seed round comes together",
    tone: "win",
    image: "ending-round",
    text: "Two term sheets, one of them serious: 1.8 M€ on a pre-money nobody argues about, led by a fund that already owns a freight exchange. The company you run in January is not the one you ran in November.",
    payout: (s) => `${Math.round(s.equity)} % is still yours going in — and a seed round takes about twenty of those points.`,
  },
  {
    id: "down",
    title: "You raise, but not like that",
    tone: "mixed",
    image: "ending-round",
    text: "The round happens at a price nobody puts in a press release, from the one investor who stayed interested. It is money, it is eighteen months, and it is a cap table you will be explaining in every conversation from here.",
    payout: (s) => `${Math.round(s.equity)} % left, and the next round prices off this one.`,
  },
  {
    id: "indie",
    title: "Nine forwarders, no board",
    tone: "win",
    image: "ending-indie",
    text: "No round, no quarterly performance of optimism. Enough forwarders pay enough every month that the three of you are paid properly and the servers are boring. Nobody writes about this outcome and most founders would take it.",
    payout: (s) => `${Math.round(s.equity)} % of a company that owes nobody anything, and ${fmtEuro(s.cash)} in the bank.`,
  },
  {
    id: "stalled",
    title: "Still here, barely",
    tone: "mixed",
    image: "ending-empty",
    text: "Palettio works, a handful of forwarders pay for it, and neither the market nor any investor has made a decision about you. That is not failure. It is the most common place to be after two years and the hardest one to write a plan from.",
    payout: (s) => `${s.month} months in, ${fmtEuro(s.cash)} in the bank and ${Math.round(s.customers)} % of the base still using it.`,
  },
];

export const ENDING_BY_ID = Object.fromEntries(ENDINGS.map((e) => [e.id, e])) as Record<string, Ending>;

export function pickEnding(s: GameState): string {
  if (s.cash <= 0) return "insolvent";
  if (s.investors >= 50 && s.customers >= 45) return "seed";
  if (s.customers >= 55 && s.cash >= 40_000) return "indie";
  if (s.investors >= 28) return "down";
  return "stalled";
}
