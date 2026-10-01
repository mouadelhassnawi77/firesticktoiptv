import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { dbConfigured, query } from "./db";
import { verifyTotp } from "./totp";

/**
 * Admin security, in layers:
 *  1. Username + password, both only in Vercel environment variables (ADMIN_USERNAME, ADMIN_PASSWORD).
 *     Nothing about them is in the code, the repo or the database.
 *  2. Optional 2FA code from an authenticator app (turned on in Admin, Security). The key is stored
 *     encrypted with a key derived from the credentials, so changing ADMIN_PASSWORD in Vercel also resets 2FA.
 *     That is the recovery path if the phone is lost: only someone with access to Vercel can do it.
 *  3. Brute-force lock: 5 failed sign-ins from one IP lock that IP for 15 minutes.
 *  4. Server-side sessions: random token in an httpOnly, Secure, SameSite=Strict cookie; only its hash is stored.
 *     Sessions end after 12 hours without activity or 7 days at most, can be ended from the Security page,
 *     and all end automatically when the username or password changes.
 *  5. Audit log of every sign-in, failed attempt, lock and sign-out, with IP and device.
 */

const USERNAME = process.env.ADMIN_USERNAME?.trim() ?? "";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const DB_URL = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";

export const adminConfigured = Boolean(USERNAME && PASSWORD);
/** Password is set but the username is still missing (older setup) */
export const usernameMissing = Boolean(PASSWORD && !USERNAME);
export const adminUsername = USERNAME;

const PROD = process.env.NODE_ENV === "production";
export const SESSION_COOKIE = PROD ? "__Host-admin_session" : "admin_session";
const IDLE_HOURS = 12;
const MAX_DAYS = 7;
export const LOCK_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;
export const SESSION_POLICY = { idleHours: IDLE_HOURS, maxDays: MAX_DAYS };

const enc = new TextEncoder();
const toHex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
const sha256 = async (v: string) => toHex(await crypto.subtle.digest("SHA-256", enc.encode(v)));

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ---------- HMAC (also signs customer order tokens; key unchanged so existing tokens stay valid) ---------- */

async function hmacKey() {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(`${PASSWORD}|${DB_URL}`));
  return crypto.subtle.importKey("raw", digest, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

export async function sign(value: string) {
  return toHex(await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(value)));
}

/** Changes whenever the username or password changes: every session bound to the old one stops working */
const credFingerprint = () => sign(`cred:${USERNAME}`).then((s) => s.slice(0, 32));

/* ---------- Request info ---------- */

export async function clientInfo() {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ua = (h.get("user-agent") ?? "").slice(0, 300);
  const country = h.get("x-vercel-ip-country") ?? "";
  let city = "";
  try {
    city = decodeURIComponent(h.get("x-vercel-ip-city") ?? "");
  } catch {
    city = "";
  }
  return { ip, ua, place: [city, country].filter(Boolean).join(", ") };
}

/* ---------- Audit log ---------- */

export type AdminEvent = {
  id: string;
  at: Date;
  event: string;
  ip: string | null;
  user_agent: string | null;
  detail: string | null;
};

export async function logEvent(event: string, detail?: string) {
  if (!dbConfigured) return;
  const c = await clientInfo();
  await query(`INSERT INTO admin_events (event, ip, user_agent, detail) VALUES ($1, $2, $3, $4)`, [
    event,
    c.ip,
    c.ua,
    [detail, c.place].filter(Boolean).join("; ") || null,
  ]);
}

export async function listEvents(limit = 50) {
  return query<AdminEvent>(`SELECT * FROM admin_events ORDER BY at DESC LIMIT $1`, [limit]);
}

/* ---------- Brute-force lock ---------- */

/** Minutes left on this IP's lock, 0 = not locked */
export async function lockMinutesLeft(ip: string) {
  const [row] = await query<{ n: string; last: Date | null }>(
    `SELECT COUNT(*) AS n, MAX(at) AS last FROM admin_events
     WHERE event = 'login_fail' AND ip = $1 AND at > now() - make_interval(mins => $2::int)
       AND at > COALESCE((SELECT MAX(at) FROM admin_events WHERE event = 'login_ok' AND ip = $1), 'epoch')`,
    [ip, LOCK_MINUTES]
  );
  if (Number(row.n) < LOCK_ATTEMPTS || !row.last) return 0;
  const left = new Date(row.last).getTime() + LOCK_MINUTES * 60_000 - Date.now();
  return left > 0 ? Math.ceil(left / 60_000) : 0;
}

/** Failed attempts across all IPs in the last 15 minutes (distributed guessing gets slowed down) */
export async function recentFailures() {
  const [row] = await query<{ n: string }>(
    `SELECT COUNT(*) AS n FROM admin_events WHERE event = 'login_fail' AND at > now() - interval '15 minutes'`
  );
  return Number(row.n);
}

/* ---------- Credentials ---------- */

/** Always compares both values (no early exit), through HMAC so length and timing reveal nothing */
export async function checkCredentials(username: string, password: string) {
  if (!adminConfigured) return false;
  const [u1, u2, p1, p2] = await Promise.all([
    sign(`u:${username.trim()}`),
    sign(`u:${USERNAME}`),
    sign(`pw:${password}`),
    sign(`pw:${PASSWORD}`),
  ]);
  const userOk = safeEqual(u1, u2);
  const passOk = safeEqual(p1, p2);
  return userOk && passOk;
}

