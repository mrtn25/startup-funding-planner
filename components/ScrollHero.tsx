import styles from "./ScrollHero.module.css";

const WORDS = ["build.", "validate.", "pitch.", "raise.", "fund.", "scale.", "exit."] as const;

type ScrollHeroProps = {
  /** Anchor the closing CTA scrolls to. */
  ctaHref: string;
};

/**
 * Scroll-driven word hero.
 *
 * Server component on purpose — there is no client-side logic here at all.
 * See ScrollHero.module.css for how the highlight works.
 */
export default function ScrollHero({ ctaHref }: ScrollHeroProps) {
  return (
    <div
      className={`${styles.root} ${styles.animate} no-print`}
      style={{ "--count": WORDS.length } as React.CSSProperties}
    >
      <header className={styles.header}>
        <section className={styles.section}>
          {/* The visible list is decorative — it exists to be scrolled through.
              Screen readers get the whole sentence once, from the h1. */}
          <h1 className={styles.headline}>
            <span aria-hidden="true">you can </span>
            <span className="sr-only">You can build, validate, pitch, raise, fund, scale and exit your startup.</span>
          </h1>
          <ul className={styles.list} aria-hidden="true">
            {WORDS.map((word) => (
              <li key={word} className={styles.word}>
                {word}
              </li>
            ))}
          </ul>
        </section>
      </header>

      <div className={styles.outro}>
        <div className={styles.outroInner}>
          <p className={styles.tagline}>
            <span className={styles.taglineAccent}>your startup.</span>
          </p>
          <p className={styles.blurb}>
            Two free tools for founders — model exactly what each round costs you, and work out which way into an
            investor network actually fits your profile.
          </p>
          <a className={styles.cta} href={ctaHref}>
            Open the tools
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <polyline points="8 3 13 8 8 13" />
              <line x1="3" y1="8" x2="13" y2="8" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
