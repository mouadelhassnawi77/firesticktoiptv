import "server-only";
import { createSign } from "node:crypto";
import { market } from "./site";

/**
 * Google Analytics 4 reports for the admin, via the GA4 Data API (no SDK: we sign the JWT ourselves).
 * Auth: a Google Cloud service account with "Viewer" access on the GA4 property.
 *
 * Env (Vercel, Settings, Environment Variables, Production):
 *   NEXT_PUBLIC_GA_ID        Measurement ID (G-…), turns on tracking on the site
 *   GA_PROPERTY_ID           numeric property ID (GA Admin, Property details)
 *   GA_SERVICE_ACCOUNT_JSON  the whole JSON key file of the service account (easiest), or instead:
 *   GA_CLIENT_EMAIL + GA_PRIVATE_KEY   the two fields from that file
 */
type ServiceAccount = { client_email?: string; private_key?: string };
function serviceAccount(): ServiceAccount {
  const raw = process.env.GA_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    return {};
  }
}
const SA = serviceAccount();
/** Accepts "123456789" as well as "properties/123456789" */
const PROPERTY = process.env.GA_PROPERTY_ID?.replace(/\D/g, "") || undefined;
const EMAIL = (SA.client_email ?? process.env.GA_CLIENT_EMAIL)?.trim();
/** Works with real line breaks, \n escapes and surrounding quotes, however the key was pasted */
const KEY = (SA.private_key ?? process.env.GA_PRIVATE_KEY)
  ?.trim()
  .replace(/^"|"$/g, "")
  .replace(/\\n/g, "\n")
  .trim();
// Overridable only for local testing against a mock server
const API = process.env.GA_API_BASE ?? "https://analyticsdata.googleapis.com/v1beta";
const TOKEN_URL = process.env.GA_TOKEN_URL ?? "https://oauth2.googleapis.com/token";

/** What is set, for the setup checklist in the admin */
export const gaSetup = {
  tracking: Boolean(process.env.NEXT_PUBLIC_GA_ID),
  property: Boolean(PROPERTY),
  email: EMAIL ?? "",
  key: Boolean(KEY && KEY.includes("PRIVATE KEY")),
  jsonInvalid: Boolean(process.env.GA_SERVICE_ACCOUNT_JSON?.trim() && !SA.client_email),
};

export const gaConfigured = Boolean(PROPERTY && EMAIL && KEY);
export const gaTrackingId = process.env.NEXT_PUBLIC_GA_ID ?? "";

const g = globalThis as unknown as {
  gaToken?: { value: string; exp: number };
  gaCache?: Map<string, { exp: number; data: unknown }>;
};
const cache = (g.gaCache ??= new Map());

async function accessToken() {
  const nowMs = Date.now();
  if (g.gaToken && g.gaToken.exp - 60_000 > nowMs) return g.gaToken.value;
  const now = Math.floor(nowMs / 1000);
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: EMAIL,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(KEY!, "base64url");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
    cache: "no-store",
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string; error?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(`Google sign-in failed: ${json.error_description ?? json.error ?? res.status}`);
  }
  g.gaToken = { value: json.access_token, exp: nowMs + (json.expires_in ?? 3600) * 1000 };
  return json.access_token;
}

/** POST to the Data API, cached per request body (quota friendly). */
async function gaPost<T>(method: string, body: object, ttlMs: number): Promise<T> {
  const key = `${method}:${JSON.stringify(body)}`;
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.data as T;
  const res = await fetch(`${API}/properties/${PROPERTY}:${method}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Google Analytics API error ${res.status}`);
  cache.set(key, { exp: Date.now() + ttlMs, data: json });
  return json;
}

/* ---------- Report shapes ---------- */

type Row = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] };
type Report = { rows?: Row[]; totals?: Row[] };
const rows = (r: Report) =>
  (r.rows ?? []).map((row) => ({
    dims: (row.dimensionValues ?? []).map((d) => d.value),
    mets: (row.metricValues ?? []).map((m) => Number(m.value) || 0),
  }));