/* ---------- 2FA key, stored encrypted (AES-256-GCM) ---------- */

async function totpKey() {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(`totp|${USERNAME}|${PASSWORD}|${DB_URL}`));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");
const unb64 = (s: string) => new Uint8Array(Buffer.from(s, "base64"));

async function setSetting(key: string, value: string) {
  await query(
    `INSERT INTO admin_settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, value]
  );
}

export async function saveTotpSecret(secret: string | null) {
  await query(`DELETE FROM admin_settings WHERE key IN ('totp', 'totp_last_step')`);
  if (secret === null) return;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await totpKey(), enc.encode(secret)));
  await setSetting("totp", `${b64(iv)}.${b64(ct)}`);
}

/** The active 2FA key, or null when 2FA is off (or was reset by changing the credentials in Vercel) */
export const getTotpSecret = cache(async (): Promise<string | null> => {
  if (!dbConfigured || !adminConfigured) return null;
  const [row] = await query<{ value: string }>(`SELECT value FROM admin_settings WHERE key = 'totp'`);
  if (!row) return null;
  try {
    const [iv, ct] = row.value.split(".");
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, await totpKey(), unb64(ct));
    return new TextDecoder().decode(plain);
  } catch {
    return null; // credentials changed in Vercel: the old 2FA key can no longer be read, so 2FA counts as off
  }
});

/** Marks a code step as used, so the same code can never be accepted twice */
export async function rememberTotpStep(step: number) {
  await setSetting("totp_last_step", String(step));
}

/** Verifies a code and refuses to accept the same code twice */
export async function checkTotp(secret: string, code: string) {
  const step = await verifyTotp(secret, code);
  if (step === null) return false;
  const [row] = await query<{ value: string }>(`SELECT value FROM admin_settings WHERE key = 'totp_last_step'`);
  if (row && Number(row.value) >= step) return false;
  await rememberTotpStep(step);
  return true;
}

/* ---------- Sessions ---------- */

export type AdminSession = {
  token_hash: string;
  created_at: Date;
  last_seen: Date;
  expires_at: Date;
  ip: string | null;
  user_agent: string | null;
};

const cookieOptions = {
  httpOnly: true,
  secure: PROD,
  sameSite: "strict" as const,
  path: "/",
};

export async function createSession() {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const token = Buffer.from(raw).toString("base64url");
  const c = await clientInfo();
  // Housekeeping first: drop expired sessions and log entries older than 180 days
  await query(
    `DELETE FROM admin_sessions WHERE expires_at < now() OR last_seen < now() - make_interval(hours => $1::int)`,
    [IDLE_HOURS]
  );
  await query(`DELETE FROM admin_events WHERE at < now() - interval '180 days'`);
  await query(
    `INSERT INTO admin_sessions (token_hash, expires_at, cred, ip, user_agent)
     VALUES ($1, now() + make_interval(days => $2::int), $3, $4, $5)`,
    [await sha256(token), MAX_DAYS, await credFingerprint(), c.ip, c.ua]
  );
  (await cookies()).set(SESSION_COOKIE, token, { ...cookieOptions, maxAge: MAX_DAYS * 86_400 });
}

/** The signed-in session for this request, or null. Cached per request. */
export const getSession = cache(async (): Promise<AdminSession | null> => {
  if (!adminConfigured || !dbConfigured) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const hash = await sha256(token);
  const [row] = await query<AdminSession & { cred: string }>(
    `SELECT * FROM admin_sessions
     WHERE token_hash = $1 AND expires_at > now() AND last_seen > now() - make_interval(hours => $2::int)`,
    [hash, IDLE_HOURS]
  );
  if (!row || !safeEqual(row.cred, await credFingerprint())) return null;
  if (Date.now() - new Date(row.last_seen).getTime() > 60_000) {
    await query(`UPDATE admin_sessions SET last_seen = now() WHERE token_hash = $1`, [hash]);
  }
  return row;
});

export async function isAdmin() {
  return (await getSession()) !== null;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token && dbConfigured) await query(`DELETE FROM admin_sessions WHERE token_hash = $1`, [await sha256(token)]);
  store.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
}

export async function listSessions() {
  return query<AdminSession>(
    `SELECT token_hash, created_at, last_seen, expires_at, ip, user_agent FROM admin_sessions
     WHERE expires_at > now() AND last_seen > now() - make_interval(hours => $1::int) AND cred = $2
     ORDER BY last_seen DESC`,
    [IDLE_HOURS, await credFingerprint()]
  );
}

export async function revokeSession(hash: string) {
  await query(`DELETE FROM admin_sessions WHERE token_hash = $1`, [hash]);
}

export async function revokeOtherSessions(currentHash: string) {
  await query(`DELETE FROM admin_sessions WHERE token_hash <> $1`, [currentHash]);
}

/* ---------- Customer order tokens (crypto checkout) ---------- */

/** Token that lets a customer add the TXID to their own crypto order */
export async function orderToken(id: string) {
  return (await sign(`order:${id}`)).slice(0, 32);
}
export async function checkOrderToken(id: string, token: string) {
  return safeEqual(await orderToken(id), token);
}
