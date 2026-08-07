import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Startup Funding & Dilution Planner",
  description:
    "Check whether you're ready to raise, model dilution across FFF, Angels & VCs, build your cap table and simulate exits — and find the network strategy that fits your founder profile.",
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
