"use client";

import { useMemo, useState } from "react";
import styles from "./InfoCards.module.css";
import { CATEGORIES, ENTRIES, SRC, type Category } from "@/lib/glossary";
import type { ToolId } from "@/components/PillNav";

type Props = { onOpenTool?: (id: ToolId) => void };

/**
 * The vocabulary, as a dense collage rather than a list.
 *
 * Sizes are set per entry rather than by content length: the terms that
 * cost founders the most money get the most room, so the layout carries
 * an argument about what matters instead of only filling space. The grid
 * packs densely, which is why the mix reads as intentional rather than
 * ragged.
 */
export default function InfoCards({ onOpenTool }: Props) {
  const [filter, setFilter] = useState<Category | "all">("all");
  const [open, setOpen] = useState<string | null>(null);

  const shown = useMemo(() => (filter === "all" ? ENTRIES : ENTRIES.filter((e) => e.category === filter)), [filter]);
  const colorOf = (c: Category) => CATEGORIES.find((x) => x.key === c)!.color;

  return (
    <section className={styles.root} id="infos" aria-label="Glossary">
      <header className={styles.head}>
        <h2>The words on the term sheet</h2>
        <p>
          Every entry answers the same three things: what it is, why it exists, and what it does to you. The third is
          what term sheets are quietest about — a clause is rarely hostile in itself, only in combination with a
          mediocre outcome, which is exactly the case nobody models before signing.
        </p>
      </header>

      <div className={styles.filters} role="group" aria-label="Filter by category">
        <button
          type="button"
          aria-pressed={filter === "all"}
          className={`${styles.filter}${filter === "all" ? ` ${styles.filterOn}` : ""}`}
          onClick={() => setFilter("all")}
        >
          Everything
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            aria-pressed={filter === c.key}
            className={`${styles.filter}${filter === c.key ? ` ${styles.filterOn}` : ""}`}
            style={filter === c.key ? { background: c.color, borderColor: c.color, color: "#fff" } : undefined}
            onClick={() => setFilter(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className={styles.grid}>
        {shown.map((e) => {
          const isOpen = open === e.id;
          return (
            <article
              key={e.id}
              className={`${styles.card} ${styles[`size${e.size.toUpperCase()}`]}${isOpen ? ` ${styles.cardOpen}` : ""}`}
              style={{ "--cat": colorOf(e.category) } as React.CSSProperties}
            >
              <button
                type="button"
                className={styles.cardBtn}
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : e.id)}
              >
                <span className={styles.cat}>{CATEGORIES.find((c) => c.key === e.category)!.label}</span>
                <h3>{e.term}</h3>
                <p className={styles.short}>{e.short}</p>
              </button>

              {isOpen && (
                <div className={styles.body}>
                  <p>{e.body}</p>
                  {e.example && (
                    <p className={styles.example}>
                      <span>Worked through</span>
                      {e.example}
                    </p>
                  )}
                  {e.sources && e.sources.length > 0 && (
                    <div className={styles.srcs}>
                      {e.sources.map((id) => (
                        <a
                          key={id}
                          href={SRC[id][1]}
                          target="_blank"
                          rel="noopener noreferrer"
                          dangerouslySetInnerHTML={{ __html: SRC[id][0] }}
                        />
                      ))}
                    </div>
                  )}
                  {e.convention && <p className={styles.convention}>{e.convention}</p>}

                  {e.tool && onOpenTool && (
                    <button
                      type="button"
                      className={styles.toolLink}
                      onClick={() => onOpenTool(e.tool!.id as ToolId)}
                    >
                      → {e.tool.label}
                    </button>
                  )}
                </div>
              )}
            </article>
          );
        })}
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
        <p className={styles.biblioNote}>
          Peer-reviewed work and primary documents only. Where a term is a practitioner convention with no research
          behind it — most of the SaaS metrics are — the entry says so rather than dressing a blog post up as
          evidence. An invented citation would be worse than an honest &ldquo;this is convention&rdquo;.
        </p>
      </details>
    </section>
  );
}
