"use client";

import styles from "./PillNav.module.css";

export type ToolId = "planner" | "network" | "ready";

export const TOOLS: { id: ToolId; label: string; short: string }[] = [
  { id: "ready", label: "Ready to Raise", short: "Readiness" },
  { id: "planner", label: "Funding Planner", short: "Planner" },
  { id: "network", label: "Network Strategy", short: "Network" },
];

type PillNavProps = {
  active: ToolId;
  onChange: (id: ToolId) => void;
};

export default function PillNav({ active, onChange }: PillNavProps) {
  return (
    <div className={`${styles.wrap} no-print`} id="tools">
      <div className={styles.bar} role="tablist" aria-label="Tool selection">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            role="tab"
            id={`tab-${tool.id}`}
            aria-selected={active === tool.id}
            aria-controls={`panel-${tool.id}`}
            aria-label={tool.label}
            className={styles.pill}
            onClick={() => onChange(tool.id)}
          >
            <span className={styles.full}>{tool.label}</span>
            <span className={styles.short}>{tool.short}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
