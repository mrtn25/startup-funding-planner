/* ══════════════════════════════════════════════════════════════
   Palettio — the milestones, the deck, and Retoura.

   One company, five stages, and a measure deck at each. The cards
   name their cost and their duration and nothing else: what a trade
   fair actually buys is the thing worth finding out, and a card that
   announces its own effect is a menu item rather than a decision.

   Jonas has a stance about how this gets funded and does not say so.
   One card in the second deck is simply asking him. It costs a month
   and most players will not spend it.
   ══════════════════════════════════════════════════════════════ */

import type { Ending, GameState, Milestone, RivalStep, Tactic } from "./simulator.ts";
import { fmtEuro } from "./simulator.ts";

export const INTRO = {
  image: "day-job",
  who: "Lena Brandt, 29, dispatcher in Hamburg",
  lines: [
    "Every Friday the same note in the same file: truck 7 back from Rotterdam, empty. Truck 12 from Hannover, empty. One trailer in four comes home with nothing in it.",
    "You have 12,400 € saved, a laptop, and a colleague called Jonas who thinks you are right about this.",
    "In Rotterdam, four people called Retoura are building the same thing. They started in March.",
  ],
  rules: [
    "The clock is your runway. It runs while you think and jumps when you act.",
    "Cards show what they cost and how long they take. What they do, you find out.",
    "Retoura does not wait for you.",
  ],
};

/* ── The deck ────────────────────────────────────────────────── */

const T = (t: Tactic) => t;

