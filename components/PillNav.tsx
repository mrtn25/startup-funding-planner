"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./PillNav.module.css";

export type ToolId = "planner" | "network" | "ready" | "round" | "bootstrap" | "split" | "recurring";

/* Ordered as the questions actually arrive: do you even need to raise, are
   you ready, how much, what does it cost you, and who do you ask. */
export const TOOLS: { id: ToolId; label: string }[] = [
  { id: "bootstrap", label: "Bootstrap" },
  { id: "recurring", label: "ARR & MRR" },
  { id: "ready", label: "Ready to Raise" },
  { id: "round", label: "Round Planner" },
  { id: "planner", label: "Dilution Planner" },
  { id: "split", label: "Co-Founder Split" },
  { id: "network", label: "Network Strategy" },
];

type PillNavProps = {
  active: ToolId;
  onChange: (id: ToolId) => void;
  /** Which section is showing — Infos and Stats are peers of the tools,
      not footers underneath them. */
  view: "tools" | "infos" | "stats";
  onOpenView: (v: "infos" | "stats") => void;
};

/**
 * Three full tool names don't fit across a phone. Rather than abbreviate
 * them, mobile collapses the nav into a single lime trigger showing the
 * current tool, which opens a list with the full titles. Desktop keeps the
 * three pills — the trigger and the dropdown chrome are CSS-only, so there
 * is no viewport check in JS to mismatch on hydration.
 */
export default function PillNav({ active, onChange, view, onOpenView }: PillNavProps) {
  const [open, setOpen] = useState(false);
  /* Separate from `open`, which drives the mobile dropdown. On a wide screen
     the strip is shown by default and this folds it away; the two cannot be
     one flag, because the same default would mean "list expanded" on a phone
     and "strip visible" on a desktop. */
  const [folded, setFolded] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Only bound while open, so there is no idle listener on the page.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const activeLabel =
    view === "infos" ? "Infos" : view === "stats" ? "Stats" : (TOOLS.find((t) => t.id === active)?.label ?? "Tools");

  return (
    <div className={`${styles.wrap}${folded ? ` ${styles.wrapFolded}` : ""} no-print`} id="tools" ref={wrapRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls="tool-list"
        onClick={() => {
          setOpen((o) => !o);
          setFolded(false);
        }}
      >
        <span className={styles.triggerLabel}>{activeLabel}</span>
        <span className={`${styles.chev}${open ? ` ${styles.chevOpen}` : ""}`} aria-hidden="true">
          ▾
        </span>
      </button>

      <div
        id="tool-list"
        className={`${styles.bar}${open ? ` ${styles.barOpen}` : ""}`}
        role="tablist"
        aria-label="Tool selection"
      >
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            role="tab"
            id={`tab-${tool.id}`}
            aria-selected={view === "tools" && active === tool.id}
            aria-controls={`panel-${tool.id}`}
            className={styles.pill}
            onClick={() => {
              onChange(tool.id);
              setOpen(false);
            }}
          >
            {tool.label}
          </button>
        ))}

        {/* Infos and Stats sit in the same strip as the tools because they
            are peers of them, not appendices underneath. */}
        {(["infos", "stats"] as const).map((v, i) => (
          <button
            key={v}
            type="button"
            role="tab"
            id={`tab-${v}`}
            aria-selected={view === v}
            aria-controls={`panel-${v}`}
            className={`${styles.pill}${i === 0 ? ` ${styles.pillInfos}` : ""}`}
            onClick={() => {
              onOpenView(v);
              setOpen(false);
            }}
          >
            {v === "infos" ? "Infos" : "Stats"}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={styles.fold}
        aria-expanded={!folded}
        aria-controls="tool-list"
        onClick={() => setFolded((f) => !f)}
        title={folded ? "Show the tools" : "Hide the tools"}
      >
        <span className={`${styles.foldChev}${folded ? ` ${styles.foldChevUp}` : ""}`} aria-hidden="true">
          ▾
        </span>
        <span className="sr-only">{folded ? "Show the tools" : "Hide the tools"}</span>
      </button>
    </div>
  );
}
