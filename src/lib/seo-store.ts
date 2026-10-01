import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { dbConfigured, query } from "./db";
import { site, routes } from "./site";
import { extractContent, type PageContent } from "./seo-analysis";
import type { SeoOverride } from "./seo-pages";

/* ---------- Schema ---------- */

const g = globalThis as unknown as { seoSchema?: Promise<void> };

/** SEO tables, created on first use like the rest of the database */
function ensureSeoSchema() {
  if (!g.seoSchema) {
    g.seoSchema = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS seo_pages (
          path            TEXT PRIMARY KEY,
          title           TEXT,
          description     TEXT,
          keyword         TEXT,
          secondary       TEXT,
          canonical       TEXT,
          robots_index    BOOLEAN,
          robots_follow   BOOLEAN,
          absolute_title  BOOLEAN,
          og_title        TEXT,
          og_description  TEXT,
          score           INT,
          analyzed_at     TIMESTAMPTZ,
          updated_at      TIMESTAMPTZ
        )`);
      await query(`
        CREATE TABLE IF NOT EXISTS seo_redirects (
          id           BIGSERIAL PRIMARY KEY,
          source       TEXT NOT NULL UNIQUE,
          destination  TEXT NOT NULL,
          permanent    BOOLEAN NOT NULL DEFAULT true,
          hits         INT NOT NULL DEFAULT 0,
          last_hit     TIMESTAMPTZ,
          created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
        )`);
      await query(`
        CREATE TABLE IF NOT EXISTS seo_404 (
          path        TEXT PRIMARY KEY,
          hits        INT NOT NULL DEFAULT 1,
          first_seen  TIMESTAMPTZ NOT NULL DEFAULT now(),
          last_seen   TIMESTAMPTZ NOT NULL DEFAULT now(),
          referrer    TEXT,
          user_agent  TEXT
        )`);
      await query(`CREATE INDEX IF NOT EXISTS seo_404_last_idx ON seo_404 (last_seen DESC)`);
    })().catch((e) => {
      g.seoSchema = undefined;
      throw e;
    });
  }
  return g.seoSchema;
}

async function q<T extends Record<string, unknown>>(text: string, params: unknown[] = []) {
  await ensureSeoSchema();
  return query<T>(text, params);
}

/* ---------- Page overrides ---------- */

export async function listOverrides(): Promise<Map<string, SeoOverride>> {
  const rows = await q<SeoOverride>(`SELECT * FROM seo_pages`);
  return new Map(rows.map((r) => [r.path, r]));
}

const timeout = <T>(ms: number, fallback: T) => new Promise<T>((r) => setTimeout(() => r(fallback), ms));

/**
 * For the public site (metadata, sitemap): one query per render, and the site never breaks because of SEO.
 * No database, slow database or any error = the code defaults are used.
 */
export const getOverridesSafe = cache(async (): Promise<Map<string, SeoOverride>> => {
  if (!dbConfigured) return new Map();
  try {
    return await Promise.race([listOverrides(), timeout(4000, new Map<string, SeoOverride>())]);
  } catch (e) {
    console.error("SEO overrides not loaded, using defaults:", e instanceof Error ? e.message : e);
    return new Map();
  }
});

export type OverrideInput = Omit<SeoOverride, "path" | "score" | "analyzed_at" | "updated_at">;

export async function saveOverride(path: string, o: OverrideInput, score: number | null) {
  await q(
    `INSERT INTO seo_pages (path, title, description, keyword, secondary, canonical, robots_index, robots_follow,
                            absolute_title, og_title, og_description, score, analyzed_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now(), now())
     ON CONFLICT (path) DO UPDATE SET
       title=$2, description=$3, keyword=$4, secondary=$5, canonical=$6, robots_index=$7, robots_follow=$8,
       absolute_title=$9, og_title=$10, og_description=$11, score=$12, analyzed_at=now(), updated_at=now()`,
    [
      path,
      o.title,
      o.description,
      o.keyword,
      o.secondary,
      o.canonical,
      o.robots_index,
      o.robots_follow,
      o.absolute_title,
      o.og_title,
      o.og_description,
      score,
    ],
  );
}

export async function saveScore(path: string, score: number | null) {
  await q(
    `INSERT INTO seo_pages (path, score, analyzed_at) VALUES ($1, $2, now())
     ON CONFLICT (path) DO UPDATE SET score=$2, analyzed_at=now()`,
    [path, score],
  );
}

/* ---------- Page content (for the analysis) ---------- */

/** Where to fetch our own pages from: the host the admin is open on, the configured domain as a fallback */
async function origins() {
  const list: string[] = [];
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
      list.push(`${proto}://${host}`);
    }
  } catch {}
  if (!list.includes(site.url)) list.push(site.url);
  return list;
}

export type FetchedPage = { content: PageContent | null; url: string; error?: string };