/** Plain-language fix for the errors people actually hit while connecting GA */
export function gaErrorHint(message: string) {
  const m = message.toLowerCase();
  if (m.includes("has not been used") || m.includes("is disabled") || m.includes("service_disabled"))
    return "The Google Analytics Data API is not enabled in your Google Cloud project. Enable it, wait 2 minutes, reload.";
  if (m.includes("permission") || m.includes("403"))
    return "The service account has no access to this property. In GA, Admin, Property access management, add the service account email as Viewer.";
  if (m.includes("invalid_grant") || m.includes("jwt") || m.includes("signature") || m.includes("decoder") || m.includes("pem"))
    return "The private key was not accepted. Paste the whole JSON key file into GA_SERVICE_ACCOUNT_JSON in Vercel and redeploy.";
  if (m.includes("not found") || m.includes("404") || m.includes("property"))
    return "GA_PROPERTY_ID looks wrong. Use the numeric Property ID from GA, Admin, Property details (not the G- Measurement ID).";
  return "Check the three Google Analytics values in Vercel, then redeploy.";
}

export const GA_PERIODS = [
  { id: "today", label: "Today", cur: ["today", "today"], prev: ["yesterday", "yesterday"], dim: "dateHour", days: 1 },
  { id: "7d", label: "7 days", cur: ["6daysAgo", "today"], prev: ["13daysAgo", "7daysAgo"], dim: "date", days: 7 },
  { id: "30d", label: "30 days", cur: ["29daysAgo", "today"], prev: ["59daysAgo", "30daysAgo"], dim: "date", days: 30 },
  { id: "90d", label: "90 days", cur: ["89daysAgo", "today"], prev: ["179daysAgo", "90daysAgo"], dim: "date", days: 90 },
  { id: "12m", label: "12 months", cur: ["364daysAgo", "today"], prev: ["729daysAgo", "365daysAgo"], dim: "yearMonth", days: 365 },
] as const;
export type GaPeriod = (typeof GA_PERIODS)[number];
export const getGaPeriod = (id?: string) => GA_PERIODS.find((p) => p.id === id) ?? GA_PERIODS[2];

const TOTAL_METRICS = [
  "activeUsers",
  "newUsers",
  "sessions",
  "screenPageViews",
  "screenPageViewsPerSession",
  "averageSessionDuration",
  "engagementRate",
  "bounceRate",
  "userEngagementDuration",
] as const;
type TotalMetric = (typeof TOTAL_METRICS)[number];

/** Today's date in the market time zone, to build the full list of chart buckets (GA leaves out empty days). */
function marketToday() {
  const s = new Intl.DateTimeFormat("sv-SE", { timeZone: market.timeZone }).format(new Date());
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
const pad = (n: number) => String(n).padStart(2, "0");

function buckets(dim: string, days: number) {
  const today = marketToday();
  const out: string[] = [];
  if (dim === "dateHour") {
    const base = `${today.getUTCFullYear()}${pad(today.getUTCMonth() + 1)}${pad(today.getUTCDate())}`;
    for (let h = 0; h < 24; h++) out.push(`${base}${pad(h)}`);
  } else if (dim === "date") {
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86_400_000);
      out.push(`${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`);
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
      out.push(`${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}`);
    }
  }
  return out;
}

const LEAD = "generate_lead"; // order form sent (fired by the order popup)
const CHECKOUT = "begin_checkout"; // order form opened
const eventIs = (name: string) => ({ filter: { fieldName: "eventName", stringFilter: { value: name } } });
const keyOf = (dims: string[], n: number) => dims.slice(0, n).join("\u0000");

