/* ══════════════════════════════════════════════════════════════
   Palettio — the story.

   Five chapters that follow the shape the thing actually has: you
   notice a problem you cannot stop seeing, you build the smallest
   thing that tests it, you find out whether anybody cares, you send
   the first invoice, and then other people's money arrives with
   conditions attached. The earlier version jumped straight from a
   kitchen table to an angel with a term sheet, which is why there was
   no thread to follow — the middle, where a company is actually made
   or not made, was missing.

   Rules the writing follows:

   - People recur and remember. Ole Wendt dispatches for Krämer in
     chapter three and is still there in chapter five, and what you
     did to him the first time is what he does to you the second.
   - Every scene moves the company to a state the next scene needs.
     No scene is a quiz.
   - The two beats after a choice are the story, not a verdict. What
     happened, then what it cost — and the cost usually lands
     somewhere you were not looking.
   ══════════════════════════════════════════════════════════════ */

import type { Chapter, Ending, GameEvent, GameState, Scene } from "./simulator.ts";
import { fmtEuro } from "./simulator.ts";

export const INTRO = {
  image: "day-job",
  who: "Lena Brandt, 29, dispatcher at a Hamburg forwarder",
  lines: [
    "Every Friday you write the same note in the same file: truck 7 back from Rotterdam, empty. Truck 12 from Hannover, empty. You have been counting for four months because nobody asked you to.",
    "One trailer in four drives home with nothing in it. Your employer knows and shrugs. The maths is not complicated — the phone calls to fix it are, and nobody has time for them.",
    "You have 12,400 € saved, a laptop, and a colleague called Jonas who thinks you are right.",
  ],
  rules: [
    "The clock runs while you decide — not while the story is talking.",
    "Four meters, and most choices move more than one of them.",
    "Five chapters, five endings. You can pause at any time.",
  ],
};

export const CHAPTERS: Chapter[] = [
  {
    number: 1,
    title: "The thing you keep seeing",
    blurb: "A problem is not a company. First you have to find out whether anyone else has it.",
    image: "day-job",
    months: 10,
    firstScene: "c1-count",
  },
  {
    number: 2,
    title: "Something to click on",
    blurb: "Nobody can react to a description. You need the smallest thing that can be wrong in public.",
    image: "kitchen-night",
    months: 14,
    firstScene: "c2-build",
  },
  {
    number: 3,
    title: "Does anybody care?",
    blurb: "Ole Wendt dispatches eighteen trucks for Spedition Krämer. He has agreed to four weeks.",
    image: "first-customer",
    months: 12,
    firstScene: "c3-pilot",
  },
  {
    number: 4,
    title: "The first invoice",
    blurb: "Interest is free. The moment you ask for money you find out what it was worth.",
    image: "money-low",
    months: 14,
    firstScene: "c4-tms",
  },
  {
    number: 5,
    title: "Other people's money",
    blurb: "It arrives with conditions, and the conditions outlive the money.",
    image: "angel-cafe",
    months: 20,
    firstScene: "c5-angel",
  },
];

