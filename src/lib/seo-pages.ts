/**
 * SEO registry: the default title, description and focus keywords of every public page.
 * Pages read their metadata from here (through seoMetadata), the admin SEO section shows these
 * defaults and lets you override any field without touching code. Overrides live in the database.
 *
 * New page: add it to `routes` in lib/site.ts, add an entry here, and in the page file write
 *   export const generateMetadata = seoMetadata("yourKey");
 */
import { site, formatPrice, routes, type RouteKey } from "./site";
import { plans, trial, lowestMonthly } from "./shop";

export type SeoDefaults = {
  title: string;
  description: string;
  /** Focus keyword from the silo plan (empty = not set yet) */
  keyword: string;
  /** Extra keywords the page should also cover */
  secondary: string[];
  noindex?: boolean;
  /** Title without the " | Brand" suffix (homepage) */
  absoluteTitle?: boolean;
};

const first = plans[0];
const last = plans[plans.length - 1];

const defaults = {
  home: {
    title: `IPTV Service USA | ${site.channelCount} Channels & Free Trial`,
    description: `IPTV service for the USA: ${site.channelCount} live channels, sports & movies in HD/4K on Firestick & Smart TV. From ${formatPrice(lowestMonthly)}/mo. Free ${trial.hours}h trial.`,
    keyword: "iptv service",
    secondary: ["iptv services", "iptv providers", "iptv usa", "iptv service provider", "iptv streaming services"],
    absoluteTitle: true,
  },
  pricing: {
    title: `IPTV Subscription Plans: ${formatPrice(first.price)}/Month or ${formatPrice(last.price)}/Year`,
    description: `Subscribe to IPTV every month for ${formatPrice(first.price)} or save with 3, 6 or 12 months (${formatPrice(lowestMonthly)}/mo). ${site.channelCount} channels, 4K, no auto-renewal, ${site.refundDays}-day refund.`,
    keyword: "iptv every month subscribe",
    secondary: ["subscribe iptv", "iptv smarters pro subscription", "iptv premium"],
  },
  freeTrial: {
    title: `IPTV Free Trial (${trial.hours} Hours, No Card)`,
    description: `Get a free ${trial.hours}-hour IPTV trial with ${site.channelCount} channels incl. live sports. Works on Firestick & Smart TV. Login on WhatsApp in minutes.`,
    keyword: "iptv free trial",
    secondary: ["free iptv for firestick", "free iptv on firestick", "iptv firestick free", "iptv free for firestick"],
  },
  firestick: {
    title: "IPTV for Firestick: Best IPTV Service for Fire TV",
    description: `IPTV for Firestick with ${site.channelCount} US channels, live sports & movies in HD/4K. Works on every Fire TV Stick. Setup in 10 minutes, free ${trial.hours}h trial.`,
    keyword: "iptv for firestick",
    secondary: ["best iptv service for firestick", "best iptv on firestick", "iptv providers for firestick"],
  },
  channels: {
    title: "IPTV Channels List USA: Sports, News & Movies",
    description: `Browse our IPTV channels: ${site.channelCount} live channels: sports, local networks, news, movies, kids, Latino and international.`,
    keyword: "iptv channels",
    secondary: ["iptv channels list"],
  },
  fourK: {
    title: "4K IPTV: Live Sports & Movies in Ultra HD",
    description: `4K IPTV for the USA: live sports and movies in Ultra HD on Firestick 4K, Smart TV and Apple TV. What you need, which devices work, free ${trial.hours}h trial.`,
    keyword: "4k iptv",
    secondary: ["4k live iptv"],
  },
  faq: {
    title: "IPTV FAQ: Plans, Devices, Setup & Refunds",
    description: `Answers about ${site.name}: how IPTV works, the free trial, prices, Firestick setup, internet speed, devices and refunds.`,
    keyword: "iptv faq",
    secondary: [],
  },
  contact: {
    title: "Contact Us",
    description: `Contact ${site.name} on WhatsApp or by email for orders, free trials, setup help and support.`,
    keyword: "",
    secondary: [],
  },
  about: {
    title: "About Us",
    description: `Who we are and how ${site.name} works: a US-focused IPTV service with a free trial, WhatsApp support and a ${site.refundDays}-day refund.`,
    keyword: "",
    secondary: [],
  },
  terms: {
    title: "Terms of Service",
    description: `Terms of Service for ${site.name}: plans, payments, device use, internet requirements and support.`,
    keyword: "",
    secondary: [],
    noindex: true,
  },
  privacy: {
    title: "Privacy Policy",
    description: `How ${site.name} collects, uses and protects your personal information.`,
    keyword: "",
    secondary: [],
    noindex: true,
  },
  refund: {
    title: "Refund Policy",
    description: `${site.refundDays}-day refund on every ${site.name} subscription: how it works and how to ask.`,
    keyword: "",
    secondary: [],
    noindex: true,
  },
  dmca: {
    title: "DMCA Copyright Policy",
    description: `How to report copyright infringement to ${site.name}: DMCA notice requirements, review process and counter-notification.`,
    keyword: "",
    secondary: [],
    noindex: true,
  },
} satisfies Partial<Record<RouteKey, SeoDefaults>>;

