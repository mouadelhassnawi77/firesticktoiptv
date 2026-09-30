import type { Metadata } from "next";
import { site, absoluteUrl, isIndexable, market, routes } from "./site";
import { plans, type Product } from "./shop";

type PageMeta = {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  /** true = title without the brand suffix from the template (e.g. homepage) */
  absoluteTitle?: boolean;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
};

/**
 * Consistent per-page metadata: title, description, canonical, Open Graph, Twitter, robots.
 * The OG image comes from app/opengraph-image.tsx and is set explicitly so it survives overrides.
 */
export function pageMetadata({
  title,
  description,
  path,
  noindex,
  absoluteTitle,
  type = "website",
  publishedTime,
  modifiedTime,
}: PageMeta): Metadata {
  const ogImage = { url: "/opengraph-image", width: 1200, height: 630, alt: site.name };
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: site.name,
      locale: site.locale,
      type,
      images: [ogImage],
      ...(type === "article" ? { publishedTime, modifiedTime } : {}),
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage.url] },
    robots: noindex || !isIndexable ? { index: false, follow: true } : { index: true, follow: true },
  };
}

const orgId = `${site.url}/#organization`;
const websiteId = `${site.url}/#website`;

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": orgId,
    name: site.name,
    legalName: site.legalName,
    url: site.url,
    logo: absoluteUrl("/icon.svg"),
    email: site.email,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: site.email,
      availableLanguage: ["English"],
      areaServed: market.areaServed,
    },
    ...(site.social.length ? { sameAs: site.social } : {}),
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": websiteId,
    url: site.url,
    name: site.name,
    inLanguage: site.language,
    publisher: { "@id": orgId },
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqSchema(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

const offer = (p: Product) => ({
  "@type": "Offer",
  name: p.name,
  price: p.price.toFixed(2),
  priceCurrency: market.currency,
  availability: "https://schema.org/InStock",
  priceValidUntil: `${new Date().getFullYear() + 1}-12-31`,
  url: absoluteUrl(p.page ?? routes.pricing.href),
  seller: { "@id": orgId },
});

/** All plans as one Product with an AggregateOffer (price range in the snippet). No invented ratings. */
export function productSchema() {
  const prices = plans.map((p) => p.price);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${site.url}/#product`,
    name: `${site.name} IPTV Subscription`,
    description: site.description,
    image: absoluteUrl("/opengraph-image"),
    brand: { "@type": "Brand", name: site.name },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: market.currency,
      lowPrice: Math.min(...prices).toFixed(2),
      highPrice: Math.max(...prices).toFixed(2),
      offerCount: plans.length,
      offers: plans.map(offer),
    },
  };
}

/** A single plan (own page per term, trial page) */
export function singleProductSchema(p: Product, name: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    image: absoluteUrl("/opengraph-image"),
    brand: { "@type": "Brand", name: site.name },
    offers: offer(p),
  };
}

export function articleSchema(a: {
  title: string;
  description: string;
  path: string;
  published: string;
  modified: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: a.title,
    description: a.description,
    mainEntityOfPage: absoluteUrl(a.path),
    image: absoluteUrl("/opengraph-image"),
    datePublished: a.published,
    dateModified: a.modified,
    inLanguage: site.language,
    author: { "@id": orgId },
    publisher: { "@id": orgId },
  };
}

export function howToSchema(g: { title: string; description: string; path: string; steps: { title: string; text: string }[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: g.title,
    description: g.description,
    inLanguage: site.language,
    url: absoluteUrl(g.path),
    step: g.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: s.text,
    })),
  };
}
