/* ══════════════════════════════════════════════════════════════
   What is on the shelf.

   One list, used by the gallery on the front page and by the menu in
   the header. The blurb is the sentence under the title on a card —
   it says what the tool does to your inputs, not what the topic is.
   "Dilution" is a topic; "model every round and run the exit" is a
   tool. Keep them to one sentence: a card that needs a paragraph is a
   card nobody reads.
   ══════════════════════════════════════════════════════════════ */

export type ToolId = "planner" | "network" | "ready" | "round" | "bootstrap" | "split" | "recurring";

export type Tool = {
  id: ToolId;
  label: string;
  blurb: string;
};

/* Ordered as the questions actually arrive: do you even need to raise,
   are you ready, how much, what does it cost you, and who do you ask. */
export const TOOLS: Tool[] = [
  {
    id: "bootstrap",
    label: "Bootstrap",
    blurb:
      "Set your margin, payment terms and time to first revenue. The model scores whether the business can fund itself and names the one condition holding it back.",
  },
  {
    id: "recurring",
    label: "ARR & MRR",
    blurb:
      "Sort setup fees, one-offs and annual deals into what may be counted as ARR — and what diligence will strike out again.",
  },
  {
    id: "ready",
    label: "Ready to Raise",
    blurb:
      "Tick what you already have. Five readiness dimensions get scored, your binding constraint gets named, and the fixes are ranked by leverage.",
  },
  {
    id: "round",
    label: "Round Planner",
    blurb:
      "Work the number backwards from the milestone the next round will expect: what the team costs, how long it takes, and what the plan needs for the parts that slip.",
  },
  {
    id: "planner",
    label: "Dilution Planner",
    blurb:
      "Model friends and family, angels and VCs across every round, build the cap table, and run the exit under different liquidation preferences.",
  },
  {
    id: "split",
    label: "Co-Founder Split",
    blurb:
      "Weigh idea, work, capital and risk for each founder and get a split with the reasoning written out — the part most teams skip.",
  },
  {
    id: "network",
    label: "Network Strategy",
    blurb:
      "Toggle your own attributes and see which route into a round fits your profile, with the evidence behind every node.",
  },
];

export const TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t])) as Record<ToolId, Tool>;
