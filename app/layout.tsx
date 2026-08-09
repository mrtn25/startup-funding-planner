import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Startup Funding & Dilution Planner",
  description:
    "Four free tools for founders: an investor-readiness assessment, a round planner that sizes the raise and its use of funds, a dilution and cap-table planner, and a research-backed network strategy model.",
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
