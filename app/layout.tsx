import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "backable — five free tools for founders",
  description:
    "backable — five free tools for founders: a bootstrap check on whether you need outside money at all, an investor-readiness assessment, a round planner that sizes the raise, a dilution and cap-table planner, and a research-backed network strategy model. Plus a plain-language term sheet glossary.",
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