export const TACTICS: Record<string, Tactic> = Object.fromEntries(
  [
    /* ── 1. The observation ── */
    T({
      id: "count",
      label: "Count for another quarter",
      flavour: "Three more months of Friday evenings and a file nobody asked for.",
      months: 3,
      effects: { product: 10, investors: 2 },
      beats: [
        "Three months of notes. The number holds at 31 % and you can break it down by route, by day, by customer.",
        "It is the most solid thing anyone in this market owns, and it took a quarter during which nobody outside your office saw any of it.",
      ],
    }),
    T({
      id: "call-six",
      label: "Call six other forwarders",
      flavour: "Do they have the same number, or is it just your employer?",
      months: 2,
      effects: { product: 12, investors: 5, customers: 0 },
      beats: [
        "Four of the six have never measured it. Two say 28 % and “probably a third”, and both ask you to send them whatever you find.",
        "It is not just your yard, and two dispatchers are now expecting an email from you. That is the thinnest demand there is, and more than most people start with.",
      ],
    }),
    T({
      id: "ride-along",
      label: "Ride along for a week",
      flavour: "Five days in the cab, listening to what actually goes wrong.",
      months: 1,
      effects: { product: 14, team: 4 },
      beats: [
        "Five days with a driver called Mesut. Half of what you thought was a dispatch problem turns out to be a waiting-time problem.",
        "You come back with the one thing a spreadsheet could not have told you, and you will design the whole product around it.",
      ],
    }),
    T({
      id: "pitch-boss",
      label: "Pitch your boss on fixing it internally",
      flavour: "Do it inside the company, on their money.",
      months: 3,
      effects: { cash: 2_000, product: 6, investors: -4 },
      beats: [
        "He gives you 2,000 € and a Friday afternoon a week. It is more than you expected and far less than it needs.",
        "Six weeks in it is “on hold until the systems migration”. You now know exactly how this ends inside a forwarder, which is worth knowing and cost a quarter.",
      ],
    }),
    T({
      id: "post-number",
      label: "Post the number on LinkedIn",
      flavour: "“31 % of return trips in our yard ran empty last quarter.”",
      months: 1,
      effects: { product: 2, investors: 7, team: -3 },
      beats: [
        "Eleven thousand views, forty comments, two from people who run freight exchanges.",
        "Your employer's managing director also reads it, and the Monday conversation is not a warm one.",
      ],
    }),

    /* ── 2. The co-founder ── */
    T({
      id: "ask-jonas",
      label: "Ask Jonas what he actually wants",
      flavour: "One evening, one question, no decisions.",
      months: 1,
      effects: { alignment: 12, team: 5 },
      beats: ["", ""],
      beatsBy: {
        bootstrap: [
          "“Honestly? I don't want investors. My brother-in-law had a board after eighteen months and he hated every day of it.”",
          "He wants this to pay for itself. Every time you take outside money from here, you are spending something other than cash.",
        ],
        venture: [
          "“If we're doing this, we're doing it properly. Retoura will raise, and I'd rather own less of something that exists.”",
          "He wants a round. Every month you spend bootstrapping is a month he is quietly wondering whether you are serious.",
        ],
      },
    }),
    T({
      id: "handshake",
      label: "Fifty-fifty on a handshake",
      flavour: "Decided in the time it takes to unlock a car.",
      months: 1,
      effects: { headcount: 1, team: 8, investors: -4, product: 4 },
      beats: [
        "You shake on it in the car park. For eleven months it is the best decision either of you has made.",
        "Nothing is written down and nothing vests. An investor will ask what happens if one of you leaves, and the answer will be “he keeps half”.",
      ],
    }),
    T({
      id: "vesting",
      label: "Fifty-fifty with vesting",
      flavour: "An uncomfortable evening and 380 € at a notary.",
      months: 2,
      effects: { headcount: 1, investors: 12, team: 2, product: 3 },
      beats: [
        "Two evenings of a conversation neither of you wanted, four years, one-year cliff.",
        "Everyone who looks at this cap table later stops reading that page early, which is exactly what you want.",
      ],
    }),
    T({
      id: "sixty-forty",
      label: "Sixty-forty, you ahead",
      flavour: "You wrote every line of it. Say so out loud, in the car park, now.",
      months: 2,
      effects: { headcount: 1, investors: 3, team: -8, alignment: -10, product: 3 },
      beats: [
        "Jonas goes quiet, then agrees. “Fair enough. You wrote it.”",
        "He is slower on the phone for a month. Nothing you could point at, and both of you notice.",
      ],
    }),
    T({
      id: "go-solo",
      label: "Do it without him",
      flavour: "Keep all of it, carry all of it.",
      months: 2,
      effects: { investors: -8, team: -12, product: 6 },
      beats: [
        "You tell him you want to try it alone first. He takes it better than you deserve and sends you two contacts anyway.",
        "You keep every share and lose the person who can get you into a yard. Every sales card from here is one you have to play yourself.",
      ],
    }),

    /* ── 3. The prototype ── */
    T({
      id: "quit",
      label: "Hand in your notice",
      flavour: "Three months, and then no salary arrives on the 28th.",
      months: 3,
      effects: { salaryTo: 0, burn: 800, product: 10, investors: 10, team: 5 },
      alignmentBy: { bootstrap: -4, venture: 8 },
      beats: [
        "Your boss is decent about it and asks to be an early customer. Jonas gives notice the same week.",
        "From now on nothing arrives on the 28th and the number at the top of the screen means something. Everyone you talk to from here can tell the difference.",
      ],
    }),
    T({
      id: "part-time",
      label: "Go to four days a week",
      flavour: "Your employer says yes faster than you expected.",
      months: 2,
      effects: { salary: -600, product: 8, team: -3 },
      beats: [
        "One day a week, officially for Palettio. In practice it is the day everything else gets postponed to.",
        "You keep most of the salary and buy one real working day. It is the compromise everybody recommends and nobody is satisfied with.",
      ],
    }),
    T({
      id: "spreadsheet",
      label: "A spreadsheet with a macro",
      flavour: "Two weekends. You run it by hand on Fridays.",
      months: 1,
      effects: { product: 18, investors: -2 },
      beats: [
        "Two columns of trips, one button, a macro that proposes matches. It looks like what it is.",
        "Ole Wendt at Krämer uses it on the second Tuesday and finds a load for truck 7. It worked before it was a product, which is the only order that is ever cheap.",
      ],
    }),
    T({
      id: "build-properly",
      label: "Build it properly",
      flavour: "Login, map, live positions, a matching engine. Months of nights.",
      months: 5,
      effects: { product: 32, investors: 6, team: -5 },
      beats: [
        "Five months of 22:00 to 01:00. It demos beautifully and Jonas calls it “almost professional”.",
        "Five months also passed without a dispatcher touching it, and you now hold opinions about what they need that nobody has tested.",
      ],
    }),
    T({
      id: "concierge",
      label: "Do it by hand, call it software",
      flavour: "They send you their empty trips. Forty minutes later a match comes back.",
      months: 2,
      effects: { product: 24, team: -6, burn: 150 },
      beats: [
        "Ole thinks it is a system. It is you, your laptop and a kitchen table, every morning at 06:40.",
        "In six weeks you learn what the matching actually has to handle, including the half you would never have guessed. You also have no evenings.",
      ],
    }),
    T({
      id: "routing-api",
      label: "Buy a routing engine and wire it up",
      flavour: "Somebody else already solved the hard geometry.",
      cost: 4_200,
      months: 2,
      effects: { product: 22, burn: 340 },
      beats: [
        "Six weeks instead of six months, and a licence fee every month from here.",
        "The part you bought is the part investors assume is yours. You will be asked about it in every technical diligence you ever do.",
      ],
    }),
    T({
      id: "freelancer",
      label: "Pay a freelancer for six weeks",
      flavour: "Someone who has built a dispatch UI before.",
      cost: 9_000,
      months: 2,
      effects: { product: 26, team: 3 },
      beats: [
        "Six weeks, 9,000 €, and a frontend neither of you could have built that fast.",
        "He leaves with the knowledge of how it fits together. The next change takes you three days longer than it should.",
      ],
    }),

    /* ── 4. The first paying customer ── */
    T({
      id: "fair",
      label: "A stand at transport logistic",
      flavour: "Four days in Munich. Forty conversations, nobody signs on site.",
      cost: 6_500,
      months: 4,
      effects: { customers: 2, mrr: 1_780, investors: 8, team: -4 },
      when: (s: GameState) => s.rival < 45,
      beats: [
        "Four days on your feet. Forty real conversations, eleven cards, and a dispatcher from Bremen who stays forty minutes.",
        "Two of them sign in the following quarter at 890 € each. It cost 6,500 €, four months, and it is the only card that fills the top of the funnel for a year.",
      ],
    }),
    T({
      id: "linkedin",
      label: "Message the warm contacts",
      flavour: "Twenty people who already know your name.",
      months: 1,
      effects: { customers: 1, mrr: 890, investors: 2 },
      when: (s: GameState) => s.product >= 30,
      beats: [
        "Twenty messages, nine replies, three calls, one yes — from a dispatcher you sat next to at a training course in 2021.",
        "It is the cheapest customer you will ever win, and there are only twenty of these people in the world.",
      ],
    }),
    T({
      id: "cold-calls",
      label: "Cold-call the yard list",
      flavour: "Two hundred numbers, starting at the top.",
      months: 2,
      effects: { product: 8, customers: 1, mrr: 540, team: -10 },
      beats: [
        "Two hundred calls, six demos, one signature at a reduced price because you were tired of asking.",
        "What it really bought you is the objection list: you now know the four sentences that end these calls, and you can design around three of them.",
      ],
    }),
    T({
      id: "pilot",
      label: "Four free weeks with Ole Wendt",
      flavour: "Eighteen trucks, no budget, no patience.",
      months: 3,
      effects: { customers: 1, mrr: 890, product: 12, investors: 4 },
      beats: [
        "Five days sitting next to him in a portacabin, then three weeks of him using it without being asked.",
        "He signs at 890 € and tells the yard next door. A pilot you are physically present for converts; one you email a login to does not.",
      ],
    }),
    T({
      id: "exchange-deal",
      label: "Pay a freight exchange for referrals",
      flavour: "Their sales team already has the relationships.",
      cost: 3_000,
      months: 2,
      effects: { customers: 2, mrr: 1_400, investors: -3 },
      beats: [
        "Two signatures in eight weeks, at a price their sales team negotiated rather than you.",
        "It works exactly once: they want a cut of everything, and your second cohort would cost more than it brings.",
      ],
    }),
    T({
      id: "party-first",
      label: "Throw a party for the first invoice",
      flavour: "A long table, the good wine, Ole comes too.",
      cost: 800,
      months: 1,
      effects: { team: 18, customers: 0, investors: 1 },
      when: (s: GameState) => s.mrr > 0,
      beats: [
        "Twelve people in a room above a bar in Ottensen. Ole brings his dispatcher from the night shift, who has opinions about the 05:30 list.",
        "Nothing shipped that month. Two years later it is the thing everyone who was there still brings up, and nobody has left.",
      ],
    }),

    /* ── 5. The first money ── */
    T({
      id: "exist",
      label: "Apply for an EXIST grant",
      flavour: "Eleven weeks of forms. Your old professor would sponsor it.",
      months: 4,
      effects: { cash: 32_000, investors: 4, burn: 900, headcount: 1 },
      alignmentBy: { bootstrap: 8, venture: -4 },
      beats: [
        "Eleven weeks of forms, one presentation in Lüneburg, a decision in March.",
        "32,000 € over twelve months and nobody takes a share of anything. It is the cheapest money in this entire story and it costs a quarter of a year of paperwork.",
      ],
    }),
    T({
      id: "angel-40",
      label: "Take Oltmanns' 100,000 for 40 %",
      flavour: "He sold a freight exchange in 2014 and wants an answer by Friday.",
      months: 1,
      effects: { cash: 100_000, equity: -40, investors: -8 },
      alignmentBy: { bootstrap: -18, venture: 6 },
      beats: [
        "The money lands on Friday. For the first time the number in the bank is not frightening.",
        "Forty percent in the first round. Every investor after him has to price a company whose founders are already halfway out of it, and most will pass rather than explain that to a committee.",
      ],
    }),
    T({
      id: "angel-convertible",
      label: "Offer Oltmanns a convertible loan",
      flavour: "His money now, the price set at the next round.",
      months: 2,
      effects: { cash: 100_000, equity: -11, investors: 3 },
      alignmentBy: { bootstrap: -6, venture: 8 },
      beats: [
        "100,000 € as a Wandeldarlehen: 20 % discount, 4 M€ cap, converting when somebody actually prices the company.",
        "Nobody had to agree today what Palettio is worth. He converts at the seed round and takes his share then — postponed, not avoided.",
      ],
    }),
    T({
      id: "sell-harder",
      label: "Fund it from forwarders instead",
      flavour: "No deck, no meetings. Thirty conversations.",
      months: 3,
      effects: { customers: 3, mrr: 2_300, team: -6 },
      alignmentBy: { bootstrap: 10, venture: -8 },
      beats: [
        "Three months of selling, three more yards live, and an invoice run that covers the servers and one salary.",
        "Revenue raised at a valuation of nothing costs you no ownership at all. It also means three months in which the product did not move and Retoura did.",
      ],
    }),
    T({
      id: "fff",
      label: "Friends and family round",
      flavour: "Your uncle, Jonas's brother-in-law, 8,000 € each.",
      months: 2,
      effects: { cash: 24_000, equity: -6, investors: -2, team: -4 },
      alignmentBy: { bootstrap: 2, venture: 2 },
      beats: [
        "Three people who cannot assess this write cheques because they can assess you.",
        "It is the fastest money available and the only kind where a down round means Christmas is difficult.",
      ],
    }),
    T({
      id: "week-off",
      label: "Everyone takes a week off",
      flavour: "Nothing is on fire. Not this week, anyway.",
      months: 1,
      effects: { team: 14, product: -2 },
      when: (s: GameState) => s.team < 60,
      beats: [
        "Seven days in which nobody opens the matching dashboard. Jonas goes to his sister's in Flensburg.",
        "Everything that was broken is still broken on Monday, and the two of you can look at it without flinching.",
      ],
    }),
  ].map((t) => [t.id, t]),
) as Record<string, Tactic>;

