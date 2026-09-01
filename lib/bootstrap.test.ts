/* Tests für die Bootstrap-Kriterien.
     node --test lib/bootstrap.test.ts
*/

import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_BOOTSTRAP, assessBootstrap, type BootstrapInputs } from "./bootstrap.ts";

/** Ein Geschäft, das jedes Kriterium erfüllt. */
const IDEAL: BootstrapInputs = {
  monthsToRevenue: 0,
  grossMargin: 0.85,
  upfrontCapital: 0,
  paymentDays: -30,
  marketClock: "open",
  founderSells: true,
  founderRunwayMonths: 24,
  ambition: "profitable",
};

test("ein Geschäft, das alles erfüllt, wird auch so beurteilt", () => {
  const r = assessBootstrap(IDEAL);
  assert.equal(r.verdict, "yes");
  assert.ok(r.score > 0.95);
  assert.equal(r.hardStops.length, 0);
  assert.equal(r.blocker, null);
});

test("jedes Kriterium bekommt ein eigenes Urteil", () => {
  const r = assessBootstrap(IDEAL);
  assert.equal(r.criteria.length, 8);
  for (const c of r.criteria) {
    assert.equal(c.verdict, "yes");
    assert.ok(c.finding.length > 10, `${c.key} braucht einen Befund`);
    assert.ok(c.requirement.length > 10, `${c.key} braucht eine Bedingung`);
    assert.ok(c.sources.length > 0, `${c.key} braucht eine Quelle`);
  }
});

/* ── Die harten Ausschlüsse ─────────────────────────────────── */

test("Kapital vor dem ersten Verkauf ist ein Ausschluss, kein Abzug", () => {
  const hardware = assessBootstrap({ ...IDEAL, upfrontCapital: 800 });
  assert.equal(hardware.verdict, "no");
  assert.ok(hardware.hardStops.some((c) => c.key === "upfrontCapital"));
  // Und zwar auch dann, wenn sonst alles perfekt ist.
  assert.ok(hardware.score > 0.5, "der Rest ist gut — trotzdem nein");
});

test("ein Land-Grab schließt Bootstrapping aus, so gut die Marge auch ist", () => {
  const race = assessBootstrap({ ...IDEAL, marketClock: "landgrab" });
  assert.equal(race.verdict, "no");
  assert.ok(race.hardStops.some((c) => c.key === "marketClock"));
});

test("ein Jahr ohne Umsatz ebenfalls", () => {
  const slow = assessBootstrap({ ...IDEAL, monthsToRevenue: 18 });
  assert.equal(slow.verdict, "no");
  assert.ok(slow.hardStops.some((c) => c.key === "timeToRevenue"));
});

test("ein offener Markt ist kein Ausschluss", () => {
  assert.equal(assessBootstrap({ ...IDEAL, marketClock: "contested" }).hardStops.length, 0);
});

/* ── Die Skalen ─────────────────────────────────────────────── */

test("eine dünne Marge senkt das Urteil, ohne es zu blockieren", () => {
  const thin = assessBootstrap({ ...IDEAL, grossMargin: 0.2 });
  const fat = assessBootstrap({ ...IDEAL, grossMargin: 0.85 });
  const scoreOf = (r: ReturnType<typeof assessBootstrap>, k: string) =>
    r.criteria.find((c) => c.key === k)!.score;
  assert.equal(scoreOf(thin, "grossMargin"), 0);
  assert.equal(scoreOf(fat, "grossMargin"), 1);
  assert.ok(thin.score < fat.score);
  assert.equal(thin.hardStops.length, 0);
});

test("Vorkasse zählt besser als ein langes Zahlungsziel", () => {
  const cycle = (days: number) =>
    assessBootstrap({ ...IDEAL, paymentDays: days }).criteria.find((c) => c.key === "cashCycle")!.score;
  assert.equal(cycle(-30), 1);
  assert.equal(cycle(90), 0);
  assert.ok(cycle(30) > 0 && cycle(30) < 1);
});

test("Venture-Ambition spricht gegen Bootstrapping, ohne es zu verbieten", () => {
  const vc = assessBootstrap({ ...IDEAL, ambition: "venture" });
  assert.ok(vc.criteria.find((c) => c.key === "ambition")!.score < 0.2);
  assert.equal(vc.hardStops.length, 0);
});

/* ── Der Engpass ────────────────────────────────────────────── */

test("das schwächste Kriterium wird als Engpass benannt", () => {
  const r = assessBootstrap({ ...IDEAL, grossMargin: 0.22 });
  assert.equal(r.blocker?.key, "grossMargin");
});

test("wo nichts klemmt, wird auch kein Engpass erfunden", () => {
  assert.equal(assessBootstrap(IDEAL).blocker, null);
});

test("die Ausgangswerte ergeben ein brauchbares, nicht geschöntes Bild", () => {
  const r = assessBootstrap(DEFAULT_BOOTSTRAP);
  assert.ok(r.score > 0.3 && r.score < 0.9, `unplausibler Startwert: ${r.score}`);
  assert.ok(r.headline.length > 20);
});

test("die Gewichte summieren sich zu eins", () => {
  const sum = assessBootstrap(IDEAL).criteria.reduce((a, c) => a + c.weight, 0);
  assert.equal(Math.round(sum * 1000) / 1000, 1);
});
