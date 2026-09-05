"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./SiteHeader.module.css";
import { TOOLS, type ToolId } from "./PillNav";

type Props = {
  active: ToolId;
  onOpenTool: (id: ToolId) => void;
  onOpenView: (v: "infos" | "stats") => void;
  view: "tools" | "infos" | "stats";
};

/**
 * Wordmark and the one menu.
 *
 * Fixed rather than sticky-on-scroll: the tools are long, and a mark that
 * disappears leaves you unsure which page you are on. The panel closes on
 * outside click and on Escape, and the listeners only exist while it is
 * open so there is nothing bound to the document at rest.
 */
export default function SiteHeader({ active, onOpenTool, onOpenView, view }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const go = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  return (
    <header className={`${styles.bar} no-print`} ref={wrapRef}>
      <a
        className={styles.mark}
        href="#top"
        onClick={() => setOpen(false)}
        aria-label="backable — back to the top"
      >
        backable
      </a>

      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => setOpen((o) => !o)}
      >
        Menu
        <span className={`${styles.chev}${open ? ` ${styles.chevOpen}` : ""}`} aria-hidden="true">
          ▾
        </span>
      </button>

      <div id="site-menu" className={`${styles.panel}${open ? ` ${styles.panelOpen}` : ""}`} hidden={!open}>
        <div className={styles.group}>
          <div className={styles.groupTitle}>Tools</div>
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`${styles.item}${view === "tools" && active === t.id ? ` ${styles.itemOn}` : ""}`}
              onClick={() => go(() => onOpenTool(t.id))}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={styles.group}>
          <div className={styles.groupTitle}>Infos</div>
          <button
            type="button"
            className={`${styles.item}${view === "infos" ? ` ${styles.itemOn}` : ""}`}
            onClick={() => go(() => onOpenView("infos"))}
          >
            Term sheet glossary
          </button>
          <a
            className={styles.item}
            href="https://github.com/mrtn25/startup-funding-planner"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            Source & method ↗
          </a>
        </div>

        <div className={styles.group}>
          <div className={styles.groupTitle}>Stats</div>
          <button
            type="button"
            className={`${styles.item}${view === "stats" ? ` ${styles.itemOn}` : ""}`}
            onClick={() => go(() => onOpenView("stats"))}
          >
            What the data says
          </button>
        </div>
      </div>
    </header>
  );
}