/* ── The milestones ──────────────────────────────────────────── */

export const MILESTONES: Milestone[] = [
  {
    id: "observe",
    title: "The thing you keep seeing",
    blurb: "A problem is not a company. First find out whether anybody else has it.",
    image: "day-job",
    gate: (s) => s.product >= 15,
    gateLabel: "Understand the problem well enough to build for it",
    tactics: ["call-six", "ride-along", "count", "pitch-boss", "post-number"],
    next: "cofounder",
  },
  {
    id: "cofounder",
    title: "Jonas wants in",
    blurb: "He has dispatched for nine years and knows half the yards between Hamburg and Bremen. He also has an opinion he has not mentioned.",
    image: "kitchen-night",
    gate: (s) => s.headcount >= 2 || s.used.includes("go-solo"),
    gateLabel: "Settle how the two of you do this",
    tactics: ["ask-jonas", "vesting", "handshake", "sixty-forty", "go-solo"],
    next: "prototype",
  },
  {
    id: "prototype",
    title: "Something to click on",
    blurb: "Nobody can react to a description. You need the smallest thing that can be wrong in public.",
    image: "kitchen-night",
    gate: (s) => s.product >= 40,
    gateLabel: "A thing a dispatcher can use on a Tuesday",
    tactics: ["spreadsheet", "concierge", "part-time", "quit", "routing-api", "freelancer", "build-properly"],
    next: "customer",
  },
  {
    id: "customer",
    title: "The first invoice",
    blurb: "Interest is free. The moment you ask for money you find out what it was worth.",
    image: "first-customer",
    gate: (s) => s.mrr > 0 && s.customers >= 2,
    gateLabel: "Two forwarders paying every month",
    onEnter: {
      title: "Your employer has heard about Palettio",
      when: (s) => s.salary > 0,
      beats: [
        "Krämer's dispatcher mentioned it to your managing director at a regional meeting. The conversation on Monday is four minutes long and perfectly polite.",
        "No salary arrives on the 28th. The number at the top of the screen was decoration until this morning; from here it is the thing you check first.",
      ],
      effects: { salaryTo: 0, burn: 700, investors: 4, team: -5 },
    },
    tactics: ["pilot", "linkedin", "cold-calls", "fair", "exchange-deal", "party-first"],
    next: "money",
  },
  {
    id: "money",
    title: "Other people's money",
    blurb: "It arrives with conditions, and the conditions outlive the money.",
    image: "angel-cafe",
    gate: (s) => s.cash >= 45_000 || s.mrr >= 3_500,
    gateLabel: "Enough in the bank, or enough coming in, to survive the next year",
    tactics: ["exist", "sell-harder", "angel-convertible", "angel-40", "fff", "week-off"],
    next: null,
  },
];

