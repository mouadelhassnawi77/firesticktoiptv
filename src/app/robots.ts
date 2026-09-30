import type { MetadataRoute } from "next";
import { site, isIndexable } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Preview-Deployments komplett sperren, Production normal freigeben
  if (!isIndexable) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/checkout"] }],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