export const SCENES: Scene[] = [
  /* ── 1. The problem ──────────────────────────────────────── */
  {
    id: "c1-count",
    chapter: 1,
    place: "Dispatch office, Friday 17:20",
    title: "Four months of notes and nobody to give them to",
    text: "Your file says 31 % of return trips ran empty last quarter. Your boss reads it, says “interesting”, and asks you to cover Monday's early shift.",
    speaker: "Your boss",
    image: "day-job",
    choices: [
      {
        id: "call-others",
        label: "Call six other forwarders and ask",
        detail: "Do they have the same number?",
        effects: { investors: 6, customers: 4 },
        months: 2,
        beats: [
          "Four of the six have never measured it. The two who have say 28 % and “probably a third”, and both ask you to send them whatever you find out.",
          "You now know it is not just your employer, and two dispatchers are waiting for an email from you. That is the thinnest possible version of demand, and it is more than most people start with.",
        ],
        next: "c1-jonas",
      },
      {
        id: "deeper",
        label: "Keep counting for another quarter",
        detail: "Make the number undeniable",
        effects: { investors: 3 },
        months: 4,
        beats: [
          "Three more months of Friday evenings. The number holds at 31 % and you can now break it down by route, by customer, by day of the week.",
          "The data is excellent and three months are gone. Nobody outside your own office has seen any of it, and the six forwarders you could have called are still not expecting your email.",
        ],
        next: "c1-jonas",
      },
      {
        id: "pitch-boss",
        label: "Pitch your boss on fixing it internally",
        detail: "Do it inside the company, on their money",
        effects: { investors: -4, customers: 2, cash: 2_000 },
        months: 3,
        beats: [
          "He gives you 2,000 € of budget and a Friday afternoon a week. It is more than you expected and far less than it needs.",
          "Six weeks in, the project is “on hold until the Q3 systems migration”. You have learned exactly how this ends inside a forwarder, which is worth knowing and cost you a quarter.",
        ],
        next: "c1-jonas",
      },
    ],
  },
  {
    id: "c1-jonas",
    chapter: 1,
    place: "The car park, after shift",
    title: "Jonas wants in",
    text: "“I'll do the calling, you do the software.” He has dispatched for nine years and knows half the yards between Hamburg and Bremen. He also wants half the company.",
    speaker: "Jonas Ritter, 34",
    image: "kitchen-night",
    choices: [
      {
        id: "handshake",
        label: "Half each, on a handshake",
        detail: "Decided in the time it takes to unlock a car",
        effects: { investors: -5, customers: 2 },
        months: 1,
        beats: [
          "You shake on it in the car park. For eleven months it is the best decision either of you has made.",
          "Nothing is written down and nothing vests. In chapter five an investor will ask what happens if one of you leaves, and the honest answer will be “he keeps half”.",
        ],
        next: "c2-build",
      },
      {
        id: "vesting",
        label: "Half each, vesting over four years",
        detail: "An uncomfortable evening and a notary",
        effects: { investors: 11, customers: 1 },
        months: 2,
        beats: [
          "Two evenings of a conversation neither of you wanted, and 380 € at a notary in Altona.",
          "You both own half of something with rules attached. Everyone who looks at this cap table later will stop reading that page early, which is exactly what you want.",
        ],
        next: "c2-build",
      },
      {
        id: "later",
        label: "Start together, decide shares later",
        detail: "“We'll sort it when it's real”",
        effects: { customers: 3, investors: -2 },
        months: 1,
        beats: [
          "You start on Monday. It is fast, friendly and completely undefined.",
          "The conversation does not get easier with time — it gets more expensive, because by then you each know exactly how much you have put in and disagree about it.",
        ],
        next: "c2-build",
      },
    ],
  },

  /* ── 2. The prototype ────────────────────────────────────── */
  {
    id: "c2-build",
    chapter: 2,
    place: "Your kitchen table, most nights",
    title: "What are you actually building?",
    text: "Jonas can get you into a yard in three weeks. The question is what you bring with you.",
    image: "kitchen-night",
    choices: [
      {
        id: "spreadsheet",
        label: "A spreadsheet with a macro",
        detail: "Two weekends. You run it manually.",
        effects: { customers: 5, investors: -3 },
        months: 1,
        beats: [
          "Two columns of trips, one button, and a macro that proposes matches. It looks like what it is.",
          "Ole Wendt uses it on the second Tuesday and finds a return load for truck 7. The thing works before it is a product, which is the only order that has ever been cheap.",
        ],
        next: "c2-job",
      },
      {
        id: "real-app",
        label: "Build it properly",
        detail: "Four months, a real web app",
        effects: { customers: 7, investors: 6 },
        months: 5,
        beats: [
          "Five months of nights. Login, map, live positions, a matching engine that runs every hour and a design Jonas calls “almost professional”.",
          "It demos beautifully. Five months also passed without a single dispatcher touching it, and you now have opinions about what they need that nobody has tested.",
        ],
        next: "c2-job",
      },
      {
        id: "concierge",
        label: "Do it by hand, pretend it is software",
        detail: "You are the algorithm. They never know.",
        effects: { customers: 8, investors: -2, burn: 200 },
        months: 2,
        beats: [
          "Ole sends his empty trips to an address. Forty minutes later a match comes back, found by you, on your laptop, in your kitchen.",
          "He thinks it is a system. You learn in six weeks what the matching actually has to handle — including the half of it you would never have guessed.",
        ],
        next: "c2-job",
      },
    ],
  },
  {
    id: "c2-job",
    chapter: 2,
    place: "HR, Tuesday morning",
    title: "Your notice period is three months",
    text: "The prototype exists. Your salary is still the only reason the rent is paid, and Jonas is asking what you are going to do.",
    image: "day-job",
    choices: [
      {
        id: "quit",
        label: "Both of you hand in your notice",
        detail: "All in, and the clock starts",
        effects: { investors: 15, customers: 5, burn: 2_700 },
        months: 3,
        beats: [
          "Your boss asks to be an early customer, which is either good manners or the best signal you have had so far.",
          "Burn goes from 1,900 € to 4,300 € a month and nobody is paying you anything yet. The runway you just created is the only thing standing between you and the first term sheet you are offered.",
        ],
        next: "c3-pilot",
      },
      {
        id: "moonlight",
        label: "Keep the job, build at night",
        detail: "Nobody has to be brave yet",
        effects: { customers: 2, investors: -8, cash: 5_200, burn: -300 },
        months: 5,
        beats: [
          "Five more months of 22:00 to 01:00. Your salary quietly pays the server bills, which is the cheapest funding anybody has ever offered you.",
          "Ole stops asking when the next version is coming. Interest cools into politeness, which is the quietest way a company dies.",
        ],
        next: "c3-pilot",
      },
      {
        id: "exist",
        label: "Apply for an EXIST grant",
        detail: "Eleven weeks of forms, no shares given up",
        effects: { cash: 32_000, investors: 4, customers: 2, burn: 900 },
        months: 4,
        beats: [
          "Your old professor signs as university sponsor. Eleven weeks of forms, one presentation in Lüneburg, and a decision in March.",
          "32,000 € over twelve months and nobody takes a share of anything. It is the cheapest money in this entire story, and it costs you a quarter of a year of forms to get it.",
        ],
        next: "c3-pilot",
      },
      {
        id: "one-quits",
        label: "Jonas quits, you keep earning",
        detail: "You fund him out of your salary",
        effects: { cash: 6_400, investors: 5, customers: 4, burn: 1_300 },
        months: 3,
        beats: [
          "Jonas goes full time on 1,300 € a month, which is less than he spends. You transfer the difference and keep writing code at night.",
          "It works, and the two of you now own the same share of very different sacrifices. Neither of you says anything about it for eight months.",
        ],
        next: "c3-pilot",
      },
    ],
  },

  /* ── 3. The test ─────────────────────────────────────────── */
  {
    id: "c3-pilot",
    chapter: 3,
    place: "Krämer's yard, Harburg",
    title: "Four weeks with Ole Wendt",
    text: "Eighteen trucks, one dispatcher, no budget and no patience. “Four weeks,” he says. “If it costs me time, I stop.”",
    speaker: "Ole Wendt",
    image: "first-customer",
    choices: [
      {
        id: "sit-with-him",
        label: "Sit next to him for the first week",
        detail: "Five days in a portacabin",
        effects: { customers: 10, investors: 3 },
        months: 2,
        beats: [
          "Five days of watching him work. He does not read anything on screen — he reacts to the phone, and your beautiful list is on the wrong monitor.",
          "You change three things that week that nobody would have reported in a survey. He fills eleven return trips in four weeks and tells the yard next door.",
        ],
        next: "c3-result",
      },
      {
        id: "send-login",
        label: "Send a login and a one-page PDF",
        detail: "Respect his time, stay out of the way",
        effects: { customers: 2, investors: -2 },
        months: 1,
        beats: [
          "He logs in twice in four weeks, both times in the first three days.",
          "Nothing is broken and nothing happened. A pilot where nobody is in the room tells you only that dispatchers are busy, which you already knew.",
        ],
        next: "c3-result",
      },
      {
        id: "do-it-for-him",
        label: "Phone him every morning with matches",
        detail: "No software. Just you and a phone.",
        effects: { customers: 8, investors: -5, burn: 300 },
        months: 2,
        beats: [
          "Every morning at 06:40 you call him with two or three options. He takes about half of them.",
          "He is delighted and you have built a job for yourself, not a product. What you have also built is the only list of real matching rules anybody in this market owns.",
        ],
        next: "c3-result",
      },
    ],
  },
  {
    id: "c3-result",
    chapter: 3,
    place: "The debrief, in the yard",
    title: "“So what does it cost?”",
    text: "Ole filled trips he would otherwise have lost. He also says the morning list is “too late” and the map is “for the office, not for me”.",
    speaker: "Ole Wendt",
    image: "the-round",
    choices: [
      {
        id: "fix-it",
        label: "Rebuild around what he actually does",
        detail: "Six weeks. Kill the map.",
        effects: { customers: 9, investors: 4 },
        months: 3,
        beats: [
          "Out goes the map, in comes a 05:30 list and two buttons. It is a worse demo and a better product.",
          "Ole uses it every morning without being asked. That is the first time anything you built became part of somebody's day.",
        ],
        next: "c4-tms",
      },
      {
        id: "more-pilots",
        label: "Find three more dispatchers like him",
        detail: "Test the pattern before you build on it",
        effects: { customers: 5, investors: 7 },
        months: 4,
        beats: [
          "Two of the three behave exactly like Ole. The third never opens it and will not say why.",
          "You now know which parts of his feedback were about dispatchers and which were about Ole, which is the difference between a product and a favour.",
        ],
        next: "c4-tms",
      },
      {
        id: "charge-now",
        label: "Ask him to pay, today",
        detail: "Before anything is finished",
        effects: { cash: 2_670, customers: -4, investors: 8 },
        months: 1,
        beats: [
          "He thinks about it for four days and signs for three months at 890 €. The first money anybody has ever paid you.",
          "He also starts expecting things, and the friendly tolerance of the pilot is over. Paying customers are a different relationship, and you just converted your only one.",
        ],
        next: "c4-tms",
      },
    ],
  },

  /* ── 4. The first invoice ────────────────────────────────── */
  {
    id: "c4-tms",
    chapter: 4,
    place: "Krämer's office, with the IT man",
    title: "It has to talk to a system from 2008",
    text: "Krämer will sign properly — if Palettio exports into the dispatch software they have run since 2008. Six weeks of work nobody else needs.",
    image: "first-customer",
    choices: [
      {
        id: "build-export",
        label: "Build the export",
        detail: "12,000 € on signature",
        effects: { cash: 12_000, customers: 8, investors: -3 },
        months: 3,
        beats: [
          "Six weeks, one invoice, eighteen trucks live and a reference you can name in every conversation from here.",
          "You also own an integration with a 2008 system forever, and the next forwarder runs something else from 2011.",
        ],
        next: "c4-price",
      },
      {
        id: "csv",
        label: "Give them a CSV and a phone call",
        detail: "Two weeks, half the money",
        effects: { cash: 5_000, customers: 6 },
        months: 2,
        beats: [
          "A CSV export and ten minutes with their IT man. It is ugly, it works, and it took a tenth of the effort.",
          "Krämer signs at 890 € a month and mentions you to two other forwarders at the Christmas thing. Nobody has ever asked what the integration looks like.",
        ],
        next: "c4-price",
      },
      {
        id: "say-no",
        label: "Say no and keep one product",
        detail: "They can use the web view like everyone else",
        effects: { customers: -7, investors: 3 },
        months: 2,
        beats: [
          "They do not sign. Ole keeps using it anyway, unofficially, which is both touching and worth nothing.",
          "You have a clean product and no first customer. That is a strategy only if the second forwarder arrives before the money does not.",
        ],
        next: "c4-price",
      },
    ],
  },
  {
    id: "c4-price",
    chapter: 4,
    place: "A spreadsheet, Sunday night",
    title: "What does Palettio cost?",
    text: "Krämer pays 890 € because you said that number out loud once, to one person, eighteen months ago. Four forwarders are now asking.",
    image: "money-low",
    choices: [
      {
        id: "flat",
        label: "890 € a month for everyone",
        detail: "Simple, and easy to say on the phone",
        effects: { cash: 8_000, customers: 5 },
        months: 3,
        beats: [
          "Three of the four sign inside a month. Nobody argues, nobody negotiates, everybody knows the price.",
          "The one with sixty trucks also pays 890 €. You are leaving most of your revenue standing in their yard.",
        ],
        next: "c5-angel",
      },
      {
        id: "per-truck",
        label: "49 € per truck per month",
        detail: "It grows when they grow",
        effects: { cash: 13_000, customers: 2, investors: 7 },
        months: 4,
        beats: [
          "Two sign, one negotiates for five weeks, one stops answering. The sixty-truck firm pays 2,940 € a month.",
          "Revenue per customer triples and the sales cycle doubles. Investors like the first number considerably more than you like the second.",
        ],
        next: "c5-angel",
      },
      {
        id: "success-fee",
        label: "A cut of every filled return trip",
        detail: "They only pay when it works",
        effects: { cash: 3_000, customers: 9, investors: -4 },
        months: 4,
        beats: [
          "Nobody says no to this. All four are live within six weeks and Ole is evangelical about it.",
          "Your revenue now depends on their dispatchers remembering to use it, and it arrives ninety days late. You have sold the risk you were least able to carry.",
        ],
        next: "c5-angel",
      },
    ],
  },

  /* ── 5. Other people's money ─────────────────────────────── */
  {
    id: "c5-angel",
    chapter: 5,
    place: "Café Nord, Tuesday 09:00",
    title: "“100,000 for 40 percent”",
    text: "Henning Oltmanns sold a freight exchange in 2014 and has backed eleven companies since. He likes you, says so twice, and wants an answer by Friday.",
    speaker: "Oltmanns",
    image: "angel-cafe",
    choices: [
      {
        id: "accept",
        label: "Take it",
        detail: "100,000 € on Friday, 40 % of Palettio gone",
        effects: { cash: 100_000, equity: -40, investors: -10 },
        months: 1,
        beats: [
          "The money lands on Friday. For the first time since the car park, the number in the bank is not frightening.",
          "Forty percent in the first round. Every investor after him has to price a company whose founders are already halfway out of it, and most of them will pass rather than explain that to their committee.",
        ],
        next: "c5-hire",
      },
      {
        id: "counter",
        label: "Counter: 100,000 for 15 %",
        detail: "Name a valuation and defend it",
        effects: { cash: 100_000, equity: -22, investors: 6 },
        months: 2,
        beats: [
          "He laughs, goes quiet for ten days, and comes back at 22 % with a board seat.",
          "Two months gone, eighteen points of the company kept. He also takes you more seriously than he did in the café, which is worth more than the eighteen points.",
        ],
        next: "c5-hire",
      },
      {
        id: "convertible",
        label: "Offer a convertible loan instead",
        detail: "Money now, price at the next round",
        effects: { cash: 100_000, equity: -11, investors: 3 },
        months: 2,
        beats: [
          "100,000 € as a Wandeldarlehen: 20 % discount, 4 M€ cap, converting when somebody actually prices the company.",
          "Nobody had to agree today what Palettio is worth. He converts at the seed round and takes his share then — postponed, not avoided, and cheaper only if the next round goes well.",
        ],
        next: "c5-hire",
      },
      {
        id: "walk",
        label: "Say no",
        detail: "Keep all of it, keep the problem",
        effects: { investors: -6, customers: 4 },
        months: 2,
        beats: [
          "He takes it well and asks to be kept posted. You go back to selling, because there is nothing else to do.",
          "Two forwarders sign in the following eight weeks. Whether that was brave or expensive is decided by the next quarter, not by this conversation.",
        ],
        next: "c5-hire",
      },
    ],
  },
  {
    id: "c5-hire",
    chapter: 5,
    place: "Two desks and a kettle, Ottensen",
    title: "Eleven forwarders are waiting for a call back",
    text: "Jonas does demos until 21:00 and onboarding at weekends. You have not written code in five weeks.",
    image: "first-hire",
    choices: [
      {
        id: "sales",
        label: "Hire a salesperson",
        detail: "7,500 € a month, fully loaded",
        effects: { burn: 7_500, customers: 7, investors: 5 },
        months: 2,
        beats: [
          "Marie comes from a freight exchange and knows half the dispatchers in Niedersachsen by their first names.",
          "She costs 7,500 € from day one and closes nothing for three months. That gap is the entire risk, and it is the same gap for every first sales hire anyone has ever made.",
        ],
        next: "c5-churn",
      },
      {
        id: "engineer",
        label: "Hire an engineer",
        detail: "8,000 € a month, and it stops wobbling",
        effects: { burn: 8_000, customers: 10 },
        months: 2,
        beats: [
          "Matching runs at 04:00 every morning instead of when you remember, and the Rostock class of bug disappears.",
          "Customers notice within three weeks. Investors will not see it in any number they read for another six months.",
        ],
        next: "c5-churn",
      },
      {
        id: "students",
        label: "Two working students",
        detail: "1,900 € a month together",
        effects: { burn: 1_900, customers: 3 },
        months: 2,
        beats: [
          "They take the onboarding calls and the data cleaning. It buys Jonas four hours a day and costs less than a used van.",
          "Cheap, cancellable, and neither of them will still be here when what they learned starts to matter.",
        ],
        next: "c5-churn",
      },
      {
        id: "nobody",
        label: "Nobody. Work the weekend.",
        detail: "Keep the burn exactly where it is",
        effects: { customers: -9, investors: -3 },
        months: 3,
        beats: [
          "You ship, you sell, you onboard, and the waiting list gets longer every week.",
          "Four of the eleven stop waiting. The cost never appears in the cash line, which is precisely why this is the easy choice to keep making.",
        ],
        next: "c5-churn",
      },
    ],
  },
  {
    id: "c5-churn",
    chapter: 5,
    place: "Thursday, 08:15",
    title: "Ole Wendt is leaving Krämer",
    text: "Four sentences from his replacement, who worked with a competitor at his last job. Thirty-eight percent of your revenue is attached to the dispatcher who is walking out.",
    speaker: "The email",
    image: "crunch",
    choices: [
      {
        id: "fight",
        label: "Drive to Harburg today",
        detail: "One uncomfortable ninety-minute meeting",
        effects: { customers: 5, investors: 2 },
        months: 1,
        beats: [
          "Ninety minutes in the same portacabin where this started. The new man stays, on the condition that you build him a weekly report.",
          "Churn you can reverse in person was never about the product. It was about nobody having called him before he had to make a decision.",
        ],
        next: "c5-round",
      },
      {
        id: "replace",
        label: "Let them go and win two smaller ones",
        detail: "One customer at 38 % was the real risk",
        effects: { customers: -3, investors: 7, cash: 9_000 },
        months: 3,
        beats: [
          "Two forwarders from Krämer's own network sign inside the quarter, at 890 € each. Ole, now dispatching in Buxtehude, introduces one of them.",
          "A worse month and a much better company: nobody can take more than a fifth of your revenue with them when they change jobs.",
        ],
        next: "c5-round",
      },
      {
        id: "discount",
        label: "Offer 40 % off to keep them",
        detail: "Keep the logo, keep less of the money",
        effects: { customers: 2, cash: -3_500, investors: -7 },
        months: 1,
        beats: [
          "They stay at 534 € a month, and he mentions the new price to the two forwarders he drinks with on Fridays.",
          "You have just told the market what Palettio really costs, and your retention number now reads below a hundred percent in the one chart investors always ask for.",
        ],
        next: "c5-round",
      },
    ],
  },
  {
    id: "c5-round",
    chapter: 5,
    place: "The whiteboard, end of the year",
    title: "Raise, or keep it yours?",
    text: "Two funds have asked to see numbers. Jonas wants to know what you are going to tell them, and so does Oltmanns.",
    image: "the-round",
    choices: [
      {
        id: "raise",
        label: "Go and raise the seed",
        detail: "A quarter of your year, spent on a deck",
        effects: { investors: 8, customers: -7 },
        months: 3,
        beats: [
          "Three months of trains, forty first calls, four second ones, one real conversation.",
          "Nobody sold anything while you did it, and that shows up in exactly the numbers the funds are reading on the morning of the decision.",
        ],
        next: "@finale",
      },
      {
        id: "indie",
        label: "Keep it yours",
        detail: "Grow on what forwarders pay you",
        effects: { customers: 5, investors: -14, cash: 14_000 },
        months: 3,
        beats: [
          "You tell both funds no, and you tell Oltmanns before he reads it somewhere else.",
          "No board, no quarterly performance of optimism, and a growth rate your customers decide. The ceiling is real and so is the quiet.",
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
          "60,000 €, converting at the next round, agreed in one phone call on a Sunday.",
          "A bet that six more months produce a better price. When it works it is the cheapest money you will ever take, and when it does not you arrive at the same conversation with less of the company and less time.",
        ],
        next: "@finale",
      },
    ],
  },
];