export const MILESTONE_BY_ID = Object.fromEntries(MILESTONES.map((m) => [m.id, m])) as Record<string, Milestone>;

/* ── Retoura ─────────────────────────────────────────────────── */

export const RIVAL_STEPS: RivalStep[] = [
  {
    at: 25,
    label: "Retoura raises a pre-seed",
    beats: [
      "Retoura takes 250,000 € from a Rotterdam angel who used to run a container line.",
      "Two of the investors you had on a list reply to your email with one line each: they are looking at the space already.",
    ],
    effects: { investors: -6 },
  },
  {
    at: 45,
    label: "Retoura takes the stand",
    beats: [
      "The transport logistic floor plan goes out. Hall B, stand 214, Retoura.",
      "It is the stand you were going to book. The remaining space is in the hall nobody walks through.",
    ],
    effects: { investors: -4, team: -4 },
  },
  {
    at: 65,
    label: "Retoura signs the 90-truck account",
    beats: [
      "The Bremen forwarder you have been courting for five months signs with Retoura.",
      "Their dispatcher calls you himself to say sorry. He mentions that Retoura had someone on site for a week.",
    ],
    effects: { customers: -1, mrr: -890, investors: -7 },
  },
  {
    at: 85,
    label: "Retoura raises a Series A",
    beats: [
      "6 M€, led by a fund in Amsterdam. The press release uses the phrase “the category leader”.",
      "Every investor conversation you have from here starts with the same question, and it is not about you.",
    ],
    effects: { investors: -12, team: -6 },
  },
];

