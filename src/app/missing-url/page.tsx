import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { dbConfigured } from "@/lib/db";
import { countRedirectHit, findRedirect, log404 } from "@/lib/seo-store";

/**
 * Every URL that matches no page is sent here by the fallback rewrite in next.config.ts
 * (real pages and files always win, so they never reach this code and stay static and fast).
 * 1. A redirect set in Admin → SEO → Redirects? Send the visitor there.
 * 2. Otherwise log it in the 404 monitor and show the normal "page not found" (status 404).
 *
 * Why a rewrite instead of a [...slug] folder: GitHub's web upload can't handle folder names
 * with "...", and the site is deployed by uploading through GitHub.
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function MissingUrl({ searchParams }: { searchParams: Promise<{ __p?: string | string[] }> }) {
  const raw = (await searchParams).__p;
  const path = `/${(Array.isArray(raw) ? raw.join("/") : raw ?? "").replace(/^\/+/, "")}`;

  if (dbConfigured && path !== "/" && !/^\/(admin|api|_next|missing-url)(\/|$)/i.test(path)) {
    let target: { destination: string; permanent: boolean } | null = null;
    try {
      const hit = await findRedirect(path);
      if (hit) {
        target = hit;
        await countRedirectHit(hit.id);
      } else {
        const h = await headers();
        await log404(path, h.get("referer"), h.get("user-agent"));
      }
    } catch (e) {
      console.error("Redirect/404 lookup failed:", e instanceof Error ? e.message : e);
    }
    // Outside the try: redirect() works by throwing, and that must not be caught
    if (target) target.permanent ? permanentRedirect(target.destination) : redirect(target.destination);
  }

  notFound();
}
