import type { MetadataRoute } from "next";

/** The public site is a single page with four tools behind `?tool=`.
    /inplicit is deliberately absent — it is not public. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://startup-funding-planner.vercel.app/",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
