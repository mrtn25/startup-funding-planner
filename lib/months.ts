/* Month arithmetic on "YYYY-MM" keys, shared by the planners.

   Kept free of every other import so it can be loaded by the bundler
   and by Node's test runner alike. */

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function parseMonth(key: string): { year: number; month: number } {
  const [y, m] = key.split("-").map(Number);
  return { year: y || 2026, month: (m || 1) - 1 };
}

export function addMonths(key: string, n: number): string {
  const { year, month } = parseMonth(key);
  const total = year * 12 + month + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const { year, month } = parseMonth(key);
  return `${MONTH_NAMES[month]} ${String(year).slice(2)}`;
}

/** Every month in a horizon, as {index, key, label} — used by the pickers. */
export function horizon(spec: { startMonth: string; months: number }) {
  return Array.from({ length: spec.months }, (_, i) => {
    const key = addMonths(spec.startMonth, i);
    return { index: i, key, label: monthLabel(key) };
  });
}
