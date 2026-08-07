"use client";

import { useCallback, useEffect, useState } from "react";
import NetworkStrategy from "./network/NetworkStrategy";
import PillNav, { TOOLS, type ToolId } from "./PillNav";
import Planner from "./planner/Planner";
import ReadyToRaise from "./ready/ReadyToRaise";

const DEFAULT_TOOL: ToolId = "ready";

/**
 * All three tools stay mounted and the inactive ones are `hidden`, so
 * switching tabs never discards what you entered. The choice is mirrored
 * into `?tool=` so a tab can be linked to directly.
 */
export default function ToolSwitcher() {
  const [active, setActive] = useState<ToolId>(DEFAULT_TOOL);

  // Read the deep link after mount — keeps the server render deterministic.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("tool");
    if (TOOLS.some((t) => t.id === param)) setActive(param as ToolId);
  }, []);

  const select = useCallback((id: ToolId) => {
    setActive(id);
    const url = new URL(window.location.href);
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

  return (
    <>
      <PillNav active={active} onChange={select} />

      <div id="panel-ready" role="tabpanel" aria-labelledby="tab-ready" hidden={active !== "ready"}>
        <ReadyToRaise onOpenTool={openTool} isActive={active === "ready"} />
      </div>

      <div id="panel-planner" role="tabpanel" aria-labelledby="tab-planner" hidden={active !== "planner"}>
        <Planner />
      </div>

      <div id="panel-network" role="tabpanel" aria-labelledby="tab-network" hidden={active !== "network"}>
        <NetworkStrategy />
      </div>
    </>
  );
}
