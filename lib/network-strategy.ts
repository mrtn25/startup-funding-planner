/* ══════════════════════════════════════════════════════════════
   Network strategy model.

   A weighted three-layer model: founder attributes → mechanisms →
   strategies. Nothing on the left acts directly on a strategy; the
   mechanism layer in the middle is the explanation.

   Weights are hand-set from the cited literature, not fitted to data.
   Treat the output as a structured argument, not a prediction.
   ══════════════════════════════════════════════════════════════ */

export type InputKey =
  | "fem"
  | "eth"
  | "age"
  | "edu"
  | "emp"
  | "exit"
  | "ties"
  | "acc"
  | "geo"
  | "seed"
  | "deep";
export type MechKey = "tie" | "sig" | "hom" | "asy" | "fri";
export type StratKey = "warm" | "brok" | "iden" | "cred" | "cat" | "cold";
export type NodeId = `in:${InputKey}` | `me:${MechKey}` | `st:${StratKey}`;

/** Ordered so the rendered columns match the model's reading order. */
export const IK: InputKey[] = ["fem", "eth", "age", "edu", "emp", "exit", "ties", "acc", "geo", "seed", "deep"];
export const MK: MechKey[] = ["tie", "sig", "hom", "asy", "fri"];
export const SK: StratKey[] = ["warm", "brok", "iden", "cred", "cat", "cold"];

export const SRC: Record<string, [string, string]> = {
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
  hochberg07: [
    "Hochberg, Ljungqvist & Lu (2007). Whom you know matters: VC networks and investment performance. <em>Journal of Finance</em> 62(1), 251–301.",
    "https://onlinelibrary.wiley.com/doi/full/10.1111/j.1540-6261.2007.01207.x",
  ],
  bengtsson15: [
    "Bengtsson & Hsu (2015). Ethnic matching in the U.S. venture capital market. <em>Journal of Business Venturing</em> 30(2), 338–354.",
    "https://www.sciencedirect.com/science/article/abs/pii/S0883902614000871",
  ],
  friendship: [
    "Gompers, Mukharlyamov & Xuan (2016). The cost of friendship. <em>Journal of Financial Economics</em> 119(3), 626–644.",
    "https://www.sciencedirect.com/science/article/abs/pii/S0304405X16000180",
  ],
  ewens20: [
    "Ewens & Townsend (2020). Are early stage investors biased against women? <em>Journal of Financial Economics</em> 135(3), 653–677.",
    "https://www.sciencedirect.com/science/article/abs/pii/S0304405X19301758",
  ],
  howell: [
    "Howell & Nanda. Networking frictions in venture capital and the gender gap in entrepreneurship. <em>Journal of Financial and Quantitative Analysis</em>.",
    "https://www.cambridge.org/core/journals/journal-of-financial-and-quantitative-analysis/article/abs/networking-frictions-in-venture-capital-and-the-gender-gap-in-entrepreneurship/AA981C3615556F057D1B6D69FEFA1088",
  ],
  snellman23: [
    "Snellman & Solal (2023). Does investor gender matter for the success of female entrepreneurs? <em>Organization Science</em> 34(2), 680–699.",
    "https://pubsonline.informs.org/doi/10.1287/orsc.2022.1594",
  ],
  persist10: [
    "Gompers, Kovner, Lerner & Scharfstein (2010). Performance persistence in entrepreneurship. <em>Journal of Financial Economics</em> 96(1), 18–32.",
    "https://www.sciencedirect.com/science/article/abs/pii/S0304405X09002311",
  ],
  hsu07: [
    "Hsu (2007). Experienced entrepreneurial founders, organizational capital, and venture capital funding. <em>Research Policy</em> 36(5), 722–741.",
    "https://www.sciencedirect.com/science/article/abs/pii/S0048733307000716",
  ],
  azoulay20: [
    "Azoulay, Jones, Kim & Miranda (2020). Age and high-growth entrepreneurship. <em>American Economic Review: Insights</em> 2(1), 65–82.",
    "https://www.aeaweb.org/articles?id=10.1257/aeri.20180582",
  ],
  buylocal: [
    "Chen, Gompers, Kovner & Lerner. Buy local? The geography of venture capital. <em>Journal of Urban Economics</em>.",
    "https://www.researchgate.net/publication/46497567_Buy_local_The_geography_of_venture_capital",
  ],
  localbias: [
    "Cumming & Dai (2010). Local bias in venture capital investments. <em>Journal of Empirical Finance</em> 17(3), 362–380.",
    "https://www.sciencedirect.com/science/article/abs/pii/S0927539809000899",
  ],
  accel: [
    "Hallen, Cohen & Bingham. Do accelerators work? If so, how? <em>Organization Science</em>.",
    "https://link.springer.com/article/10.1186/s13731-025-00586-6",
  ],
  alumni: [
    "Garfinkel & Mayer. Alumni networks in venture capital financing. Working paper.",
    "https://www.biz.uiowa.edu/faculty/jgarfinkel/working/FoundersEd.pdf",
  ],
  degrees: [
    "From degrees to dollars: elite education and startup funding. <em>Journal of Economic Analysis</em>.",
    "https://www.anserpress.org/journal/jea/3/1/51",
  ],
  referral: [
    "Referrals among VCs and the length of due diligence: the effect of relational embeddedness. <em>Journal of Business Venturing</em>.",
    "https://www.sciencedirect.com/science/article/abs/pii/S0883902622000428",
  ],
};