/** Loads the live page the way Google sees it (server HTML, no JavaScript) */
export async function fetchPageContent(path: string): Promise<FetchedPage> {
  let lastError = "";
  let lastUrl = "";
  for (const origin of await origins()) {
    const url = `${origin}${path}`;
    lastUrl = url;
    try {
      const res = await fetch(url, {
        cache: "no-store",
        redirect: "follow",
        headers: { "user-agent": `${site.name} SEO analyzer`, accept: "text/html" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        lastError = res.status === 401 || res.status === 403
          ? `The page answered ${res.status} (protected deployment). Open the admin on your main domain to analyze content.`
          : `The page answered ${res.status}.`;
        continue;
      }
      const html = await res.text();
      return { content: extractContent(html, origin), url };
    } catch (e) {
      lastError = e instanceof Error && e.name === "TimeoutError" ? "The page took too long to load." : "The page couldn’t be loaded.";
    }
  }
  return { content: null, url: lastUrl, error: lastError };
}

/* ---------- Redirects ---------- */

export type Redirect = {
  id: string;
  source: string;
  destination: string;
  permanent: boolean;
  hits: number;
  last_hit: Date | null;
  created_at: Date;
};

/** "/Old-Page/?x=1" → "/old-page" (how sources are stored and matched) */
export function normalizePath(raw: string) {
  let p = raw.trim();
  try {
    if (/^https?:\/\//i.test(p)) p = new URL(p).pathname;
  } catch {}
  p = p.split(/[?#]/)[0];
  try {
    p = decodeURI(p);
  } catch {}
  if (!p.startsWith("/")) p = `/${p}`;
  p = p.replace(/\/{2,}/g, "/");
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p.toLowerCase().slice(0, 300);
}

export async function listRedirects() {
  return q<Redirect>(`SELECT * FROM seo_redirects ORDER BY created_at DESC LIMIT 1000`);
}

export async function findRedirect(path: string) {
  const rows = await q<Redirect>(`SELECT * FROM seo_redirects WHERE source = $1`, [normalizePath(path)]);
  return rows[0] ?? null;
}

export async function countRedirectHit(id: string) {
  await q(`UPDATE seo_redirects SET hits = hits + 1, last_hit = now() WHERE id = $1`, [id]);
}

export async function addRedirect(source: string, destination: string, permanent: boolean) {
  await q(
    `INSERT INTO seo_redirects (source, destination, permanent) VALUES ($1, $2, $3)
     ON CONFLICT (source) DO UPDATE SET destination = $2, permanent = $3`,
    [source, destination, permanent],
  );
  // The URL works again, so it no longer belongs in the 404 list
  await q(`DELETE FROM seo_404 WHERE path = $1`, [source]);
}

export async function deleteRedirect(id: string) {
  await q(`DELETE FROM seo_redirects WHERE id = $1`, [id]);
}

/* ---------- 404 monitor ---------- */

export type NotFoundRow = {
  path: string;
  hits: number;
  first_seen: Date;
  last_seen: Date;
  referrer: string | null;
  user_agent: string | null;
};

/** Requests that are noise, not broken links: icons browsers ask for on their own */
const IGNORED = /^\/(favicon\.ico|apple-touch-icon[^/]*\.png|\.well-known\/.*)$|\.map$/i;

/** Scanners looking for WordPress, PHP or leaked config files (hidden by default in the list) */
export const PROBE = /(\.php|wp-|wordpress|xmlrpc|\.env|\.git|\.aws|\.asp|cgi-bin|phpmyadmin|\/vendor\/|\.sql|\.bak|\.zip|config\.|admin\.|\/owa\/|\/boaform)/i;

export async function log404(rawPath: string, referrer: string | null, userAgent: string | null) {
  const path = normalizePath(rawPath);
  if (IGNORED.test(path)) return;
  await q(
    `INSERT INTO seo_404 (path, referrer, user_agent) VALUES ($1, $2, $3)
     ON CONFLICT (path) DO UPDATE SET hits = seo_404.hits + 1, last_seen = now(),
       referrer = COALESCE($2, seo_404.referrer), user_agent = $3`,
    [path, referrer?.slice(0, 500) || null, userAgent?.slice(0, 300) || null],
  );
  // Keep the table small: now and then drop everything but the 1,000 most recent URLs
  if (Math.random() < 0.02) {
    await q(`DELETE FROM seo_404 WHERE path NOT IN (SELECT path FROM seo_404 ORDER BY last_seen DESC LIMIT 1000)`);
  }
}

export async function list404(limit = 500) {
  return q<NotFoundRow>(`SELECT * FROM seo_404 ORDER BY last_seen DESC LIMIT $1`, [limit]);
}

export async function delete404(path: string) {
  await q(`DELETE FROM seo_404 WHERE path = $1`, [path]);
}

export async function clear404(probesOnly: boolean) {
  if (!probesOnly) return q(`DELETE FROM seo_404`);
  const rows = await list404(1000);
  const probes = rows.filter((r) => PROBE.test(r.path)).map((r) => r.path);
  if (probes.length) await q(`DELETE FROM seo_404 WHERE path = ANY($1)`, [probes]);
}

/* ---------- Overview numbers ---------- */

export async function getSeoSummary() {
  const [overrides, redirects, nf] = await Promise.all([
    listOverrides(),
    q<{ n: string; hits: string }>(`SELECT count(*) AS n, COALESCE(sum(hits),0) AS hits FROM seo_redirects`),
    q<{ path: string; hits: number; last_seen: Date }>(
      `SELECT path, hits, last_seen FROM seo_404 WHERE last_seen > now() - interval '7 days'`,
    ),
  ]);
  const real404 = nf.filter((r) => !PROBE.test(r.path));
  return {
    overrides,
    redirects: Number(redirects[0]?.n ?? 0),
    redirectHits: Number(redirects[0]?.hits ?? 0),
    notFound7d: real404.length,
    notFoundHits7d: real404.reduce((s, r) => s + r.hits, 0),
  };
}

/** Every URL that is a real page on the site (redirects only apply to URLs that don't exist) */
export const livePaths = () => new Set(Object.values(routes).filter((r) => r.live).map((r) => r.href.toLowerCase()));