export const SCENE_BY_ID = Object.fromEntries(SCENES.map((s) => [s.id, s])) as Record<string, Scene>;

/* ── What happens while you are deciding ──────────────────── */

export const EVENTS: GameEvent[] = [
  {
    id: "holiday",
    chapter: 3,
    beats: [
      { text: "Ole is on holiday. Three weeks, no handover." },
      { text: "Nobody else in the yard knows what Palettio is for, and the trial quietly stops being used.", effects: { customers: -5 } },
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
      { text: "Four forwarders ask for a demo before Friday.", effects: { customers: 4, investors: 2 } },
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
      { text: "Your old professor forwards your one-pager to a founder he supervised in 2016." },
      { text: "She replies the same evening and offers an introduction to her seed investor.", effects: { investors: 8 } },
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
      { text: "Your customers have larger problems this week than your onboarding call.", effects: { customers: -3 } },
    ],
  },
  {
    id: "recruiter",
    chapter: 5,
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
      { text: "21,360 € of contracted revenue, and the first time anybody has committed to you in advance.", effects: { cash: 10_680, investors: 4 } },
    ],
  },
  {
    id: "winter",
    beats: [
      { text: "Mild winter, freight volumes down across the north." },
      { text: "Fewer trips to fill means less for Palettio to do, and the usage numbers show it.", effects: { customers: -3 } },
    ],
  },
  {
    id: "aws",
    chapter: 2,
    beats: [
      { text: "The nightly matching run is suddenly nine times more expensive." },
      { text: "Somebody left a loop in. It costs 1,900 € before anyone notices.", effects: { cash: -1_900 } },
    ],
  },
  {
    id: "referral",
    when: (s: GameState) => s.customers >= 30,
    beats: [
      { text: "A dispatcher you have never met calls. His brother-in-law runs a forwarder in Bremen." },
      { text: "He signs without a demo, because somebody he trusts already did the demo for him.", effects: { customers: 3, cash: 2_670 } },
    ],
  },
  {
    id: "ole-leaves-early",
    chapter: 4,
    when: (s: GameState) => s.customers < 25,
    beats: [
      { text: "Ole asks, carefully, whether Palettio is still a going concern." },
      { text: "Somebody at a trade fair told him you were “probably done”. He is asking because he wants it to be untrue.", effects: { investors: -4 } },
    ],
  },
  {
    id: "first-thousand",
    chapter: 4,
    when: (s: GameState) => s.customers >= 35,
    beats: [
      { text: "The thousandth filled return trip goes through on a Tuesday afternoon." },
      { text: "Jonas works out it is about 740,000 empty kilometres. You put it on a slide that evening.", effects: { investors: 5 } },
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
    text: "There is no dramatic scene. A month where the salaries do not clear, a conversation with a Steuerberater about what you are legally obliged to do next, and a list of dispatchers to call before they hear it from somebody else. Ole asks whether you are alright.",
    payout: (s) => `${s.month} months from the first Friday you counted. ${Math.round(s.equity)} % of nothing.`,
  },
  {
    id: "seed",
    title: "The seed round comes together",
    tone: "win",
    image: "ending-round",
    text: "Two term sheets, one of them serious: 1.8 M€ led by a fund that already owns a freight exchange. The company you run in January is not the one you ran in November, and the empty trips are now somebody's board metric.",
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
    text: "No round and no quarterly performance of optimism. Enough forwarders pay enough every month that the three of you are paid properly and the servers are boring. Ole, now in Buxtehude, still uses it every morning at 05:30.",
    payout: (s) => `${Math.round(s.equity)} % of a company that owes nobody anything, and ${fmtEuro(s.cash)} in the bank.`,
  },
  {
    id: "stalled",
    title: "Still here, barely",
    tone: "mixed",
    image: "ending-empty",
    text: "Palettio works, a handful of forwarders pay for it, and neither the market nor any investor has made a decision about you. That is not failure. It is the most common place to be this far in, and the hardest one to write a plan from.",
    payout: (s) => `${s.month} months in, ${fmtEuro(s.cash)} in the bank and ${Math.round(s.customers)} % of the base still using it every morning.`,
  },
];

export const ENDING_BY_ID = Object.fromEntries(ENDINGS.map((e) => [e.id, e])) as Record<string, Ending>;

/**
 * Which ending the run earned.
 *
 * The thresholds are set against what the meters actually reach over a
 * five-chapter run, measured rather than guessed: investors above 40
 * is a real achievement in a story where confidence decays, and the
 * independent ending now asks for a base that genuinely pays rather
 * than for any base at all — otherwise it swallowed three quarters of
 * all endings and the game had one outcome.
 */
export function pickEnding(s: GameState): string {
  if (s.cash <= 0) return "insolvent";
  if (s.investors >= 40 && s.customers >= 40) return "seed";
  if (s.customers >= 62 && s.cash >= 60_000) return "indie";
  if (s.investors >= 25) return "down";
  return "stalled";
}
