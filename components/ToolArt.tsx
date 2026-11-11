/* ══════════════════════════════════════════════════════════════
   The drawings on the tool cards.

   Line art rather than photography or icons: every tool on this site
   is a model with a shape — a curve that crosses zero, a slice that
   keeps shrinking, a staircase you are working backwards from — and
   drawing that shape says more in a thumbnail than any icon of a
   calculator would.

   One ink colour, `currentColor`, set by the card to the brand blue.
   That is the whole palette, so the eight tiles read as one set and
   dark mode is a single token swap instead of eight new files.
   ══════════════════════════════════════════════════════════════ */

type Props = { id: string; className?: string };

const BOX = "0 0 160 100";

/** Shared stroke: everything is drawn with the same pen. */
const stift = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Bootstrap: cash dips under the line, then comes back over it. */
function Bootstrap() {
  return (
    <svg viewBox={BOX} aria-hidden="true">
      <path d="M12 58h136" {...stift} strokeWidth={1.6} strokeDasharray="5 6" opacity={0.45} />
      <path d="M14 46c18 0 22 34 44 34s32-30 44-42 26-18 44-24" {...stift} />
      {/* Genau auf dem Schnittpunkt: der Monat, der sich selbst traegt. */}
      <circle cx="88" cy="58" r="5" fill="currentColor" />
      <path d="M135 9l11 5-4 11" {...stift} strokeWidth={2.4} />
    </svg>
  );
}

/** ARR: what counts gets filled, what diligence strikes out stays open. */
function Recurring() {
  const bars = [18, 24, 30, 34, 42, 46, 54, 58, 64, 70, 76, 82];
  return (
    <svg viewBox={BOX} aria-hidden="true">
      <path d="M12 84h136" {...stift} strokeWidth={1.6} opacity={0.45} />
      {bars.map((h, i) => {
        const x = 14 + i * 11.5;
        const offen = i >= 9;
        return (
          <rect
            key={i}
            x={x}
            y={84 - h}
            width={8}
            height={h}
            rx={2}
            fill={offen ? "none" : "currentColor"}
            stroke="currentColor"
            strokeWidth={offen ? 2 : 0}
            strokeDasharray={offen ? "4 4" : undefined}
            opacity={offen ? 0.6 : 1}
          />
        );
      })}
    </svg>
  );
}

/** Ready to raise: a gauge with the needle short of the mark. */
function Ready() {
  const ticks = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const w = Math.PI + (i * Math.PI) / 6;
    return {
      x1: 80 + 46 * Math.cos(w),
      y1: 76 + 46 * Math.sin(w),
      x2: 80 + 38 * Math.cos(w),
      y2: 76 + 38 * Math.sin(w),
    };
  });
  return (
    <svg viewBox={BOX} aria-hidden="true">
      <path d="M26 76a54 54 0 0 1 108 0" {...stift} strokeWidth={1.6} opacity={0.4} />
      <path d="M34 76a46 46 0 0 1 60-43.7" {...stift} strokeWidth={7} />
      {ticks.map((t, i) => (
        <line key={i} {...t} {...stift} strokeWidth={1.6} opacity={0.45} />
      ))}
      <path d="M80 76 108 48" {...stift} />
      <circle cx="80" cy="76" r="5.5" fill="currentColor" />
    </svg>
  );
}

/** Round Planner: working backwards from the milestone at the top. */
function Round() {
  return (
    <svg viewBox={BOX} aria-hidden="true">
      <path d="M12 86h136" {...stift} strokeWidth={1.6} opacity={0.45} />
      <rect x="18" y="64" width="34" height="22" rx={3} {...stift} />
      <rect x="58" y="48" width="34" height="38" rx={3} {...stift} />
      <rect x="98" y="28" width="34" height="58" rx={3} fill="currentColor" stroke="none" />
      <path d="M115 24V8" {...stift} strokeWidth={2} />
      <path d="M115 8h20l-5 6 5 6h-20z" fill="currentColor" stroke="none" />
      <path d="M96 18H74" {...stift} strokeWidth={2} strokeDasharray="4 5" />
      <path d="M80 13l-6 5 6 5" {...stift} strokeWidth={2} />
    </svg>
  );
}

/** Dilution: the slice you keep, after everyone else has had theirs. */
function Planner() {
  const C = 2 * Math.PI * 30;
  const arc = (anteil: number, ab: number, dick = 13, op = 1) => ({
    ...stift,
    strokeWidth: dick,
    strokeLinecap: "butt" as const,
    strokeDasharray: `${C * anteil} ${C}`,
    strokeDashoffset: -C * ab,
    opacity: op,
  });
  return (
    <svg viewBox={BOX} aria-hidden="true">
      <g transform="rotate(-90 80 50)">
        <circle cx="80" cy="50" r="30" {...arc(0.52, 0)} />
        <circle cx="80" cy="50" r="30" {...arc(0.2, 0.535, 13, 0.55)} />
        <circle cx="80" cy="50" r="30" {...arc(0.14, 0.75, 13, 0.35)} />
        <circle cx="80" cy="50" r="30" {...arc(0.1, 0.9, 13, 0.2)} />
      </g>
    </svg>
  );
}

/** Co-founder split: two sets, one overlap, one line through it. */
function Split() {
  return (
    <svg viewBox={BOX} aria-hidden="true">
      <circle cx="62" cy="50" r="30" {...stift} />
      <circle cx="98" cy="50" r="30" {...stift} />
      <path d="M80 22v56" {...stift} strokeWidth={2} strokeDasharray="5 5" opacity={0.6} />
      <circle cx="62" cy="50" r="6" fill="currentColor" />
      <circle cx="98" cy="50" r="6" fill="currentColor" />
    </svg>
  );
}

/** Network: the one warm path through, among all the cold ones. */
function Network() {
  const kanten = [
    "M26 50 76 24",
    "M26 50 70 76",
    "M76 24 128 36",
    "M70 76 128 36",
    "M70 76 124 78",
    "M76 24 124 78",
  ];
  return (
    <svg viewBox={BOX} aria-hidden="true">
      {kanten.map((d, i) => (
        <path key={i} d={d} {...stift} strokeWidth={1.6} opacity={0.3} />
      ))}
      <path d="M26 50 76 24 128 36" {...stift} strokeWidth={3} />
      <circle cx="26" cy="50" r="8" fill="currentColor" />
      <circle cx="76" cy="24" r="7" fill="currentColor" />
      <circle cx="128" cy="36" r="9" {...stift} strokeWidth={3} />
      <circle cx="70" cy="76" r="6" {...stift} strokeWidth={2} opacity={0.45} />
      <circle cx="124" cy="78" r="6" {...stift} strokeWidth={2} opacity={0.45} />
    </svg>
  );
}

const ZEICHNUNGEN: Record<string, () => React.JSX.Element> = {
  bootstrap: Bootstrap,
  recurring: Recurring,
  ready: Ready,
  round: Round,
  planner: Planner,
  split: Split,
  network: Network,
};

export default function ToolArt({ id, className }: Props) {
  const Zeichnung = ZEICHNUNGEN[id];
  if (!Zeichnung) return <span className={className} />;
  return (
    <span className={className}>
      <Zeichnung />
    </span>
  );
}
