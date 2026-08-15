"use client";

import { useState } from "react";
import { newCustomer, type Customer, type CustomerType, type Segment } from "@/lib/inplicit/plan";
import styles from "./RevenuePlanner.module.css";

type Props = {
  customers: Customer[];
  /** Every month in the horizon, for the month pickers. */
  horizon: { index: number; label: string }[];
  onChange: (next: Customer[]) => void;
};

export default function CustomerTable({ customers, horizon, onChange }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const patch = (id: string, p: Partial<Customer>) =>
    onChange(customers.map((c) => (c.id === id ? { ...c, ...p } : c)));

  const remove = (id: string) => onChange(customers.filter((c) => c.id !== id));

  const duplicate = (id: string) => {
    const i = customers.findIndex((c) => c.id === id);
    if (i < 0) return;
    const copy = newCustomer({ ...customers[i], name: `${customers[i].name} (Kopie)` });
    onChange([...customers.slice(0, i + 1), copy, ...customers.slice(i + 1)]);
  };

  const add = () => onChange([...customers, newCustomer()]);

  const drop = (targetId: string) => {
    if (!dragId || dragId === targetId) return reset();
    const from = customers.findIndex((c) => c.id === dragId);
    const to = customers.findIndex((c) => c.id === targetId);
    if (from < 0 || to < 0) return reset();
    const next = [...customers];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
    reset();
  };

  const reset = () => {
    setDragId(null);
    setOverId(null);
  };

  /** "" ⇄ null, so an empty pick clears the month. */
  const monthValue = (v: number | null) => (v == null ? "" : String(v));
  const parseMonth = (v: string) => (v === "" ? null : Number(v));
  const parseNum = (v: string) => (v.trim() === "" ? null : Math.max(0, Number(v)));

  return (
    <div className={styles.custWrap}>
      <div className={styles.custScroll}>
        <table className={styles.custTable}>
          <thead>
            <tr>
              <th aria-label="Reihenfolge" />
              <th>Name</th>
              <th>Typ</th>
              <th>Segment</th>
              <th>Pilot-Monat</th>
              <th>Pilot k€</th>
              <th>Abo-Monat</th>
              <th>ACV k€</th>
              <th>Expand</th>
              <th>Notiz</th>
              <th aria-label="Aktionen" />
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => {
              const isChannel = c.type === "channel";
              return (
                <tr
                  key={c.id}
                  className={`${dragId === c.id ? styles.rowDragging : ""} ${
                    overId === c.id && dragId !== c.id ? styles.rowOver : ""
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOverId(c.id);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    drop(c.id);
                  }}
                >
                  <td
                    className={styles.dragCell}
                    draggable
                    onDragStart={() => setDragId(c.id)}
                    onDragEnd={reset}
                    title="Ziehen zum Sortieren"
                    aria-label="Ziehen zum Sortieren"
                  >
                    ⠿
                  </td>

                  <td>
                    <input
                      className={styles.custName}
                      type="text"
                      value={c.name}
                      placeholder="Name"
                      onChange={(e) => patch(c.id, { name: e.target.value })}
                      aria-label="Kundenname"
                    />
                  </td>

                  <td>
                    <select
                      className={styles.custSelect}
                      value={c.type}
                      onChange={(e) => patch(c.id, { type: e.target.value as CustomerType })}
                      aria-label="Typ"
                    >
                      <option value="direct">Direktkunde</option>
                      <option value="channel">Channel-Partner</option>
                    </select>
                  </td>

                  <td>
                    <select
                      className={styles.custSelect}
                      value={c.segment}
                      onChange={(e) => patch(c.id, { segment: e.target.value as Segment })}
                      aria-label="Segment"
                    >
                      <option value="mittelstand">Mittelstand</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </td>

                  <td>
                    <select
                      className={styles.custSelect}
                      value={monthValue(c.pilotMonth)}
                      onChange={(e) => patch(c.id, { pilotMonth: parseMonth(e.target.value) })}
                      aria-label={isChannel ? "Startmonat der Partnerschaft" : "Pilot-Monat"}
                    >
                      <option value="">—</option>
                      {horizon.map((m) => (
                        <option key={m.index} value={m.index}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <input
                      className={styles.custNum}
                      type="number"
                      min={0}
                      step={0.5}
                      value={c.pilotRevenue ?? ""}
                      placeholder="auto"
                      onChange={(e) => patch(c.id, { pilotRevenue: parseNum(e.target.value) })}
                      aria-label={isChannel ? "Einmalige Setup-Gebühr" : "Pilot-Umsatz"}
                    />
                  </td>

                  <td>
                    <select
                      className={styles.custSelect}
                      value={isChannel ? "" : monthValue(c.subMonth)}
                      disabled={isChannel}
                      onChange={(e) => patch(c.id, { subMonth: parseMonth(e.target.value) })}
                      aria-label="Abo-Monat"
                    >
                      <option value="">—</option>
                      {horizon.map((m) => (
                        <option key={m.index} value={m.index}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <input
                      className={styles.custNum}
                      type="number"
                      min={0}
                      step={1}
                      value={isChannel ? "" : (c.subACV ?? "")}
                      placeholder="auto"
                      disabled={isChannel}
                      onChange={(e) => patch(c.id, { subACV: parseNum(e.target.value) })}
                      aria-label="Abo-ACV"
                    />
                  </td>

                  <td className={styles.centerCell}>
                    <input
                      type="checkbox"
                      checked={c.expand}
                      disabled={isChannel}
                      onChange={(e) => patch(c.id, { expand: e.target.checked })}
                      aria-label="Expand aktiv"
                    />
                  </td>

                  <td>
                    <input
                      className={styles.custNote}
                      type="text"
                      value={c.note}
                      placeholder="Notiz"
                      onChange={(e) => patch(c.id, { note: e.target.value })}
                      aria-label="Notiz"
                    />
                  </td>

                  <td className={styles.actionCell}>
                    <button
                      type="button"
                      className={styles.rowBtn}
                      onClick={() => duplicate(c.id)}
                      title="Duplizieren"
                      aria-label={`${c.name || "Zeile"} duplizieren`}
                    >
                      ⧉
                    </button>
                    <button
                      type="button"
                      className={styles.rowBtn}
                      onClick={() => remove(c.id)}
                      title="Löschen"
                      aria-label={`${c.name || "Zeile"} löschen`}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}

            {!customers.length && (
              <tr>
                <td colSpan={11} className={styles.emptyRow}>
                  Noch keine namentlichen Kunden. Ohne sie kommt der Plan allein aus dem Funnel.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button type="button" className={styles.addBtn} onClick={add}>
        + Kunde hinzufügen
      </button>
    </div>
  );
}
