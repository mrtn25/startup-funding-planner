import type { Metadata } from "next";

/** The route has no password, so noindex is doing real work here rather than
    acting as a second lock: together with robots.txt, the missing sitemap
    entry and the absence from the nav, it keeps the page unlisted. Anyone
    with the URL can still read it. */
export const metadata: Metadata = {
  title: "inplicit Revenue Planner",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function InplicitLayout({ children }: { children: React.ReactNode }) {
  return children;
}
