"use client";

import Image from "next/image";
import styles from "./ToolGallery.module.css";
import ToolArt from "./ToolArt";
import { TOOLS, type ToolId } from "@/lib/tools";

type Props = {
  onOpenTool: (id: ToolId) => void;
  onOpenView: (v: "infos" | "stats") => void;
};

/**
 * The shelf.
 *
 * A strip of pills told you the tools existed and nothing about what
 * any of them did — you had to open all seven to find the one you
 * needed. A card can carry the drawing, the name and the sentence, so
 * the choice happens before the click.
 *
 * The game sits above the grid rather than inside it, and it is the
 * only card with a photograph. It is not a calculator and should not
 * pretend to be one: you play it, it takes twenty minutes, and it is
 * the thing on this site most likely to be passed on to someone else.
 */
export default function ToolGallery({ onOpenTool, onOpenView }: Props) {
  return (
    <section className={styles.wrap} id="tools" aria-labelledby="shelf-title">
      <div className={styles.head}>
        <h2 id="shelf-title">Seven tools and one game</h2>
        <p>
          Every one of them is a model with its sources written out, free, and nothing is stored anywhere. Pick the
          question you actually have.
        </p>
      </div>

      <a className={styles.game} href="/simulator">
        <span className={styles.gameArt}>
          <Image
            src="/game/cover.jpg"
            alt=""
            fill
            sizes="(max-width: 760px) 100vw, 420px"
            className={styles.gameImg}
          />
        </span>
        <span className={styles.gameBody}>
          <span className={styles.tags}>
            <span className={styles.neu}>New</span>
            <span className={styles.lang}>In German</span>
          </span>
          <h3>Can you get to an exit?</h3>
          <p>
            Two founders, €32,000 in savings and a clock that keeps running while you decide. Play a startup from the
            first prototype to the Series A — and find out what each decision costs you in months.
          </p>
          <span className={styles.cta}>
            Play it <span aria-hidden="true">→</span>
          </span>
        </span>
      </a>

      <ul className={styles.grid}>
        {TOOLS.map((t) => (
          <li key={t.id}>
            <button type="button" className={styles.card} onClick={() => onOpenTool(t.id)}>
              <span className={styles.art}>
                <ToolArt id={t.id} className={styles.artInner} />
              </span>
              <span className={styles.body}>
                <h3>{t.label}</h3>
                <p>{t.blurb}</p>
                <span className={styles.cta}>
                  Try it <span aria-hidden="true">→</span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* Infos and Stats are peers of the tools, not footnotes — but they
          are reading, not calculating, so they get a line and not a card. */}
      <div className={styles.more}>
        <button type="button" onClick={() => onOpenView("infos")}>
          Term sheet glossary <span aria-hidden="true">→</span>
        </button>
        <button type="button" onClick={() => onOpenView("stats")}>
          What the data says <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}
