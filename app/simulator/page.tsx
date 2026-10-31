import type { Metadata } from "next";
import Simulator from "@/components/simulator/Simulator";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Can you get to an exit? — backable",
  description:
    "A decision game for founders: nine choices from the kitchen table to the seed round, each one costing cash, ownership, customers or the patience of investors. Every choice explains what it does in reality and links to the tool that works it out for your own numbers.",
};

export default function SimulatorPage() {
  return (
    <>
      <Simulator />
      <SiteFooter />
    </>
  );
}