export async function getGaDashboard(periodId?: string) {
  const p = getGaPeriod(periodId);
  const cur = { startDate: p.cur[0], endDate: p.cur[1], name: "cur" };
  const prev = { startDate: p.prev[0], endDate: p.prev[1], name: "prev" };
  const top = (dimension: string[], metric: string[], orderMetric: string, limit = 10) => ({
    dateRanges: [cur],
    dimensions: dimension.map((name) => ({ name })),
    metrics: metric.map((name) => ({ name })),
    orderBys: [{ metric: { metricName: orderMetric }, desc: true }],
    limit: String(limit),
  });
  /** Order forms sent, split by the given dimensions (eventName is requested too, so the filter is always valid) */
  const leadsBy = (dimension: string[]) => ({
    ...top([...dimension, "eventName"], ["eventCount"], "eventCount", 100),
    dimensionFilter: eventIs(LEAD),
  });
  const ttl = p.id === "today" ? 120_000 : 600_000;

  const [a, b, c] = await Promise.all([
    gaPost<{ reports: Report[] }>(
      "batchRunReports",
      {
        requests: [
          { dateRanges: [cur, prev], metrics: TOTAL_METRICS.map((name) => ({ name })) },
          {
            dateRanges: [cur],
            dimensions: [{ name: p.dim }],
            metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "screenPageViews" }],
            orderBys: [{ dimension: { dimensionName: p.dim } }],
            limit: "500",
          },
          top(["pagePath", "pageTitle"], ["screenPageViews", "activeUsers", "userEngagementDuration"], "screenPageViews", 12),
          top(["sessionDefaultChannelGroup"], ["sessions", "activeUsers", "engagementRate"], "sessions"),
          top(["sessionSource", "sessionMedium"], ["sessions", "engagementRate"], "sessions", 12),
        ],
      },
      ttl
    ),
    gaPost<{ reports: Report[] }>(
      "batchRunReports",
      {
        requests: [
          top(["deviceCategory"], ["activeUsers"], "activeUsers", 5),
          top(["country"], ["activeUsers"], "activeUsers", 8),
          top(["newVsReturning"], ["activeUsers"], "activeUsers", 5),
          {
            dateRanges: [cur, prev],
            dimensions: [{ name: "eventName" }],
            metrics: [{ name: "eventCount" }],
            dimensionFilter: { filter: { fieldName: "eventName", inListFilter: { values: [CHECKOUT, LEAD] } } },
          },
          top(["landingPage"], ["sessions", "engagementRate"], "sessions", 12),
        ],
      },
      ttl
    ),
    gaPost<{ reports: Report[] }>(
      "batchRunReports",
      {
        requests: [
          leadsBy(["sessionDefaultChannelGroup"]),
          leadsBy(["sessionSource", "sessionMedium"]),
          leadsBy(["landingPage"]),
          {
            ...top(["region"], ["activeUsers"], "activeUsers", 8),
            dimensionFilter: { filter: { fieldName: "country", stringFilter: { value: "United States" } } },
          },
          top(["operatingSystem"], ["activeUsers"], "activeUsers", 6),
        ],
      },
      ttl
    ),
  ]);

  const [totals, series, pages, channels, sources] = a.reports;
  const [devices, countries, newReturning, events, landing] = b.reports;
  const [chLeads, srcLeads, lpLeads, regions, os] = c.reports;

  // Totals: one row per date range ("cur" / "prev"), the range name is the last dimension
  const byRange = Object.fromEntries(rows(totals).map((r) => [r.dims[r.dims.length - 1], r.mets]));
  const pick = (range: string) =>
    Object.fromEntries(TOTAL_METRICS.map((m, i) => [m, byRange[range]?.[i] ?? 0])) as Record<TotalMetric, number>;
  const now = pick("cur");
  const before = pick("prev");
  const change = (v: number, old: number) => (old > 0 ? ((v - old) / old) * 100 : null);

  const ev: Record<string, Record<string, number>> = { cur: {}, prev: {} };
  for (const r of rows(events)) {
    const range = r.dims[r.dims.length - 1];
    if (ev[range]) ev[range][r.dims[0]] = r.mets[0];
  }

  const leadMap = (rep: Report, n: number) => new Map(rows(rep).map((r) => [keyOf(r.dims, n), r.mets[0]]));
  const chL = leadMap(chLeads, 1);
  const srcL = leadMap(srcLeads, 2);
  const lpL = leadMap(lpLeads, 1);
  const seriesMap = new Map(rows(series).map((r) => [r.dims[0], r.mets]));
  const engagementTime = (sec: number, users: number) => (users ? sec / users : 0);

  return {
    period: p,
    totals: { ...now, engagementTime: engagementTime(now.userEngagementDuration, now.activeUsers) },
    change: {
      ...(Object.fromEntries(TOTAL_METRICS.map((m) => [m, change(now[m], before[m])])) as Record<TotalMetric, number | null>),
      engagementTime: change(
        engagementTime(now.userEngagementDuration, now.activeUsers),
        engagementTime(before.userEngagementDuration, before.activeUsers)
      ),
    },
    series: buckets(p.dim, p.days).map((bucket) => {
      const m = seriesMap.get(bucket) ?? [0, 0, 0];
      return { bucket, sessions: m[0], users: m[1], views: m[2] };
    }),
    pages: rows(pages).map((r) => ({
      path: r.dims[0],
      title: r.dims[1],
      views: r.mets[0],
      users: r.mets[1],
      engagementTime: engagementTime(r.mets[2], r.mets[1]),
    })),
    channels: rows(channels).map((r) => ({
      key: r.dims[0],
      sessions: r.mets[0],
      users: r.mets[1],
      engagement: r.mets[2],
      leads: chL.get(keyOf(r.dims, 1)) ?? 0,
    })),
    sources: rows(sources).map((r) => ({
      source: r.dims[0],
      medium: r.dims[1],
      sessions: r.mets[0],
      engagement: r.mets[1],
      leads: srcL.get(keyOf(r.dims, 2)) ?? 0,
    })),
    landing: rows(landing).map((r) => ({
      path: r.dims[0],
      sessions: r.mets[0],
      engagement: r.mets[1],
      leads: lpL.get(keyOf(r.dims, 1)) ?? 0,
    })),
    devices: rows(devices).map((r) => ({ key: r.dims[0], count: r.mets[0] })),
    countries: rows(countries).map((r) => ({ key: r.dims[0], count: r.mets[0] })),
    regions: rows(regions)
      .filter((r) => r.dims[0] && r.dims[0] !== "(not set)")
      .map((r) => ({ key: r.dims[0], count: r.mets[0] })),
    os: rows(os).map((r) => ({ key: r.dims[0], count: r.mets[0] })),
    newVsReturning: rows(newReturning).map((r) => ({ key: r.dims[0] || "(not set)", count: r.mets[0] })),
    checkouts: ev.cur[CHECKOUT] ?? 0,
    leads: ev.cur[LEAD] ?? 0,
    prevCheckouts: ev.prev[CHECKOUT] ?? 0,
    prevLeads: ev.prev[LEAD] ?? 0,
    fetchedAt: new Date().toISOString(),
  };
}

