"use client";

import { useEffect, useState } from "react";
import NetworkStrategy from "./network/NetworkStrategy";
import PillNav, { type ToolId } from "./PillNav";
import Planner from "./planner/Planner";

/**
 * Both tools stay mounted and the inactive one is `hidden`, so switching
 * tabs never discards the planner's inputs. The choice is mirrored into
 * `?tool=` so a tab can be linked to directly.
 */
export default function ToolSwitcher() {
  const [active, setActive] = useState<ToolId>("planner");

  // Read the deep link after mount — keeps the server render deterministic.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("tool");
    if (param === "network" || param === "planner") setActive(param);
  }, []);

  const select = (id: ToolId) => {
    setActive(id);
    const url = new URL(window.location.href);
    if (id === "planner") url.searchParams.delete("tool");
    else url.searchParams.set("tool", id);
    window.history.replaceState(null, "", url);
  };

  return (
    <>
      <PillNav active={active} onChange={select} />

      <div id="panel-planner" role="tabpanel" aria-labelledby="tab-planner" hidden={active !== "planner"}>
        <Planner />
      </div>

      <div id="panel-network" role="tabpanel" aria-labelledby="tab-network" hidden={active !== "network"}>
        <NetworkStrategy />
      </div>
    </>
  );
}