export type SeoKey = keyof typeof defaults;

export type SeoPage = SeoDefaults & { key: SeoKey; path: string; label: string };

export const seoPages: Record<SeoKey, SeoPage> = Object.fromEntries(
  (Object.keys(defaults) as SeoKey[]).map((key) => [
    key,
    { ...(defaults[key] as SeoDefaults), key, path: routes[key].href, label: routes[key].label },
  ]),
) as Record<SeoKey, SeoPage>;

/** Pages in menu order; only pages that are live on the site */
export const seoPageList: SeoPage[] = (Object.keys(defaults) as SeoKey[])
  .filter((k) => routes[k].live)
  .map((k) => seoPages[k]);

export const isSeoKey = (v: string): v is SeoKey => Object.hasOwn(defaults, v);

export const seoPageByPath = (path: string) => seoPageList.find((p) => p.path === path);

/** One row of the seo_pages table. null = use the default from the registry */
export type SeoOverride = {
  path: string;
  title: string | null;
  description: string | null;
  keyword: string | null;
  secondary: string | null;
  canonical: string | null;
  robots_index: boolean | null;
  robots_follow: boolean | null;
  absolute_title: boolean | null;
  og_title: string | null;
  og_description: string | null;
  score: number | null;
  analyzed_at: Date | null;
  updated_at: Date | null;
};

export type EffectiveSeo = {
  title: string;
  /** What Google shows: title plus the brand suffix unless absoluteTitle */
  fullTitle: string;
  description: string;
  keyword: string;
  secondary: string[];
  canonical: string;
  index: boolean;
  follow: boolean;
  absoluteTitle: boolean;
  ogTitle: string;
  ogDescription: string;
  /** true when at least one field differs from the code default */
  customized: boolean;
};

export const SEO_FIELDS = [
  "title",
  "description",
  "keyword",
  "secondary",
  "canonical",
  "robots_index",
  "robots_follow",
  "absolute_title",
  "og_title",
  "og_description",
] as const;

export const brandSuffix = ` | ${site.name}`;
export const fullTitleOf = (title: string, absolute: boolean) => (absolute ? title : `${title}${brandSuffix}`);

export const splitKeywords = (v: string | null | undefined) =>
  (v ?? "")
    .split(/[,\n]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 10);

/** Code default + database override = what the page actually uses */
export function effectiveSeo(page: SeoPage, o?: Partial<SeoOverride> | null): EffectiveSeo {
  const title = o?.title ?? page.title;
  const absoluteTitle = o?.absolute_title ?? Boolean(page.absoluteTitle);
  const description = o?.description ?? page.description;
  return {
    title,
    fullTitle: fullTitleOf(title, absoluteTitle),
    description,
    keyword: (o?.keyword ?? page.keyword).toLowerCase(),
    secondary: o?.secondary != null ? splitKeywords(o.secondary) : page.secondary,
    canonical: o?.canonical ?? page.path,
    index: o?.robots_index ?? !page.noindex,
    follow: o?.robots_follow ?? true,
    absoluteTitle,
    ogTitle: o?.og_title ?? title,
    ogDescription: o?.og_description ?? description,
    customized: Boolean(o && SEO_FIELDS.some((f) => o[f] !== null && o[f] !== undefined)),
  };
}

/** Focus keywords of every other live page, for the "keyword used twice" check */
export function otherKeywords(path: string, overrides: Map<string, Partial<SeoOverride>>) {
  return seoPageList
    .filter((p) => p.path !== path)
    .map((p) => ({ keyword: effectiveSeo(p, overrides.get(p.path)).keyword, label: p.label }))
    .filter((o) => o.keyword);
}
