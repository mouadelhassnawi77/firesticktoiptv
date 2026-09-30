import "server-only";
import { createSign } from "node:crypto";
import { market } from "./site";

/**
 * Google Analytics 4 reports for the admin (like MonsterInsights), via the GA4 Data API.
 * Auth: a Google Cloud service account with "Viewer" access on the GA4 property.
 * No SDK needed: we sign the JWT ourselves and call the REST API.
 *
 * Env (Vercel → Settings → Environment Variables):
 *   GA_PROPERTY_ID   numeric property ID (GA Admin → Property details)
 *   GA_CLIENT_EMAIL  service account email (…@….iam.gserviceaccount.com)
 *   GA_PRIVATE_KEY   "private_key" from the JSON key file (\n escapes are fine)
 */
const PROPERTY = process.env.GA_PROPERTY_ID?.trim();
const EMAIL = process.env.GA_CLIENT_EMAIL?.trim();
const KEY = process.env.GA_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
// Overridable only for local testing against a mock server
const API = process.env.GA_API_BASE ?? "https://analyticsdata.googleapis.com/v1beta";
const TOKEN_URL = process.env.GA_TOKEN_URL ?? "https://oauth2.googleapis.com/token";

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

export const GA_PERIODS = [
  { id: "today", label: "Today", cur: ["today", "today"], prev: ["yesterday", "yesterday"], dim: "dateHour", days: 1 },
  { id: "7d", label: "7 days", cur: ["6daysAgo", "today"], prev: ["13daysAgo", "7daysAgo"], dim: "date", days: 7 },
  { id: "30d", label: "30 days", cur: ["29daysAgo", "today"], prev: ["59daysAgo", "30daysAgo"], dim: "date", days: 30 },
  { id: "90d", label: "90 days", cur: ["89daysAgo", "today"], prev: ["179daysAgo", "90daysAgo"], dim: "date", days: 90 },
  { id: "12m", label: "12 months", cur: ["364daysAgo", "today"], prev: ["729daysAgo", "365daysAgo"], dim: "yearMonth", days: 365 },
] as const;
export const getGaPeriod = (id?: string) => GA_PERIODS.find((p) => p.id === id) ?? GA_PERIODS[2];

const TOTAL_METRICS = [
  "sessions",
  "totalUsers",
  "newUsers",
  "screenPageViews",
  "screenPageViewsPerSession",
  "averageSessionDuration",
  "engagementRate",
  "bounceRate",
] as const;

/** Today's date in the market time zone, to build the full list of chart buckets (GA leaves out empty days). */
function berlinToday() {
  const s = new Intl.DateTimeFormat("sv-SE", { timeZone: market.timeZone }).format(new Date());
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
const pad = (n: number) => String(n).padStart(2, "0");

function buckets(dim: string, days: number) {
  const today = berlinToday();
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
  const ttl = p.id === "today" ? 120_000 : 600_000;

  const [a, b] = await Promise.all([
    gaPost<{ reports: Report[] }>(
      "batchRunReports",
      {
        requests: [
          { dateRanges: [cur, prev], metrics: TOTAL_METRICS.map((name) => ({ name })) },
          {
            dateRanges: [cur],
            dimensions: [{ name: p.dim }],
            metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "screenPageViews" }],
            orderBys: [{ dimension: { dimensionName: p.dim } }],
            limit: "500",
          },
          top(["pagePath", "pageTitle"], ["screenPageViews", "totalUsers"], "screenPageViews"),
          top(["sessionDefaultChannelGroup"], ["sessions", "totalUsers"], "sessions"),
          top(["sessionSource", "sessionMedium"], ["sessions"], "sessions"),
        ],
      },
      ttl
    ),
    gaPost<{ reports: Report[] }>(
      "batchRunReports",
      {
        requests: [
          top(["deviceCategory"], ["sessions"], "sessions", 5),
          top(["country"], ["totalUsers"], "totalUsers"),
          top(["newVsReturning"], ["totalUsers"], "totalUsers", 5),
          {
            ...top(["eventName"], ["eventCount", "eventValue"], "eventCount", 5),
            dimensionFilter: {
              filter: { fieldName: "eventName", inListFilter: { values: ["begin_checkout", "generate_lead"] } },
            },
          },
          top(["landingPage"], ["sessions", "engagementRate"], "sessions"),
        ],
      },
      ttl
    ),
  ]);

  const [totals, series, pages, channels, sources] = a.reports;
  const [devices, countries, newReturning, events, landing] = b.reports;

  // Totals: one row per date range ("cur" / "prev")
  const byRange = Object.fromEntries(rows(totals).map((r) => [r.dims[0], r.mets]));
  const pick = (range: string) =>
    Object.fromEntries(TOTAL_METRICS.map((m, i) => [m, byRange[range]?.[i] ?? 0])) as Record<(typeof TOTAL_METRICS)[number], number>;
  const now = pick("cur");
  const before = pick("prev");
  const change = (m: (typeof TOTAL_METRICS)[number]) => (before[m] > 0 ? ((now[m] - before[m]) / before[m]) * 100 : null);

  const seriesMap = new Map(rows(series).map((r) => [r.dims[0], r.mets]));
  const ev = Object.fromEntries(rows(events).map((r) => [r.dims[0], { count: r.mets[0], value: r.mets[1] }]));

  return {
    period: p,
    totals: now,
    previous: before,
    change: Object.fromEntries(TOTAL_METRICS.map((m) => [m, change(m)])) as Record<(typeof TOTAL_METRICS)[number], number | null>,
    series: buckets(p.dim, p.days).map((bucket) => {
      const m = seriesMap.get(bucket) ?? [0, 0, 0];
      return { bucket, sessions: m[0], users: m[1], views: m[2] };
    }),
    pages: rows(pages).map((r) => ({ path: r.dims[0], title: r.dims[1], views: r.mets[0], users: r.mets[1] })),
    channels: rows(channels).map((r) => ({ key: r.dims[0], count: r.mets[0], users: r.mets[1] })),
    sources: rows(sources).map((r) => ({ source: r.dims[0], medium: r.dims[1], sessions: r.mets[0] })),
    devices: rows(devices).map((r) => ({ key: r.dims[0], count: r.mets[0] })),
    countries: rows(countries).map((r) => ({ key: r.dims[0], count: r.mets[0] })),
    newVsReturning: rows(newReturning).map((r) => ({ key: r.dims[0] || "(not set)", count: r.mets[0] })),
    landing: rows(landing).map((r) => ({ path: r.dims[0], sessions: r.mets[0], engagement: r.mets[1] })),
    checkouts: ev.begin_checkout ?? { count: 0, value: 0 },
    leads: ev.generate_lead ?? { count: 0, value: 0 },
  };
}

/** Realtime: active users in the last 30 minutes and what they are looking at. */
export async function getGaRealtime() {
  const r = await gaPost<Report>(
    "runRealtimeReport",
    {
      dimensions: [{ name: "unifiedScreenName" }],
      metrics: [{ name: "activeUsers" }],
      metricAggregations: ["TOTAL"],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: "5",
    },
    30_000
  );
  const total = Number(r.totals?.[0]?.metricValues?.[0]?.value ?? 0) || rows(r).reduce((s, x) => s + x.mets[0], 0);
  return { active: total, pages: rows(r).map((x) => ({ title: x.dims[0], users: x.mets[0] })) };
}
