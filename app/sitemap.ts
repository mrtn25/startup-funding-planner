import type { MetadataRoute } from "next";

/** The public site is one page with the tools behind `?tool=`, plus the
    simulator on its own route. /inplicit is deliberately absent — it is
    not public. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://startup-funding-planner.vercel.app/",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: "https://startup-funding-planner.vercel.app/simulator",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
