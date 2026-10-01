import "server-only";
import type { Metadata } from "next";
import { absoluteUrl, isIndexable } from "./site";
import { pageMetadata } from "./seo";
import { effectiveSeo, seoPageList, seoPages, type SeoKey } from "./seo-pages";
import { getOverridesSafe } from "./seo-store";

/**
 * Metadata for a public page: defaults from lib/seo-pages.ts, overridden by whatever you set in Admin → SEO.
 * Pages stay static (fast): they are built once, and saving in the admin rebuilds just that page.
 *
 *   export const generateMetadata = seoMetadata("pricing");
 */
export function seoMetadata(key: SeoKey) {
  return async function generateMetadata(): Promise<Metadata> {
    const page = seoPages[key];
    const seo = effectiveSeo(page, (await getOverridesSafe()).get(page.path));

    const meta = pageMetadata({
      title: seo.title,
      description: seo.description,
      path: page.path,
      absoluteTitle: seo.absoluteTitle,
    });

    const ogImage = { url: "/opengraph-image", width: 1200, height: 630 };
    return {
      ...meta,
      alternates: { canonical: seo.canonical },
      robots: isIndexable ? { index: seo.index, follow: seo.follow } : { index: false, follow: seo.follow },
      openGraph: { ...meta.openGraph, title: seo.ogTitle, description: seo.ogDescription },
      twitter: { card: "summary_large_image", title: seo.ogTitle, description: seo.ogDescription, images: [ogImage.url] },
    };
  };
}

export type SitemapEntry = { path: string; lastModified: Date };

/** "/pricing", "https://www.x.com/pricing/" … → one comparable absolute URL */
function toAbsolute(url: string) {
  const abs = url.startsWith("/") ? absoluteUrl(url) : url;
  return abs.replace(/\/+$/, "");
}

/**
 * Exactly the URLs Google should index, nothing else:
 *  - live pages only (lib/site.ts → live: true)
 *  - not noindex (code default or Admin → SEO)
 *  - canonical points to the page itself (a page canonicalised elsewhere must not be in the sitemap)
 * lastmod = the later of the content date in lib/seo-pages.ts and the last real SEO edit in the admin.
 */
export async function sitemapEntries(): Promise<SitemapEntry[]> {
  const overrides = await getOverridesSafe();
  const entries: SitemapEntry[] = [];
  for (const page of seoPageList) {
    const override = overrides.get(page.path);
    const seo = effectiveSeo(page, override);
    if (!seo.index) continue;
    if (toAbsolute(seo.canonical) !== toAbsolute(page.path)) continue;

    const content = new Date(`${page.updated}T00:00:00Z`);
    const edited = override?.updated_at ? new Date(override.updated_at) : null;
    entries.push({ path: page.path, lastModified: edited && edited > content ? edited : content });
  }
  return entries;
}
