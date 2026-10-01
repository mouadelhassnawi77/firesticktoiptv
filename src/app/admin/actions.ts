"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  LOCK_ATTEMPTS,
  LOCK_MINUTES,
  adminConfigured,
  checkCredentials,
  checkTotp,
  clientInfo,
  createSession,
  destroySession,
  getSession,
  getTotpSecret,
  lockMinutesLeft,
  logEvent,
  recentFailures,
  rememberTotpStep,
  revokeOtherSessions,
  revokeSession,
  saveTotpSecret,
} from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { verifyTotp } from "@/lib/totp";
import { STATUSES, deleteOrder, isOrderId, setExpiry, setNote, setStatus, type StatusId } from "@/lib/orders";

async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type LoginState = { error?: string; needsCode?: boolean } | undefined;

/**
 * Sign-in. The error never says which part was wrong (username, password or code),
 * every failed attempt is logged and 5 failures lock the IP for 15 minutes.
 */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!adminConfigured || !dbConfigured) return { error: "The admin is not set up yet." };

  const { ip } = await clientInfo();
  const locked = await lockMinutesLeft(ip);
  if (locked) {
    return { error: `Too many failed attempts. Try again in ${locked} minute${locked === 1 ? "" : "s"}.` };
  }

  const username = String(formData.get("username") ?? "").slice(0, 200);
  const password = String(formData.get("password") ?? "").slice(0, 500);
  const code = String(formData.get("code") ?? "");
  const secret = await getTotpSecret();

  const credsOk = await checkCredentials(username, password);
  const codeOk = !secret || (credsOk && (await checkTotp(secret, code)));

  if (!credsOk || !codeOk) {
    await logEvent("login_fail", !credsOk ? "wrong username or password" : "wrong 2FA code");
    // Slow every failure down, and more when many IPs are guessing at once
    await pause((await recentFailures()) > 30 ? 3000 : 900);
    const left = await lockMinutesLeft(ip);
    if (left) {
      await logEvent("locked", `${LOCK_ATTEMPTS} failed attempts, IP locked for ${LOCK_MINUTES} min`);
      return { error: `Too many failed attempts. Try again in ${left} minutes.`, needsCode: Boolean(secret) };
    }
    return {
      error: secret ? "Wrong username, password or code." : "Wrong username or password.",
      needsCode: Boolean(secret),
    };
  }

  await createSession();
  await logEvent("login_ok", secret ? "with 2FA" : undefined);
  redirect("/admin");
}

export async function logout() {
  if (await getSession()) await logEvent("logout");
  await destroySession();
  redirect("/admin/login");
}

/* ---------- Security page ---------- */

export async function revokeSessionAction(formData: FormData) {
  const current = await requireAdmin();
  const hash = String(formData.get("hash") ?? "");
  if (/^[a-f0-9]{64}$/.test(hash) && hash !== current.token_hash) {
    await revokeSession(hash);
    await logEvent("session_revoked");
  }
  revalidatePath("/admin/security");
}

export async function revokeOthersAction() {
  const current = await requireAdmin();
  await revokeOtherSessions(current.token_hash);
  await logEvent("sessions_revoked", "all other devices signed out");
  revalidatePath("/admin/security");
}

export type TwoFaState = { error?: string; ok?: string } | undefined;

/** Turns 2FA on: the key comes from the setup form, the code proves the app is set up correctly */
export async function enableTwoFa(_prev: TwoFaState, formData: FormData): Promise<TwoFaState> {
  await requireAdmin();
  if (await getTotpSecret()) return { error: "2FA is already on." };
  const secret = String(formData.get("secret") ?? "").replace(/[^A-Z2-7]/g, "");
  if (secret.length !== 32) return { error: "Setup expired. Reload the page and scan the new QR code." };
  const step = await verifyTotp(secret, String(formData.get("code") ?? ""));
  if (step === null) {
    return { error: "That code doesn't match. Check the time on your phone and type the newest code." };
  }
  await saveTotpSecret(secret);
  await rememberTotpStep(step); // the code used here cannot be reused to sign in
  await logEvent("2fa_on");
  revalidatePath("/admin", "layout");
  return { ok: "2FA is on. From now on every sign-in asks for a code from your app." };
}

export async function disableTwoFa(_prev: TwoFaState, formData: FormData): Promise<TwoFaState> {
  await requireAdmin();
  const secret = await getTotpSecret();
  if (!secret) return { error: "2FA is already off." };
  if (!(await checkTotp(secret, String(formData.get("code") ?? "")))) {
    await logEvent("2fa_off_fail", "wrong code");
    return { error: "Wrong code. 2FA stays on." };
  }
  await saveTotpSecret(null);
  await logEvent("2fa_off");
  revalidatePath("/admin", "layout");
  return { ok: "2FA is off." };
}

/* ---------- Orders ---------- */

function orderId(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!isOrderId(id)) redirect("/admin/orders");
  return id;
}

export async function updateStatus(formData: FormData) {
  await requireAdmin();
  const id = orderId(formData);
  const status = String(formData.get("status") ?? "") as StatusId;
  if (STATUSES.some((s) => s.id === status)) await setStatus(id, status);
  revalidatePath("/admin", "layout");
}

export async function saveNote(formData: FormData) {
  await requireAdmin();
  const id = orderId(formData);
  await setNote(id, String(formData.get("note") ?? ""));
  revalidatePath(`/admin/orders/${id}`);
}

export async function saveExpiry(formData: FormData) {
  await requireAdmin();
  const id = orderId(formData);
  const date = String(formData.get("expires") ?? "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) await setExpiry(id, date);
  revalidatePath("/admin", "layout");
}

export async function removeOrder(formData: FormData) {
  await requireAdmin();
  const id = orderId(formData);
  if (formData.get("confirm") === "ja") {
    await deleteOrder(id);
    await logEvent("order_deleted", id);
  }
  revalidatePath("/admin", "layout");
  redirect("/admin/orders");
}
