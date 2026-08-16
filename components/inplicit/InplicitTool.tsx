"use client";

import { useState } from "react";
import GoalPlanner from "./GoalPlanner";
import RevenuePlanner from "./RevenuePlanner";
import styles from "./InplicitTool.module.css";

type Mode = "goal" | "plan";

/**
 * Zwei Blickrichtungen auf dieselbe Firma, und man braucht beide.
 *
 * Ziel rechnet von oben nach unten: eine Zahl, die stehen soll, und was
 * sie an Kunden, Preis und Akquise bedeutet. Monatsplan rechnet von unten
 * nach oben aus dem, was tatsächlich in der Pipeline steht.
 *
 * Beide bleiben montiert, damit ein Wechsel keine Eingabe verwirft.
 */
export default function InplicitTool() {
  const [mode, setMode] = useState<Mode>("goal");

  return (
    <div className={styles.wrap}>
      <div className={styles.bar} role="tablist" aria-label="Blickrichtung">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "goal"}
          className={`${styles.tab}${mode === "goal" ? ` ${styles.tabOn}` : ""}`}
          onClick={() => setMode("goal")}
        >
          Ziel
          <span className={styles.tabHint}>vom Ziel rückwärts</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "plan"}
          className={`${styles.tab}${mode === "plan" ? ` ${styles.tabOn}` : ""}`}
          onClick={() => setMode("plan")}
        >
          Monatsplan
          <span className={styles.tabHint}>aus der Pipeline vorwärts</span>
        </button>
      </div>

      <div hidden={mode !== "goal"}>
        <GoalPlanner />
      </div>
      <div hidden={mode !== "plan"}>
        <RevenuePlanner />
      </div>
    </div>
  );
}
