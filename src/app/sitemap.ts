import type { MetadataRoute } from "next";
import { absoluteUrl, routes } from "@/lib/site";

/**
 * Only live, indexable pages (see routes in lib/site.ts). A page enters the sitemap
 * the moment it is flipped to live: true. Legal pages and checkout stay out on purpose.
 */
const priority: Partial<Record<keyof typeof routes, number>> = {
  home: 1,
  pricing: 0.9,
  freeTrial: 0.9,
  firestick: 0.9,
  bestIptv: 0.8,
  channels: 0.7,
  fourK: 0.7,
  faq: 0.6,
  about: 0.4,
  contact: 0.4,
};
const excluded = new Set(["terms", "privacy", "refund", "dmca"]);

export default function sitemap(): MetadataRoute.Sitemap {
  return (Object.keys(routes) as (keyof typeof routes)[])
    .filter((k) => routes[k].live && !excluded.has(k))
    .map((k) => ({
      url: absoluteUrl(routes[k].href),
      changeFrequency: k === "home" ? ("weekly" as const) : ("monthly" as const),
      priority: priority[k] ?? 0.6,
    }));
}
