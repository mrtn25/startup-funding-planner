"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./PillNav.module.css";

export type ToolId = "planner" | "network" | "ready";

export const TOOLS: { id: ToolId; label: string }[] = [
  { id: "ready", label: "Ready to Raise" },
  { id: "planner", label: "Funding Planner" },
  { id: "network", label: "Network Strategy" },
];

type PillNavProps = {
  active: ToolId;
  onChange: (id: ToolId) => void;
};

/**
 * Three full tool names don't fit across a phone. Rather than abbreviate
 * them, mobile collapses the nav into a single lime trigger showing the
 * current tool, which opens a list with the full titles. Desktop keeps the
 * three pills — the trigger and the dropdown chrome are CSS-only, so there
 * is no viewport check in JS to mismatch on hydration.
 */
export default function PillNav({ active, onChange }: PillNavProps) {
  const [open, setOpen] = useState(false);
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

  const activeLabel = TOOLS.find((t) => t.id === active)?.label ?? "Tools";

  return (
    <div className={`${styles.wrap} no-print`} id="tools" ref={wrapRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls="tool-list"
        onClick={() => setOpen((o) => !o)}
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
            aria-selected={active === tool.id}
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
      </div>
    </div>
  );
}
