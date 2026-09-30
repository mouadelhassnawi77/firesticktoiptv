"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkPassword, createSession, destroySession, isAdmin } from "@/lib/auth";
import { STATUSES, deleteOrder, isOrderId, setExpiry, setNote, setStatus, type StatusId } from "@/lib/orders";

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function login(formData: FormData) {
  const ok = await checkPassword(String(formData.get("password") ?? ""));
  if (!ok) {
    await new Promise((r) => setTimeout(r, 800)); // slows down guessing
    redirect("/admin/login?error=1");
  }
  await createSession();
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

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
  if (formData.get("confirm") === "ja") await deleteOrder(id);
  revalidatePath("/admin", "layout");
  redirect("/admin/orders");
}