export type GaDashboard = Awaited<ReturnType<typeof getGaDashboard>>;

/* ---------- Realtime (last 30 minutes) ---------- */

export type GaLive = {
  active: number;
  views: number;
  minutes: number[]; // active users per minute, index 0 = 29 minutes ago, last = this minute
  pages: { title: string; users: number }[];
  countries: { key: string; users: number }[];
  devices: { key: string; users: number }[];
  checkouts: number;
  leads: number;
};

/** Realtime report: what is happening on the site right now. Cached 20 s so open tabs share one call. */
export async function getGaLive(): Promise<GaLive> {
  const rt = (body: object) => gaPost<Report>("runRealtimeReport", body, 20_000);
  const [byDevice, byMinute, byPage, byCountry, byEvent] = await Promise.all([
    rt({
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
      metricAggregations: ["TOTAL"],
    }),
    rt({ dimensions: [{ name: "minutesAgo" }], metrics: [{ name: "activeUsers" }], limit: "30" }),
    rt({
      dimensions: [{ name: "unifiedScreenName" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: "6",
    }),
    rt({
      dimensions: [{ name: "country" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: "6",
    }),
    rt({
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: { filter: { fieldName: "eventName", inListFilter: { values: [CHECKOUT, LEAD] } } },
    }),
  ]);

  const devices = rows(byDevice).map((r) => ({ key: r.dims[0], users: r.mets[0] }));
  const total = byDevice.totals?.[0]?.metricValues ?? [];
  const minutes = Array.from({ length: 30 }, () => 0);
  for (const r of rows(byMinute)) {
    const ago = Number(r.dims[0]);
    if (ago >= 0 && ago < 30) minutes[29 - ago] = r.mets[0];
  }
  const events = Object.fromEntries(rows(byEvent).map((r) => [r.dims[0], r.mets[0]]));

  return {
    active: Number(total[0]?.value ?? 0) || devices.reduce((s, d) => s + d.users, 0),
    views: Number(total[1]?.value ?? 0),
    minutes,
    pages: rows(byPage).map((r) => ({ title: r.dims[0], users: r.mets[0] })),
    countries: rows(byCountry).map((r) => ({ key: r.dims[0], users: r.mets[0] })),
    devices,
    checkouts: events[CHECKOUT] ?? 0,
    leads: events[LEAD] ?? 0,
  };
}
