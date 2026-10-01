import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { sitemapEntries } from "@/lib/seo-meta";

/**
 * /sitemap.xml – generated from the page registry, never edited by hand.
 *  - A page appears the moment it is flipped to live: true (lib/site.ts) and has an SEO entry.
 *  - It disappears when set to noindex or canonicalised to another URL (code default or Admin → SEO).
 *  - Legal pages are noindex by default, checkout/admin/api are never listed.
 *  - Only <loc> + <lastmod>: Google ignores changefreq and priority (same output as Rank Math).
 * Saving a page in Admin → SEO regenerates this file (revalidatePath in app/admin/seo-actions.ts).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await sitemapEntries();
  return entries.map((e) => ({ url: absoluteUrl(e.path), lastModified: e.lastModified }));
}
