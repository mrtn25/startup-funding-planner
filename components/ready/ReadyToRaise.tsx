"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./ReadyToRaise.module.css";
import {
  ACTIONS,
  compute,
  DIMS,
  DIM_WEIGHT,
  GROUP_LABEL,
  initialPriorities,
  initialReadyState,
  INPUTS,
  PRIORITIES,
  rankArchetypes,
  SRC,
  W1,
  type ActionKey,
  type DimKey,
  type GroupKey,
  type InputId,
  type PrioKey,
  type ReadyState,
} from "@/lib/ready-to-raise";

/* Prose in the model module is authored in this repo, never user input,
   so the few dangerouslySetInnerHTML uses below are safe. */

const GROUP_ORDER: GroupKey[] = ["access", "signal", "clarity", "material", "process"];

/** Quick starting points, so the board isn't a cold start. */
const PRESETS: { id: string; label: string; on: Partial<Record<InputId, number>>; quiet?: boolean }[] = [
  {
    id: "first",
    label: "First-time founder, pre-seed",
    on: { goal: 0.5, deck: 1, targetProfile: 1, coldOutreach: 1 },
  },
  {
    id: "traction",
    label: "Has traction, no investor network",
    on: { revenue: 1, logos: 1, goal: 1, deck: 1, teaser: 1, list: 0.5, coldOutreach: 1, platformOutreach: 1 },
  },
  {
    id: "connected",
    label: "Well connected, thin proof",
    on: { knowInvestors: 1, vouch: 1, vouchList: 1, warmIntros: 1, advisors: 1, accelerator: 1, goal: 0.5 },
  },
  {
    id: "repeat",
    label: "Second-time founder, mid-raise",
    on: {
      knowInvestors: 1, vouch: 1, vouchList: 1, warmIntros: 1, priorExit: 1, advisors: 1,
      goal: 1, targetProfile: 1, teaser: 1, deck: 1, readDeck: 1, dataroom: 1, crm: 1,
      list: 1, adviceFirst: 1, channelTest: 1,
    },
  },
  { id: "reset", label: "Reset", on: {}, quiet: true },
];

type Props = {
  onOpenTool?: (tool: "planner" | "network") => void;
  /** Whether this tool is the selected tab. Drives the docked panel. */
  isActive?: boolean;
};