/* ── Endings ─────────────────────────────────────────────────── */

export const ENDINGS: Ending[] = [
  {
    id: "insolvent",
    title: "Palettio runs out of money",
    tone: "loss",
    image: "ending-empty",
    text: "No dramatic scene. A month where the salaries do not clear, a conversation with a Steuerberater about what you are legally obliged to do next, and a list of dispatchers to call before they hear it elsewhere.",
    payout: (s) => `${s.month} months from the first Friday you counted. ${Math.round(s.equity)} % of nothing.`,
  },
  {
    id: "split",
    title: "Jonas is out",
    tone: "loss",
    image: "ending-empty",
    text: "It does not happen in one conversation. It happens in four, over six weeks, and the last one is short. He wanted a different company from the one you were building, and neither of you said so until it was a grievance rather than a question.",
    payout: () => "Half the product was his idea. There is no version of this you finish alone from here.",
  },
  {
    id: "outrun",
    title: "Retoura got there first",
    tone: "loss",
    image: "ending-empty",
    text: "Nobody beat you on the product. They were in the yards while you were building, raised while you were deciding, and by the time you had something to sell, every dispatcher in the north had already been sold to.",
    payout: (s) => `${s.month} months, ${s.customers} customers, and a market with a category leader in it.`,
  },
  {
    id: "funded",
    title: "The money is in the account",
    tone: "win",
    image: "ending-round",
    text: "Not a press release, but a bank transfer and a notary appointment and the first month in three years where you are not counting. Retoura is still ahead, and now you are both playing the same game.",
    payout: (s) => `${fmtEuro(s.cash)} in the bank, ${Math.round(s.equity)} % still yours, ${s.customers} forwarders paying.`,
  },
  {
    id: "indie",
    title: "It pays for itself",
    tone: "win",
    image: "ending-indie",
    text: "No round and no board. Enough forwarders pay enough every month that the servers are boring and nobody has to be brave about rent. Ole still opens the 05:30 list every morning.",
    payout: (s) => `${fmtEuro(s.mrr)} a month from ${s.customers} forwarders, and ${Math.round(s.equity)} % of a company that owes nobody anything.`,
  },
  {
    id: "stalled",
    title: "Still here, barely",
    tone: "mixed",
    image: "ending-empty",
    text: "It works, a few forwarders pay for it, and neither the market nor any investor has made a decision about you. That is not failure. It is the most common place to be this far in, and the hardest one to write a plan from.",
    payout: (s) => `${s.month} months in, ${fmtEuro(s.cash)} in the bank, ${s.customers} customers, Retoura at ${Math.round(s.rival)} %.`,
  },
];

export const ENDING_BY_ID = Object.fromEntries(ENDINGS.map((e) => [e.id, e])) as Record<string, Ending>;

/** Reached the end of the chain, or ran out of road. */
export function pickEnding(s: GameState): string {
  if (s.cash <= 0) return "insolvent";
  if (s.alignment <= 0 && s.customers === 0) return "split";
  if (s.rival >= 100 && s.customers < 8) return "outrun";
  if (s.cash >= 45_000 && s.equity < 100) return "funded";
  if (s.mrr >= 3_500) return "indie";
  return "stalled";
}