/** Attribute → mechanism weights. */
export const W1: Record<InputKey, Partial<Record<MechKey, number>>> = {
  fem: { fri: 0.9, hom: 0.5, tie: -0.2 },
  eth: { hom: 0.9, fri: 0.5, tie: -0.2 },
  age: { tie: 0.8, sig: 0.3 },
  edu: { sig: 0.9, tie: 0.6, hom: 0.6 },
  emp: { sig: 0.8, tie: 0.6, hom: 0.5 },
  exit: { tie: 0.9, sig: 0.9, asy: -0.6 },
  ties: { tie: 1.0, fri: -0.8 },
  acc: { tie: 0.7, sig: 0.6, fri: -0.5 },
  geo: { tie: -0.5, fri: 0.8 },
  seed: { asy: 0.8, sig: -0.4 },
  deep: { asy: 0.9 },
};

/** Mechanism → strategy weights. */
export const W2: Record<StratKey, Partial<Record<MechKey, number>>> = {
  warm: { tie: 1.0, asy: 0.5, fri: -0.3 },
  brok: { tie: 0.3, fri: 0.7, sig: 0.2 },
  iden: { hom: 1.0, fri: 0.4 },
  cred: { sig: 1.0, asy: 0.5 },
  cat: { fri: 0.9, tie: -0.6, asy: 0.3 },
  cold: { tie: -0.8, fri: 0.6, sig: -0.3 },
};

export const W1_SRC: Record<string, string> = {
  "fem>fri": "howell",
  "fem>hom": "ewens20",
  "fem>tie": "howell",
  "eth>hom": "bengtsson15",
  "eth>fri": "bengtsson15",
  "eth>tie": "bengtsson15",
  "age>tie": "azoulay20",
  "age>sig": "azoulay20",
  "edu>sig": "degrees",
  "edu>tie": "alumni",
  "edu>hom": "alumni",
  "emp>sig": "gompers20",
  "emp>tie": "friendship",
  "emp>hom": "friendship",
  "exit>tie": "hsu07",
  "exit>sig": "persist10",
  "exit>asy": "persist10",
  "ties>tie": "shane02",
  "ties>fri": "gompers20",
  "acc>tie": "accel",
  "acc>sig": "accel",
  "acc>fri": "accel",
  "geo>tie": "buylocal",
  "geo>fri": "localbias",
  "seed>asy": "shane02",
  "seed>sig": "degrees",
  "deep>asy": "hsu07",
};

export const W2_SRC: Record<string, string> = {
  "warm>tie": "gompers20",
  "warm>asy": "shane02",
  "warm>fri": "gompers20",
  "brok>tie": "hochberg07",
  "brok>fri": "hochberg07",
  "brok>sig": "hochberg07",
  "iden>hom": "bengtsson15",
  "iden>fri": "ewens20",
  "cred>sig": "degrees",
  "cred>asy": "gompers20",
  "cat>fri": "hallen12",
  "cat>tie": "hallen12",
  "cat>asy": "hallen12",
  "cold>tie": "gompers20",
  "cold>fri": "hallen12",
  "cold>sig": "degrees",
};

