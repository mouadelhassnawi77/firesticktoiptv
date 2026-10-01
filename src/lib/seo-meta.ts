import "server-only";
import type { Metadata } from "next";
import { isIndexable } from "./site";
import { pageMetadata } from "./seo";
import { effectiveSeo, seoPages, type SeoKey } from "./seo-pages";
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

/** For the sitemap: is this path indexable after overrides? */
export async function indexablePaths() {
  const overrides = await getOverridesSafe();
  const out = new Map<string, boolean>();
  for (const page of Object.values(seoPages)) out.set(page.path, effectiveSeo(page, overrides.get(page.path)).index);
  return out;
}
