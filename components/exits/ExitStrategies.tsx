"use client";

import { useMemo, useState } from "react";
import styles from "./ExitStrategies.module.css";
import {
  APPROACHES,
  CAVEATS,
  EMPTY,
  FAMILIES,
  GROWTHS,
  MOTIVES,
  OWNERS,
  ranked,
  ROUTES,
  SIZES,
  SRC,
  type ExitState,
  type Family,
  type Growth,
  type Motive,
  type Owner,
  type Route,
  type Size,
} from "@/lib/exits";

/* Prose in the model module is authored in this repo, never user input,
   so the dangerouslySetInnerHTML use in the bibliography is safe. */

/**
 * Exit Strategies.
 *
 * The caveat comes first and does not fold away, because the most
 * common mistake this tool can help with is treating the exit as the
 * goal. Then four questions about what you want and what you have,
 * and then the doors — ranked by fit, never by payout, each with what
 * it costs and the trap in front of it.
 */
export default function ExitStrategies() {
  const [s, setS] = useState<ExitState>(EMPTY);
  const [open, setOpen] = useState<string | null>("strategic");

  const liste = useMemo(() => ranked(s), [s]);
  const set = <K extends keyof ExitState>(k: K, v: ExitState[K]) => setS((p) => ({ ...p, [k]: v }));

  const bester = liste[0];
  const harvestOben = liste.findIndex((r) => r.route.family === "harvest") <= 1;

  return (
    <section className={styles.root} aria-label="Exit strategies">
      <header className={styles.head}>
        <h2>Which door is actually open?</h2>
        <p className={styles.lead}>
          There are more ways out of a company than the two everyone names, and which one is available to you is mostly
          decided years before anyone makes an offer. This sorts the routes by what you want and what you have built —
          and tells you what each one costs, because none of them is free.
        </p>
      </header>

      {/* Up front, not in a footnote: the exit is not the plan. */}
      <div className={styles.caveats}>
        <div className={styles.caveatsHead}>
          <strong>Before anything else</strong>
          <span>Four findings that argue against making the exit your goal</span>
        </div>
        <ol className={styles.caveatList}>
          {CAVEATS.map((c) => (
            <li key={c.title}>
              <strong>{c.title}</strong>
              <p>{c.text}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.board}>
        <aside className={styles.inputs}>
          <h3>Your situation</h3>

          <fieldset className={styles.group}>
            <legend>What do you actually want?</legend>
            <div className={styles.cards}>
              {MOTIVES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  className={`${styles.card} ${s.motive === m.key ? styles.cardOn : ""}`}
                  onClick={() => set("motive", m.key as Motive)}
                  aria-pressed={s.motive === m.key}
                >
                  <strong>{m.label}</strong>
                  <span>{m.blurb}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <Seg
            legend="Who owns it today?"
            options={OWNERS}
            value={s.owner}
            onPick={(v) => set("owner", v as Owner)}
          />
          <Seg legend="Revenue" options={SIZES} value={s.size} onPick={(v) => set("size", v as Size)} />
          <Seg legend="Growth" options={GROWTHS} value={s.growth} onPick={(v) => set("growth", v as Growth)} />

          <fieldset className={styles.group}>
            <legend>And these four</legend>
            <Tick
              label="It funds itself out of its own profit"
              hint="No round needed to make it to next year."
              on={s.selfFunding}
              toggle={() => set("selfFunding", !s.selfFunding)}
            />
            <Tick
              label="Someone inside could take over"
              hint="A person, not a role you would have to hire for."
              on={s.successor}
              toggle={() => set("successor", !s.successor)}
            />
            <Tick
              label="People in the industry already talk to us"
              hint="Partners, platforms, competitors — a relationship, not a cold list."
              on={s.relationships}
              toggle={() => set("relationships", !s.relationships)}
            />
            <Tick
              label="We want to keep working in it"
              hint="After whatever happens, you are still there."
              on={s.stay}
              toggle={() => set("stay", !s.stay)}
            />
          </fieldset>
        </aside>

        <div className={styles.results}>
          <div className={styles.verdict}>
            <span className={styles.verdictLabel}>Closest fit</span>
            <strong>{bester.route.label}</strong>
            <p>{bester.because}</p>
            <span className={styles.verdictNote}>
              Fit, not recommendation. The list below is ordered by how well each route matches your answers — a route
              can fit and still be the wrong idea.
            </span>
          </div>

          <ol className={styles.routes}>
            {liste.map(({ route, score, because }) => (
              <li key={route.id}>
                <button
                  type="button"
                  className={`${styles.route} ${open === route.id ? styles.routeOpen : ""}`}
                  onClick={() => setOpen(open === route.id ? null : route.id)}
                  aria-expanded={open === route.id}
                >
                  <span className={styles.routeTop}>
                    <span className={`${styles.badge} ${styles[route.family]}`}>{familyLabel(route.family)}</span>
                    <strong>{route.label}</strong>
                    <span className={styles.score} aria-label={`Fit ${score} of 100`}>
                      <i style={{ width: `${score}%` }} />
                    </span>
                  </span>
                  <span className={styles.routeWhy}>{because}</span>
                </button>
                {open === route.id && <Detail route={route} />}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* The part founders mistake for negotiation. */}
      <div className={styles.approach}>
        <h3>How a strategic buyer comes about</h3>
        <p className={styles.lead}>
          In the twelve sales Graebner and Eisenhardt followed, none was set off by a sale process. They were set off by
          ordinary moments — a funding round, a search for a CEO — and the buyer was someone there was already a
          relationship with. A process does not create a buyer; it sorts the ones you already have.
          {harvestOben ? " Given your answers, this is the work that matters." : ""}
        </p>
        <ul className={styles.approachList}>
          {APPROACHES.map((a) => (
            <li key={a.id}>
              <strong>{a.label}</strong>
              <p>{a.what}</p>
              <span>{a.horizon}</span>
            </li>
          ))}
        </ul>
      </div>

      <Bibliography />
    </section>
  );
}

function familyLabel(f: Family): string {
  return FAMILIES.find((x) => x.key === f)?.label ?? f;
}

function Detail({ route }: { route: Route }) {
  const rows: [string, string][] = [
    ["What happens", route.what],
    ["Who is on the other side", route.who],
    ["How common", route.frequency],
    ["Lead time", route.leadTime],
    ["What it costs you", route.price],
    ["The trap", route.trap],
  ];
  return (
    <div className={styles.detail}>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k} className={k === "The trap" ? styles.trap : undefined}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className={styles.cites}>
        {route.sources
          .filter((id) => SRC[id])
          .map((id) => (
            <a key={id} href={SRC[id][1]} target="_blank" rel="noopener noreferrer">
              {id}
            </a>
          ))}
      </div>
    </div>
  );
}

function Seg<T extends string>({
  legend,
  options,
  value,
  onPick,
}: {
  legend: string;
  options: { key: T; label: string; hint: string }[];
  value: T;
  onPick: (v: T) => void;
}) {
  return (
    <fieldset className={styles.group}>
      <legend>{legend}</legend>
      <div className={styles.seg} role="group">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            className={`${styles.segBtn} ${value === o.key ? styles.segOn : ""}`}
            onClick={() => onPick(o.key)}
            aria-pressed={value === o.key}
            title={o.hint}
          >
            {o.label}
          </button>
        ))}
      </div>
      <span className={styles.hint}>{options.find((o) => o.key === value)?.hint}</span>
    </fieldset>
  );
}

function Tick({ label, hint, on, toggle }: { label: string; hint: string; on: boolean; toggle: () => void }) {
  return (
    <button type="button" className={`${styles.tick} ${on ? styles.tickOn : ""}`} onClick={toggle} aria-pressed={on}>
      <span className={styles.box} aria-hidden="true">
        {on ? "✓" : ""}
      </span>
      <span>
        <strong>{label}</strong>
        <em>{hint}</em>
      </span>
    </button>
  );
}

function Bibliography() {
  const used = new Set<string>();
  ROUTES.forEach((r) => r.sources.forEach((x) => used.add(x)));
  APPROACHES.forEach((a) => a.sources.forEach((x) => used.add(x)));
  CAVEATS.forEach((c) => c.sources.forEach((x) => used.add(x)));

  return (
    <details className={styles.biblio}>
      <summary>References ({[...used].length})</summary>
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
      <p className={styles.caveat}>
        Fit scores are set by hand from the cited literature, not fitted to data — no dataset exists on which an exit
        model like this has been estimated. They are a structured argument about which doors your situation opens, not a
        forecast. The base rates quoted are from US venture-backed samples and read high for the rest of the economy,
        where closing and succession are far more common than any sale.
      </p>
    </details>
  );
}
