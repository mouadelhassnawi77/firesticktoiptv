import type { MetadataRoute } from "next";
import { absoluteUrl, routes } from "@/lib/site";
import { indexablePaths } from "@/lib/seo-meta";

/**
 * Only live, indexable pages. A page enters the sitemap the moment it is flipped to live: true
 * (lib/site.ts) and leaves it when it is set to noindex (code default or Admin → SEO).
 * Legal pages are noindex by default, checkout is never listed.
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const indexable = await indexablePaths();
  return (Object.keys(routes) as (keyof typeof routes)[])
    .filter((k) => routes[k].live && indexable.get(routes[k].href) !== false)
    .map((k) => ({
      url: absoluteUrl(routes[k].href),
      changeFrequency: k === "home" ? ("weekly" as const) : ("monthly" as const),
      priority: priority[k] ?? 0.6,
    }));
}
