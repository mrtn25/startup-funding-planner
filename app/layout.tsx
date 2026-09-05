import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "backable — seven free tools for founders",
  description:
    "backable — seven free tools for founders: a bootstrap check on whether you need outside money at all, an ARR and MRR calculator, an investor-readiness assessment, a round planner that sizes the raise, a dilution and cap-table planner, a research-backed co-founder equity split with vesting, and a network strategy model. Plus a plain-language term sheet glossary and the startup numbers that are actually traceable to a source.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
