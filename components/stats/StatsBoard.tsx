"use client";

import { useState } from "react";
import styles from "./StatsBoard.module.css";
import { OMITTED, SRC, STATS, SURVIVAL, VC_SHARE, VC_SHARE_MODERN } from "@/lib/stats";

const ACCENT = "#2200FF";
const LIME = "#a8cf12";

/**
 * The numbers, with their caveats attached rather than in a footnote.
 *
 * Every figure is traceable to a named paper or a government series. The
 * ones that circulate loudest in this space are not, so they are not here —
 * and the section says so, because an empty slot is more honest than a
 * confident invention.
 */
export default function StatsBoard() {
  const [open, setOpen] = useState<string | null>("survival-5");

  return (
    <section className={styles.root} id="stats" aria-label="Startup statistics">
      <header className={styles.head}>
        <h2>What the data actually says</h2>
        <p>
          Every number here is traceable to a paper or a government series, and each one carries what it measures —
          and what it does not — rather than hiding the caveat in a footnote. The figures that circulate loudest in
          this business mostly cannot be traced anywhere, so they are not here.
        </p>
      </header>

      {/* ── Survival ── */}
      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <h3>How long businesses last</h3>
          <span className={styles.panelNote}>All new US employer establishments, 1994–2022</span>
        </div>
        <div className={styles.curve}>
          {SURVIVAL.map((p) => (
            <div key={p.year} className={styles.bar}>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ height: `${p.share * 100}%` }} />
                <span className={styles.barPct}>{Math.round(p.share * 100)} %</span>
              </div>
              <span className={styles.barLabel}>{p.year === 0 ? "start" : `yr ${p.year}`}</span>
            </div>
          ))}
        </div>
        <p className={styles.caution}>
          <strong>Read this one carefully.</strong> It counts every new employer establishment — overwhelmingly
          restaurants, shops and contractors. It is not a startup failure rate, and quoting it as one is the most
          common misuse of business statistics in a pitch deck.
        </p>
      </div>

      {/* ── VC's share ── */}
      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <h3>How concentrated the outcomes are</h3>
          <span className={styles.panelNote}>Share of US public companies that were venture-backed</span>
        </div>
        <div className={styles.shareGrid}>
          <div>
            <div className={styles.shareTitle}>All public companies</div>
            {VC_SHARE.map((x) => (
              <div key={x.label} className={styles.shareRow}>
                <span className={styles.shareLabel}>{x.label}</span>
                <span className={styles.shareTrack}>
                  <span style={{ width: `${x.share * 100}%`, background: ACCENT }} />
                </span>
                <strong>{Math.round(x.share * 100)} %</strong>
              </div>
            ))}
          </div>
          <div>
            <div className={styles.shareTitle}>Founded after 1968 only</div>
            {VC_SHARE_MODERN.map((x) => (
              <div key={x.label} className={styles.shareRow}>
                <span className={styles.shareLabel}>{x.label}</span>
                <span className={styles.shareTrack}>
                  <span style={{ width: `${x.share * 100}%`, background: LIME }} />
                </span>
                <strong>{Math.round(x.share * 100)} %</strong>
              </div>
            ))}
          </div>
        </div>
        <p className={styles.panelFoot}>
          Venture capital funds a vanishingly small number of companies and ends up owning a large share of the
          value. That is the arithmetic behind every question about market size — and behind an investor who likes
          you saying no.
        </p>
      </div>

      {/* ── The rest, as cards ── */}
      <div className={styles.grid}>
        {STATS.map((s) => {
          const isOpen = open === s.id;
          return (
            <article key={s.id} className={`${styles.card} ${styles[`size${(s.size ?? "m").toUpperCase()}`]}`}>
              <button
                type="button"
                className={styles.cardBtn}
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : s.id)}
              >
                <span className={styles.value}>{s.value}</span>
                <span className={styles.label}>{s.label}</span>
              </button>
              {isOpen && (
                <div className={styles.detail}>
                  <p>{s.detail}</p>
                  <div className={styles.srcs}>
                    {s.sources.filter((id) => SRC[id]).map((id) => (
                      <a
                        key={id}
                        href={SRC[id][1]}
                        target="_blank"
                        rel="noopener noreferrer"
                        dangerouslySetInnerHTML={{ __html: SRC[id][0] }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className={styles.omitted}>
        <div className={styles.omittedTitle}>{OMITTED.title}</div>
        <p>{OMITTED.body}</p>
      </div>

      <details className={styles.biblio}>
        <summary>All sources ({Object.keys(SRC).length})</summary>
        <ol>
          {Object.keys(SRC).map((id) => (
            <li key={id}>
              <a href={SRC[id][1]} target="_blank" rel="noopener noreferrer" dangerouslySetInnerHTML={{ __html: SRC[id][0] }} />
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
