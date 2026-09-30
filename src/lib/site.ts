/**
 * Central config – everything you change per project lives here:
 * brand, domain, market (currency, language, time zone), contact and the page registry.
 * Plans, prices, devices and crypto wallets live in src/lib/shop.ts.
 */
import { lowestMonthly, trial } from "./shop";

/**
 * Domain order: 1) NEXT_PUBLIC_SITE_URL (set it in Vercel)
 * 2) production domain Vercel provides automatically  3) fallback.
 */
function resolveSiteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const url = fromEnv || (vercelProd ? `https://${vercelProd}` : "https://www.firesticktoiptv.com");
  return url.replace(/\/$/, "");
}

/**
 * Market settings. Every price, date and phone number on the site and in the admin reads from here,
 * so switching markets is a one-place change.
 */
export const market = {
  currency: "USD",
  numberLocale: "en-US",
  timeZone: "America/New_York",
  phoneCountryCode: "1", // used when a customer types a national number without +
  phoneExample: "+1 555 123 4567",
  areaServed: "US",
} as const;

const money = new Intl.NumberFormat(market.numberLocale, { style: "currency", currency: market.currency });
const moneyWhole = new Intl.NumberFormat(market.numberLocale, {
  style: "currency",
  currency: market.currency,
  maximumFractionDigits: 0,
});
/** $15 for whole amounts, $4.08 otherwise */
export const formatPrice = (value: number) => (Number.isInteger(value) ? moneyWhole : money).format(value);

/**
 * Only the production deployment may be indexed. Preview deployments get noindex + robots Disallow.
 * Locally (no VERCEL_ENV) the site counts as indexable.
 */
export const isIndexable = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === "production" : true;

export const site = {
  name: "Firestick to IPTV",
  supportName: "Firestick to IPTV Support", // how you appear to customers in every WhatsApp message
  legalName: "Firestick to IPTV",
  url: resolveSiteUrl(),
  locale: "en_US",
  language: "en-US",
  description: `IPTV service for the USA: 40,000+ live channels including sports and news, plus movies and series in HD and 4K on Firestick, Smart TV and phone. From ${formatPrice(lowestMonthly)}/month, free ${trial.hours}-hour trial.`,
  // Offer data – keep it true to what you actually sell
  channelCount: "40,000+",
  vodCount: "", // leave empty until you have a real number; pages hide the claim when empty
  connections: 1,
  minSpeedMbps: 20,
  refundDays: 7,
  // Contact
  whatsapp: "212760605268", // orders and support: international format, no + and no spaces
  email: "support@firesticktoiptv.com",
  dmcaEmail: "dmca@firesticktoiptv.com", // copyright notices; must be a monitored inbox
  dmcaResponse: "2 business days", // how fast you commit to act on a valid notice – only promise what you actually do
  supportHours: "", // e.g. "Every day, 9 AM – 11 PM ET". Empty = not shown anywhere
  social: [] as string[],
  legalUpdated: "September 30, 2026", // shown on Terms, Privacy and Refund Policy
} as const;

export const absoluteUrl = (path = "/") => `${site.url}${path === "/" ? "" : path}`;

export function whatsappLink(message: string) {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`;
}

/**
 * Page registry (matches the keyword silo plan). `live: false` = the page is not built yet:
 * <PageLink> then renders plain text instead of a link, so no visitor or crawler ever hits a 404.
 * Flip to `live: true` the moment a page ships.
 */
export const routes = {
  home: { href: "/", label: "Home", live: true },
  pricing: { href: "/pricing", label: "Pricing", live: true },
  freeTrial: { href: "/iptv-free-trial", label: "Free Trial", live: true },
  firestick: { href: "/iptv-for-firestick", label: "IPTV for Firestick", live: true },
  smarters: { href: "/iptv-for-firestick/iptv-smarters-pro", label: "IPTV Smarters Pro on Firestick", live: false },
  apps: { href: "/iptv-for-firestick/best-iptv-apps", label: "Best IPTV Apps for Firestick", live: false },
  install: { href: "/iptv-for-firestick/install-guide", label: "Install IPTV on Firestick", live: false },
  notWorking: { href: "/iptv-for-firestick/not-working", label: "IPTV Not Working on Firestick", live: false },
  failedAuth: { href: "/guides/iptv-smarters-failed-to-authorize", label: "Fix “Failed to Authorize”", live: false },
  bestIptv: { href: "/best-iptv-service", label: "Best IPTV Service 2026", live: false },
  channels: { href: "/channels", label: "Channel List", live: true },
  fourK: { href: "/4k-iptv", label: "4K IPTV", live: true },
  faq: { href: "/faq", label: "FAQ", live: true },
  contact: { href: "/contact", label: "Contact", live: true },
  about: { href: "/about", label: "About Us", live: true },
  terms: { href: "/terms", label: "Terms of Service", live: true },
  privacy: { href: "/privacy", label: "Privacy Policy", live: true },
  refund: { href: "/refund-policy", label: "Refund Policy", live: true },
  dmca: { href: "/dmca", label: "DMCA Policy", live: true },
} as const;
export type RouteKey = keyof typeof routes;
export const liveRoutes = (keys: RouteKey[]) => keys.map((k) => routes[k]).filter((r) => r.live);

export const mainNav = liveRoutes(["pricing", "firestick", "channels", "faq", "contact"]);
