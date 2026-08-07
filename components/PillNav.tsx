"use client";

import styles from "./PillNav.module.css";

export type ToolId = "planner" | "network";

export const TOOLS: { id: ToolId; label: string }[] = [
  { id: "planner", label: "Funding Planner" },
  { id: "network", label: "Network Strategy" },
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
            className={styles.pill}
            onClick={() => onChange(tool.id)}
          >
            {tool.label}
          </button>
        ))}
      </div>
    </div>
  );
}
