"use client";

import { useEffect, useRef } from "react";
import styles from "./ScrollHero.module.css";

const WORDS = ["build.", "validate.", "pitch.", "raise.", "fund.", "scale.", "exit."] as const;

type ScrollHeroProps = {
  /** Anchor the closing CTA scrolls to. */
  ctaHref: string;
};

/**
 * Scroll-driven word hero.
 *
 * Each word paints itself with the same tall gradient — dimmed, with an
 * accent band at the reading line — clipped to its glyphs, so a word lights
 * up exactly as it crosses that line.
 *
 * The original technique anchored that gradient to the viewport with
 * `background-attachment: fixed`. Mobile browsers don't honour fixed
 * attachment, so on a phone the band never lined up and no word ever lit up.
 * Instead the gradient is sized to one viewport and its vertical offset is
 * set per word from JS — which is what fixed attachment does internally, but
 * works everywhere.
 */
export default function ScrollHero({ ctaHref }: ScrollHeroProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLLIElement[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let frame = 0;

    const paint = () => {
      frame = 0;
      for (const el of wordsRef.current) {
        if (!el) continue;
        // Offsetting the gradient by -top pins it to the viewport.
        el.style.setProperty("--lit", `${-el.getBoundingClientRect().top}px`);
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const onResize = () => {
      // Gradient stops are expressed against the real viewport height rather
      // than 100vh, which on mobile refers to the address-bar-less height.
      root.style.setProperty("--vph", `${window.innerHeight}px`);
      // Paint synchronously rather than through rAF: a tab that loads in the
      // background never runs animation frames, which would leave every word
      // dimmed until the first scroll.
      if (frame) cancelAnimationFrame(frame);
      paint();
    };

    onResize();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={rootRef}
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
            {WORDS.map((word, i) => (
              <li
                key={word}
                className={styles.word}
                ref={(el) => {
                  if (el) wordsRef.current[i] = el;
                }}
              >
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
            Three free tools for founders — check whether you&apos;re actually ready to raise, model exactly what each
            round costs you, and work out which way into an investor network fits your profile.
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
