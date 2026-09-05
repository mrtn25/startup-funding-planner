"use client";

import { useCallback, useEffect, useState } from "react";
import type { RoundId } from "@/lib/planner";
import BootstrapPlanner from "./bootstrap/BootstrapPlanner";
import NetworkStrategy from "./network/NetworkStrategy";
import PillNav, { TOOLS, type ToolId } from "./PillNav";
import ScrollHero from "./ScrollHero";
import SiteHeader from "./SiteHeader";
import InfoCards from "./infos/InfoCards";
import StatsBoard from "./stats/StatsBoard";
import Planner from "./planner/Planner";
import RecurringCalc from "./recurring/RecurringCalc";
import EquitySplit from "./split/EquitySplit";
import RoundPlanner from "./round/RoundPlanner";
import ReadyToRaise from "./ready/ReadyToRaise";

const DEFAULT_TOOL: ToolId = "bootstrap";

export type View = "tools" | "infos" | "stats";

/**
 * All seven tools stay mounted and the inactive ones are `hidden`, so
 * switching tabs never discards what you entered. The choice is mirrored
 * into `?tool=` so a tab can be linked to directly.
 */
/** Maps a Round Planner stage onto the matching round in the Dilution Planner. */
const STAGE_TO_ROUND: Record<string, RoundId> = {
  preseed: "preSeed",
  seed: "seed",
  seriesa: "serA",
  seriesb: "serB",
};

export default function ToolSwitcher() {
  const [active, setActive] = useState<ToolId>(DEFAULT_TOOL);
  const [view, setView] = useState<View>("tools");
  /* Amount handed over from the Round Planner. The token makes a repeat
     hand-off of the same number still register as a new instruction. */
  const [seed, setSeed] = useState<{ roundId: RoundId; investM: number; token: number } | null>(null);

  // Read the deep link after mount — keeps the server render deterministic.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const param = q.get("tool");
    if (TOOLS.some((t) => t.id === param)) setActive(param as ToolId);
    const v = q.get("view");
    if (v === "infos" || v === "stats") setView(v);
  }, []);

  const select = useCallback((id: ToolId) => {
    setActive(id);
    setView("tools");
    const url = new URL(window.location.href);
    url.searchParams.delete("view");
    if (id === DEFAULT_TOOL) url.searchParams.delete("tool");
    else url.searchParams.set("tool", id);
    window.history.replaceState(null, "", url);
  }, []);

  // Jumping between tools from inside a tool should land you at the top of it.
  const openTool = useCallback(
    (id: ToolId) => {
      select(id);
      requestAnimationFrame(() => document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" }));
    },
    [select],
  );

  const modelDilution = useCallback(
    (amountM: number, stage: string) => {
      setSeed((prev) => ({
        roundId: STAGE_TO_ROUND[stage] ?? "seed",
        investM: amountM,
        token: (prev?.token ?? 0) + 1,
      }));
      openTool("planner");
    },
    [openTool],
  );

  /* Infos is a view of its own, not an appendix under the tools: a glossary
     you have to scroll past five planners to reach is a glossary nobody
     reads. It shares the switcher so `?view=infos` links directly to it. */
  const openView = useCallback((v: Exclude<View, "tools">) => {
    setView(v);
    const url = new URL(window.location.href);
    url.searchParams.set("view", v);
    url.searchParams.delete("tool");
    window.history.replaceState(null, "", url);
    requestAnimationFrame(() => document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" }));
  }, []);

  return (
    <>
      {/* The wordmark has to sit above the hero, so the shell owns the whole
          page composition rather than only the tab strip — otherwise a header
          rendered after the hero is invisible until you scroll past it. */}
      <SiteHeader active={active} onOpenTool={openTool} onOpenView={openView} view={view} />
      <ScrollHero ctaHref="#tools" />
      <PillNav active={active} onChange={select} view={view} onOpenView={openView} />

      <div id="panel-bootstrap" role="tabpanel" aria-labelledby="tab-bootstrap" hidden={view !== "tools" || active !== "bootstrap"}>
        <BootstrapPlanner onOpenTool={openTool} />
      </div>

      <div id="panel-recurring" role="tabpanel" aria-labelledby="tab-recurring" hidden={view !== "tools" || active !== "recurring"}>
        <RecurringCalc />
      </div>

      <div id="panel-ready" role="tabpanel" aria-labelledby="tab-ready" hidden={view !== "tools" || active !== "ready"}>
        <ReadyToRaise onOpenTool={openTool} isActive={active === "ready"} />
      </div>

      <div id="panel-round" role="tabpanel" aria-labelledby="tab-round" hidden={view !== "tools" || active !== "round"}>
        <RoundPlanner onModelDilution={modelDilution} />
      </div>

      <div id="panel-planner" role="tabpanel" aria-labelledby="tab-planner" hidden={view !== "tools" || active !== "planner"}>
        <Planner seed={seed} />
      </div>

      <div id="panel-split" role="tabpanel" aria-labelledby="tab-split" hidden={view !== "tools" || active !== "split"}>
        <EquitySplit />
      </div>

      <div id="panel-network" role="tabpanel" aria-labelledby="tab-network" hidden={view !== "tools" || active !== "network"}>
        <NetworkStrategy />
      </div>

      <div id="panel-infos" role="tabpanel" aria-labelledby="tab-infos" hidden={view !== "infos"}>
        <InfoCards onOpenTool={openTool} />
      </div>

      <div id="panel-stats" role="tabpanel" aria-labelledby="tab-stats" hidden={view !== "stats"}>
        <StatsBoard />
      </div>
    </>
  );
}