export const NAMES: Record<string, string> = {
  fem: "Female founder",
  eth: "Ethnic or migrant minority",
  age: "40+, long career",
  edu: "Elite university",
  emp: "Elite employer",
  exit: "Prior successful exit",
  ties: "Existing investor ties",
  acc: "Accelerator alum",
  geo: "Outside a VC hub",
  seed: "Pre-seed or seed",
  deep: "Deep tech, unproven",
  tie: "Tie stock",
  sig: "Credential signal",
  hom: "Homophily surface",
  asy: "Information asymmetry",
  fri: "Access friction",
  warm: "Warm intro, strong tie",
  brok: "Brokered weak tie",
  iden: "Identity match",
  cred: "Credential proxy",
  cat: "Catalyzing moves",
  cold: "Cold, open platform",
};

export type NodeInfo = { k: string; t: string; b: string; i: string; s: string[] };

export const INFO: Record<NodeId, NodeInfo> = {
  "in:fem": {
    k: "Profile attribute",
    t: "Female founder",
    b: "<p>All-female teams receive roughly 2% of US VC dollars. Ewens &amp; Townsend observed private investor&ndash;founder interactions on AngelList and found male investors express <strong>less</strong> interest in female founders than in observably similar men &mdash; while the male-led startups they do pick <em>underperform</em> the female-led ones they pass on.</p><p>Howell &amp; Nanda randomised founder exposure to VC judges: men who happened to meet a VC became more likely to raise VC later; women gained nothing, because they were less likely to follow up on the contact.</p>",
    i: "Exposure alone does not close the gap &mdash; the binding constraint is the follow-up move, not the first meeting. Scripted re-contact after any introduction is the highest-leverage behaviour here.",
    s: ["ewens20", "howell", "snellman23"],
  },
  "in:eth": {
    k: "Profile attribute",
    t: "Ethnic or migrant minority",
    b: "<p>Bengtsson &amp; Hsu show shared ethnicity between founder and VC partner roughly <strong>doubles</strong> the probability of an investment match, and produces more founder-friendly contract terms. The same matches are associated with lower rates of IPO or acquisition.</p><p>&lsquo;The cost of friendship&rsquo; finds affinity-based collaboration on ethnicity cuts comparative success by 26&ndash;32%.</p>",
    i: "Co-ethnic targeting is one of the most reliable known levers for getting the first cheque, and one of the best-documented risks for what follows. Open the door with it, then deliberately syndicate outside the affinity group.",
    s: ["bengtsson15", "friendship"],
  },
  "in:age": {
    k: "Profile attribute",
    t: "40+, long career",
    b: "<p>Azoulay, Jones, Kim &amp; Miranda find the mean age at founding of the fastest-growing 0.1% of US startups is <strong>45</strong>, and a 50-year-old founder is about twice as likely to build a top-growth firm as a 30-year-old.</p><p>The mechanism is accumulated human and social capital, not age itself.</p>",
    i: "Age is mostly a proxy for tie stock. Mine existing professional relationships for second-degree paths to investors rather than building a network from scratch.",
    s: ["azoulay20", "hsu07"],
  },
  "in:edu": {
    k: "Profile attribute",
    t: "Elite university",
    b: "<p>Postgraduate degrees from elite universities are associated with significantly higher VC funding &mdash; but the effect appears at <strong>later stages, not at seed</strong>, which points to a signalling and network-access channel rather than a skill channel.</p><p>Garfinkel &amp; Mayer document that founder&ndash;VC alumni ties raise the probability of financing directly.</p>",
    i: "The degree is both a public quality signal and a searchable alumni graph. Map partners at target funds by school and cohort year, and route the introduction through the alumni tie.",
    s: ["degrees", "alumni"],
  },
  "in:emp": {
    k: "Profile attribute",
    t: "Elite employer",
    b: "<p>Prior employment at a high-status firm works like elite education: institutional signal plus a dense alumni network that overlaps heavily with VC partnerships. Gompers et al. report VCs rate the <strong>management team above product or technology</strong> in both selection and attribution of outcomes, so employer pedigree loads onto the criterion VCs say they weight most.</p><p>The caution mirrors ethnicity: shared prior employer is one of the affinity dimensions that predicts worse exits.</p>",
    i: "Ex-employer alumni networks are usually the densest available brokered path to a specific partner. Treat them as routing infrastructure, not as the pitch.",
    s: ["gompers20", "friendship"],
  },
  "in:exit": {
    k: "Profile attribute",
    t: "Prior successful exit",
    b: "<p>Gompers, Kovner, Lerner &amp; Scharfstein find previously successful founders succeed again about <strong>30%</strong> of the time versus roughly 18&ndash;22% for first-timers and previously failed founders.</p><p>Hsu shows prior founding experience &mdash; especially financially successful experience &mdash; raises both the likelihood of being funded through a direct tie and the venture's valuation.</p>",
    i: "Track record substitutes for nearly every other signal and converts directly into direct-tie access. The marginal value of accelerators and identity matching drops sharply.",
    s: ["persist10", "hsu07"],
  },
  "in:ties": {
    k: "Profile attribute",
    t: "Existing investor ties",
    b: "<p>Shane &amp; Cable show network ties influence which ventures get funded through <strong>information transfer</strong> about founder reliability, not merely through reputation.</p><p>Gompers et al. quantify the channel from the investor side: over 30% of deal flow comes through professional networks, ~20% is referred by other investors, 8% from portfolio companies &mdash; and only ~10% arrives inbound from management.</p>",
    i: "If you have the ties, this dominates everything else. The only strategic question left is which contact carries the most credibility with the specific partner.",
    s: ["shane02", "gompers20", "hallen12"],
  },
  "in:acc": {
    k: "Profile attribute",
    t: "Accelerator alum",
    b: "<p>Hallen, Cohen &amp; Bingham find real but <strong>modest</strong> treatment effects across the broader accelerator population, working through three mechanisms: compressed feedback, network access, and signalling to capital. Two of the three are about proximity to people rather than programme content.</p><p>At the very top programmes, a large share of the apparent effect is selection rather than treatment.</p>",
    i: "This is the main engineered substitute for an inherited network &mdash; it manufactures a broker layer and a credential in one step. Value concentrates in programmes whose alumni graph actually overlaps your target investors.",
    s: ["accel"],
  },
  "in:geo": {
    k: "Profile attribute",
    t: "Outside a VC hub",
    b: "<p>The local-bias literature documents a strong preference for geographically close investments; face-to-face monitoring and local referral flow lower the cost of due diligence.</p><p>The twist: <strong>non-local investments tend to outperform local ones</strong>, so the bias is behavioural rather than efficient.</p>",
    i: "Distance removes you from the referral flow that generates most deals. The substitute is deliberate presence engineering &mdash; recurring trips timed to fund activity, and brokers who are themselves inside the hub.",
    s: ["buylocal", "localbias"],
  },
  "in:seed": {
    k: "Profile attribute",
    t: "Pre-seed or seed",
    b: "<p>Information asymmetry peaks here, so third-party vouching does the most work. Notably, the elite-education funding premium shows up at <strong>later</strong> stages rather than at seed &mdash; early investors lean on personal referral and traction more than on credentials.</p>",
    i: "At seed, who vouches beats what you have on paper. Catalyzing moves are the documented substitute for inherited access.",
    s: ["shane02", "degrees", "hallen12"],
  },
  "in:deep": {
    k: "Profile attribute",
    t: "Deep tech, unproven",
    b: "<p>Where the product cannot be evaluated quickly, VCs fall back on the team: Gompers et al. find VCs rate the management team above business characteristics both in selection and in explaining eventual outcomes.</p><p>Referrals also compress diligence &mdash; relational embeddedness between referring and receiving investors measurably shortens the process.</p>",
    i: "Legitimacy transfer is the mechanism. Credentialed team members, scientific advisors and a trusted referrer substitute for evidence the investor cannot yet verify.",
    s: ["gompers20", "hsu07", "referral"],
  },

  "me:tie": {
    k: "Mechanism",
    t: "Tie stock",
    b: "<p>How many usable paths you already have into investor networks. This is the single largest channel in the whole system: roughly <strong>60% of VC deal flow</strong> arrives through professional networks, co-investor referrals or portfolio companies, against ~10% inbound.</p><p>Hallen &amp; Eisenhardt call reliance on pre-existing strong ties the &lsquo;privileged&rsquo; path to efficient tie formation &mdash; efficient, but not available to everyone.</p>",
    i: "High tie stock makes warm introductions dominant and makes cold channels close to irrelevant. Low tie stock is what makes catalyzing moves worth the effort.",
    s: ["gompers20", "shane02", "hallen12"],
  },
  "me:sig": {
    k: "Mechanism",
    t: "Credential signal",
    b: "<p>Third-party-verifiable proxies for quality: university, employer, accelerator, prior exit. These matter because they are <em>public</em> and cheap for an investor to check.</p><p>Their effect is stage-dependent &mdash; the elite-education premium is visible in later rounds, much weaker at seed.</p>",
    i: "A strong credential signal makes the credential-proxy strategy viable, meaning you can lead with institutional affiliation rather than needing a personal referral first.",
    s: ["degrees", "alumni", "gompers20"],
  },
  "me:hom": {
    k: "Mechanism",
    t: "Homophily surface",
    b: "<p>The identity dimensions on which you could be matched to an investor: ethnicity, gender, school, prior employer. Shared ethnicity nearly doubles the odds of a match; shared school and employer work similarly.</p><p>This is also the most consistently documented <strong>downside</strong> in the literature: affinity-based pairs exit successfully 20&ndash;32% less often, and female founders backed by female VCs are about half as likely to raise a follow-on round.</p>",
    i: "Use it to open a door, never to build a cap table. The mechanism that gets you the first cheque is the same one that degrades later outcomes.",
    s: ["bengtsson15", "friendship", "snellman23", "ewens20"],
  },
  "me:asy": {
    k: "Mechanism",
    t: "Information asymmetry",
    b: "<p>How much the investor has to take on trust because it cannot yet be verified. Rises with early stage and with technical or scientific uncertainty; falls sharply with a prior exit.</p><p>Shane &amp; Cable's core finding is that ties matter precisely <em>because</em> they transfer private information about founder reliability &mdash; so this mechanism is what makes referral valuable at all.</p>",
    i: "High asymmetry raises the value of anything that transfers legitimacy: warm intros, credentialed advisors, and referrers the investor already trusts.",
    s: ["shane02", "referral", "hsu07"],
  },
  "me:fri": {
    k: "Mechanism",
    t: "Access friction",
    b: "<p>The structural cost of entering the referral flow at all &mdash; from geography, from bias, from simply not knowing anyone. Howell &amp; Nanda's randomised exposure experiment is the cleanest evidence that friction is not only about access to meetings but about what happens after them.</p>",
    i: "This is the mechanism that separates the two equifinal paths in Hallen &amp; Eisenhardt. High friction is exactly when catalyzing strategies stop being a fallback and become the primary route.",
    s: ["howell", "hallen12", "localbias"],
  },

  "st:warm": {
    k: "Strategy",
    t: "Warm intro through a strong tie",
    b: "<p>An introduction from someone whose judgement the partner already trusts. The dominant channel by volume &mdash; over 30% of deal flow comes through professional networks and another ~20% through co-investor referral.</p><p>Warm is a spectrum, not a switch: an intro from someone the partner barely knows transfers almost no trust.</p>",
    i: "Rank possible referrers by <em>their</em> credibility with the target partner, not by how well you know them. One strong referrer beats five weak ones.",
    s: ["gompers20", "shane02"],
  },
  "st:brok": {
    k: "Strategy",
    t: "Brokered weak tie",
    b: "<p>Reaching investors through non-redundant bridging contacts rather than your dense inner circle. Hochberg, Ljungqvist &amp; Lu show the same logic on the investor side: better-networked VC firms have significantly better fund performance, and their portfolio companies are more likely to survive to the next round and to exit.</p>",
    i: "Optimise for a short, credible path &mdash; not for degree count. Targeting a well-networked lead also imports their syndicate access, which is a measurable performance channel in itself.",
    s: ["hochberg07", "shane02"],
  },
  "st:iden": {
    k: "Strategy",
    t: "Identity match",
    b: "<p>Deliberately targeting investors who share an identity dimension with you. The strongest single door-opener in the data: co-ethnicity roughly doubles match probability, and female investors express more interest in female founders.</p><p>It also carries the clearest documented cost &mdash; worse exit rates for affinity-matched pairs, and a halved follow-on rate for female founders first backed by female VCs.</p>",
    i: "Treat this as an entry strategy with an explicit exit plan: use it for the first conversation, then broaden the syndicate before the next round.",
    s: ["bengtsson15", "ewens20", "snellman23", "friendship"],
  },
  "st:cred": {
    k: "Strategy",
    t: "Credential proxy",
    b: "<p>Leading with institutional affiliation &mdash; school, employer, accelerator, prior exit &mdash; so the investor can price you without a personal referral. Works because VCs rate the team above the product and credentials are the cheapest team signal to verify.</p><p>Weaker at seed than in later rounds.</p>",
    i: "Front-load the affiliation in the first two lines of any outreach. If your own credentials are thin, borrowed ones &mdash; advisors, angels, design partners &mdash; carry a similar signal.",
    s: ["gompers20", "degrees", "alumni"],
  },
  "st:cat": {
    k: "Strategy",
    t: "Catalyzing moves",
    b: "<p>Hallen &amp; Eisenhardt's fieldwork identifies a second, <strong>equally efficient</strong> path to investor ties that does not depend on pre-existing strong ties: shaping timing, attention and inducements so that investors come to you.</p><p>In practice: sequencing meetings to create momentum, timing outreach to a proof point, and manufacturing competitive attention.</p>",
    i: "This is the only strategy in the model whose largest weight sits on access friction rather than tie stock &mdash; which is exactly why it is the route for founders without inherited access.",
    s: ["hallen12"],
  },
  "st:cold": {
    k: "Strategy",
    t: "Cold outreach and open platforms",
    b: "<p>Direct approach with no intermediary, or platform-mediated channels. Only about 10% of VC deal flow arrives inbound from company management, so the base rate is low &mdash; but open platforms partially bypass geographic and referral gatekeeping.</p>",
    i: "Best used for discovery rather than conversion: cold outreach to learn which framing lands and to map a market, then spend scarce social capital on warm routes to the targets that actually matter.",
    s: ["gompers20", "localbias"],
  },
};