export default function ReadyToRaise({ onOpenTool, isActive = true }: Props) {
  const [state, setState] = useState<ReadyState>(initialReadyState);
  const [prio, setPrio] = useState(initialPriorities);
  const [openAction, setOpenAction] = useState<ActionKey | null>(null);
  const [openDim, setOpenDim] = useState<DimKey | null>(null);
  /** Only meaningful on mobile, where the score panel docks to the bottom. */
  const [panelOpen, setPanelOpen] = useState(false);

  /*
   * The docked panel is fixed to the viewport, so without this it would sit
   * over the hero from the moment the page loads — this tool is the default
   * tab, so its markup is present long before anyone has scrolled to it.
   * Track whether the tool is actually on screen and slide the dock away
   * when it isn't. Starts false so nothing flashes in before hydration.
   *
   * Measured from scroll position rather than an IntersectionObserver
   * because the first measurement has to be synchronous: a tab restored in
   * the background fires no observer callbacks until it is looked at.
   *
   * `isActive` is part of the condition rather than relying on the panel
   * measuring 0×0 while hidden, because selecting another tool fires no
   * scroll or resize — the last measurement would otherwise survive, and
   * returning to this tool from the top of the page would put the dock back
   * over the hero.
   */
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !isActive) {
      setInView(false);
      return;
    }

    let frame = 0;
    const measure = () => {
      frame = 0;
      const r = section.getBoundingClientRect();
      // A hidden tool measures 0×0, which correctly reads as "not in view".
      setInView(r.height > 0 && r.top < window.innerHeight - 80 && r.bottom > 160);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);

    // Catches the board growing or shrinking as items are ticked.
    const ro = new ResizeObserver(measure);
    ro.observe(section);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [isActive]);

  const result = useMemo(() => compute(state), [state]);
  const archetypes = useMemo(() => rankArchetypes(prio), [prio]);

  const setLevel = (id: InputId, value: number) => setState((s) => ({ ...s, [id]: value }));
  const toggle = (id: InputId) => setState((s) => ({ ...s, [id]: s[id] ? 0 : 1 }));

  const applyPreset = (on: Partial<Record<InputId, number>>) =>
    setState({ ...initialReadyState(), ...on } as ReadyState);

  const dimMeta = Object.fromEntries(DIMS.map((d) => [d.key, d])) as Record<DimKey, (typeof DIMS)[number]>;
  const explained = openDim ? dimMeta[openDim] : null;

  return (
    <section className={styles.root} aria-label="Ready to raise assessment" ref={sectionRef}>
      <header className={styles.head}>
        <h2>Are you ready to raise?</h2>
        <p>
          Tick what you already have. The model scores five readiness dimensions from the fundraising literature, names
          your binding constraint, and ranks what to fix by leverage — not by what&apos;s easiest.
        </p>
      </header>

      <div className={styles.presetLabel}>Start from an example profile — then adjust</div>
      <div className={styles.presets}>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`${styles.btn}${p.quiet ? ` ${styles.btnQuiet}` : ""}`}
            onClick={() => applyPreset(p.on)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className={styles.layout}>
        {/* ── What you have ── */}
        <div>
          {GROUP_ORDER.map((g) => {
            const items = INPUTS.filter((i) => i.group === g);
            const have = items.filter((i) => (state[i.id] ?? 0) > 0).length;
            return (
              <div className={styles.group} key={g}>
                <div className={styles.groupHead}>
                  <span className={styles.groupTitle}>{GROUP_LABEL[g]}</span>
                  <span className={styles.groupCount}>
                    {have}/{items.length}
                  </span>
                </div>
                <div className={styles.chips}>
                  {items.map((item) =>
                    item.steps ? (
                      <div
                        key={item.id}
                        className={`${styles.seg}${(state[item.id] ?? 0) > 0 ? ` ${styles.segOn}` : ""}`}
                      >
                        <span className={styles.segLabel}>{item.label}</span>
                        <div className={styles.segBtns} role="group" aria-label={item.label}>
                          {item.steps.map((s) => {
                            const active = (state[item.id] ?? 0) === s.value;
                            return (
                              <button
                                key={s.label}
                                type="button"
                                aria-pressed={active}
                                className={`${styles.segBtn}${active ? ` ${styles.segBtnOn}` : ""}`}
                                onClick={() => setLevel(item.id, s.value)}
                              >
                                {s.label}
                              </button>
                            );
                          })}
                        </div>
                        {item.hint && <span className={styles.hint}>{item.hint}</span>}
                      </div>
                    ) : (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={(state[item.id] ?? 0) > 0}
                        className={`${styles.chip}${(state[item.id] ?? 0) > 0 ? ` ${styles.chipOn}` : ""}`}
                        onClick={() => toggle(item.id)}
                      >
                        <span className={styles.dot} />
                        <span>
                          {item.label}
                          {item.hint && <span className={styles.hint}>{item.hint}</span>}
                        </span>
                      </button>
                    ),
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Score ──
            Desktop: a sticky aside next to the board.
            Mobile: docked to the bottom of the viewport so the score stays
            visible while you work down the board, collapsed to a summary
            row that expands on tap. */}
        <aside
          className={`${styles.panel}${panelOpen ? ` ${styles.panelOpen}` : ""}${
            inView ? "" : ` ${styles.dockAway}`
          } no-print`}
          aria-live="polite"
        >
          <div className={styles.panelHead}>
            <div className={styles.panelHeadMain}>
              <div className={styles.kicker}>Readiness</div>
              <div className={styles.scoreRow}>
                <span className={styles.scoreNum}>{result.score}</span>
                <span className={styles.scoreMax}>/ 100</span>
                <span className={styles.bandInline}>
                  {result.anySelected ? result.band.label : "Nothing selected yet"}
                </span>
              </div>
              <div className={styles.band}>{result.anySelected ? result.band.label : "Nothing selected yet"}</div>
              <div className={styles.meter}>
                <span className={styles.meterFill} style={{ width: `${result.score}%` }} />
              </div>
            </div>
            <button
              type="button"
              className={styles.panelToggle}
              onClick={() => setPanelOpen((o) => !o)}
              aria-expanded={panelOpen}
            >
              {panelOpen ? "Hide" : "Details"}
              <span aria-hidden="true">{panelOpen ? "▾" : "▴"}</span>
            </button>
          </div>

          <div className={styles.panelBody}>
            <p className={styles.bandNote}>
              {result.anySelected
                ? result.band.note
                : "Tick what you already have on the left, or start from one of the profiles above."}
            </p>

            <div className={styles.dims}>
            {DIMS.map((d) => {
              const pctVal = Math.round(result.dim[d.key] * 100);
              const isBottleneck = result.anySelected && result.bottleneck === d.key;
              return (
                <button
                  type="button"
                  key={d.key}
                  className={`${styles.dimRow}${isBottleneck ? ` ${styles.dimWeak}` : ""}`}
                  onClick={() => setOpenDim(openDim === d.key ? null : d.key)}
                  aria-expanded={openDim === d.key}
                >
                  <span className={styles.dimTop}>
                    <span className={styles.dimName}>
                      {d.label}{" "}
                      <span style={{ color: "var(--rr-fg3)", fontSize: 11 }}>
                        ·{" "}
                        {Math.round(DIM_WEIGHT[d.key] * 100)}% of score
                      </span>
                    </span>
                    {isBottleneck ? (
                      <span className={styles.bottleTag}>bottleneck</span>
                    ) : (
                      <span className={styles.dimVal}>{pctVal}%</span>
                    )}
                  </span>
                  <span className={styles.dimBar}>
                    <span className={styles.dimFill} style={{ width: `${pctVal}%` }} />
                  </span>
                </button>
              );
            })}
          </div>

          {explained && (
            <div className={styles.explain}>
              <h4>{explained.label}</h4>
              <p dangerouslySetInnerHTML={{ __html: explained.blurb }} />
              <div className={styles.srcLine}>
                <ul>
                  {explained.sources.map((id) => (
                    <li key={id}>
                      <a
                        href={SRC[id][1]}
                        target="_blank"
                        rel="noopener noreferrer"
                        dangerouslySetInnerHTML={{ __html: SRC[id][0] }}
                      />
                    </li>
                  ))}
                </ul>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── Ranked actions ── */}
      <div className={styles.actions}>
        <div className={styles.actionsHead}>
          <h3>What to do next</h3>
          <span className={styles.actionsNote}>Ranked by leverage — how much each would move your score</span>
        </div>

        <div className={styles.actionList}>
          {result.actions.map((a, i) => {
            const open = openAction === a.key;
            return (
              <div key={a.key} className={`${styles.action}${i === 0 && result.anySelected ? ` ${styles.actionTop}` : ""}`}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => setOpenAction(open ? null : a.key)}
                  aria-expanded={open}
                >
                  <span className={styles.rank}>{i + 1}</span>
                  <span className={styles.actionLabel}>{a.def.label}</span>
                  <span className={styles.prio}>
                    <span className={styles.prioBar}>
                      <span className={styles.prioFill} style={{ width: `${a.priority}%` }} />
                    </span>
                    <span className={styles.prioNum}>{a.priority}</span>
                  </span>
                  <span className={styles.chev}>{open ? "▲" : "▼"}</span>
                </button>

                {open && (
                  <div className={styles.actionBody}>
                    <p className={styles.why}>{a.def.why}</p>
                    <ol className={styles.steps}>
                      {a.def.steps.map((s, k) => (
                        <li key={k} dangerouslySetInnerHTML={{ __html: s }} />
                      ))}
                    </ol>
                    {a.def.crossLink && onOpenTool && (
                      <button
                        type="button"
                        className={styles.crossLink}
                        onClick={() => onOpenTool(a.def.crossLink!.tool)}
                      >
                        → {a.def.crossLink.label}
                      </button>
                    )}
                    <div className={styles.srcLine}>
                      <ul>
                        {a.def.sources.map((id) => (
                          <li key={id}>
                            <a
                              href={SRC[id][1]}
                              target="_blank"
                              rel="noopener noreferrer"
                              dangerouslySetInnerHTML={{ __html: SRC[id][0] }}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Investor priorities ── */}
      <div className={styles.prios}>
        <h3>Who should you be targeting?</h3>
        <p className={styles.priosIntro}>
          Readiness tells you whether to start. This tells you who to aim at. Rate how much each criterion matters to
          you (1 = irrelevant, 5 = essential) and the model ranks the investor archetypes that fit.
        </p>

        <div className={styles.prioGrid}>
          <div>
            {PRIORITIES.map((p) => (
              <div className={styles.prioRow} key={p.key}>
                <div className={styles.prioLabel}>{p.label}</div>
                <span className={styles.prioHint}>{p.hint}</span>
                <div className={styles.scale} role="group" aria-label={p.label}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={prio[p.key] === n}
                      className={`${styles.scaleBtn}${prio[p.key] === n ? ` ${styles.scaleBtnOn}` : ""}`}
                      onClick={() => setPrio((s) => ({ ...s, [p.key as PrioKey]: n }))}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            {archetypes.map((a, i) => (
              <div className={`${styles.arch}${i === 0 ? ` ${styles.archLead}` : ""}`} key={a.key}>
                <div className={styles.archTop}>
                  <span className={styles.archName}>{a.label}</span>
                  <span className={styles.archScore}>{a.score}</span>
                </div>
                <p className={styles.archBlurb}>{a.blurb}</p>
                <p className={styles.archWatch} dangerouslySetInnerHTML={{ __html: `Watch: ${a.watch}` }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <WeightsTable />
      <Bibliography />
    </section>
  );
}

function WeightsTable() {
  return (
    <details className={styles.weights}>
      <summary>Show every weight behind the score</summary>
      <div className={styles.tablewrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>What you have</th>
              <th>Feeds</th>
              <th className={styles.num}>Weight</th>
            </tr>
          </thead>
          <tbody>
            {INPUTS.flatMap((item) => {
              const w = W1[item.id] ?? {};
              return (Object.keys(w) as DimKey[]).map((d) => (
                <tr key={`${item.id}-${d}`}>
                  <td>{item.label}</td>
                  <td>{DIMS.find((x) => x.key === d)?.label}</td>
                  <td className={styles.num}>{w[d]!.toFixed(2)}</td>
                </tr>
              ));
            })}
            {DIMS.map((d) => (
              <tr key={`dim-${d.key}`}>
                <td>
                  <em>Dimension: {d.label}</em>
                </td>
                <td>
                  <em>Headline score</em>
                </td>
                <td className={styles.num}>{DIM_WEIGHT[d.key].toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.caveat}>
        Dimension weights are set by hand from the cited literature, not fitted to data — no dataset exists on which a
        readiness model like this has been estimated. Access carries the most because roughly 60% of deal flow arrives
        through networks; materials carry the least because the evidence says the formal plan matters less than founders
        assume. Treat the output as a structured argument about where your effort goes, not a prediction of whether you
        will raise.
      </p>
    </details>
  );
}

function Bibliography() {
  const used = new Set<string>();
  DIMS.forEach((d) => d.sources.forEach((s) => used.add(s)));
  ACTIONS.forEach((a) => a.sources.forEach((s) => used.add(s)));

  return (
    <details className={styles.biblio}>
      <summary>References ({[...used].length} papers)</summary>
      <ol>
        {Object.keys(SRC)
          .filter((id) => used.has(id))
          .map((id) => (
            <li key={id}>
              <a
                href={SRC[id][1]}
                target="_blank"
                rel="noopener noreferrer"
                dangerouslySetInnerHTML={{ __html: SRC[id][0] }}
              />
            </li>
          ))}
      </ol>
    </details>
  );
}
