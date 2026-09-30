import "server-only";
import { cookies } from "next/headers";

/**
 * Admin-Login ohne Benutzerdatenbank: ein Passwort (ADMIN_PASSWORD in Vercel),
 * Sitzung als signiertes Cookie (HMAC-SHA256). Passwort ändern = alle Sitzungen ungültig.
 */
export const SESSION_COOKIE = "admin_session";
const SESSION_DAYS = 14;
const enc = new TextEncoder();

export const adminConfigured = Boolean(process.env.ADMIN_PASSWORD);

async function hmacKey() {
  const material = `${process.env.ADMIN_PASSWORD ?? ""}|${process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? ""}`;
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(material));
  return crypto.subtle.importKey("raw", digest, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

const toHex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");

export async function sign(value: string) {
  return toHex(await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(value)));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function checkPassword(input: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const [a, b] = await Promise.all([sign(`pw:${input}`), sign(`pw:${expected}`)]);
  return safeEqual(a, b);
}

export async function createSession() {
  const exp = Date.now() + SESSION_DAYS * 86_400_000;
  const value = `${exp}.${await sign(`session:${exp}`)}`;
  (await cookies()).set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function isAdmin() {
  if (!adminConfigured) return false;
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return false;
  const [exp, sig] = raw.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await sign(`session:${exp}`));
}

/** Token, mit dem der Kunde seine eigene Krypto-Bestellung ergänzen darf (TXID). */
export async function orderToken(id: string) {
  return (await sign(`order:${id}`)).slice(0, 32);
}
export async function checkOrderToken(id: string, token: string) {
  return safeEqual(await orderToken(id), token);
}