export const PRESETS: { id: string; label: string; keys: InputKey[]; quiet?: boolean }[] = [
  { id: "a", label: "First-time female founder, non-hub", keys: ["fem", "geo", "seed"] },
  { id: "b", label: "Ex-consultant, elite MBA", keys: ["edu", "emp", "seed"] },
  { id: "c", label: "Second-time founder with exit", keys: ["exit", "ties", "age"] },
  { id: "d", label: "Technical solo founder, deep tech", keys: ["deep", "seed", "edu"] },
  { id: "r", label: "Reset", keys: [], quiet: true },
];

/* ── Model ───────────────────────────────────────────────────── */

export type ComputeResult = {
  activation: Record<MechKey, number>;
  score: Record<StratKey, number>;
  /** Strategy keys, best first. */
  order: StratKey[];
  anyOn: boolean;
};

/**
 * Two stacked logistic layers. Attributes sum into each mechanism, the
 * mechanism activations are squashed to 0–1, then weighted into each
 * strategy and squashed again onto a 0–100 score.
 */
export function compute(on: Partial<Record<InputKey, boolean>>): ComputeResult {
  const activation = {} as Record<MechKey, number>;
  MK.forEach((m) => {
    let raw = 0;
    IK.forEach((k) => {
      if (on[k] && W1[k][m]) raw += W1[k][m]!;
    });
    activation[m] = 1 / (1 + Math.exp(-1.3 * (raw - 0.5)));
  });

  const score = {} as Record<StratKey, number>;
  SK.forEach((s) => {
    let raw = 0;
    (Object.keys(W2[s]) as MechKey[]).forEach((m) => {
      raw += W2[s][m]! * activation[m];
    });
    score[s] = Math.round(100 / (1 + Math.exp(-2.4 * (raw - 0.55))));
  });

  const order = SK.slice().sort((a, b) => score[b] - score[a]);
  return { activation, score, order, anyOn: IK.some((k) => !!on[k]) };
}

export const POS_COLOR = "#1d9e75";
export const NEG_COLOR = "#d85a30";
