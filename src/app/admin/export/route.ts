import { isAdmin } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { allOrdersForExport, statusLabel } from "@/lib/orders";
import { deviceLabel, paymentLabel, productLabel } from "@/components/admin/ui";
import { market } from "@/lib/site";

export const dynamic = "force-dynamic";

/** CSV for Excel (UTF-8 with BOM, comma separated, prices with a dot). */
export async function GET() {
  if (!(await isAdmin())) return new Response("Not signed in", { status: 401 });
  if (!dbConfigured) return new Response("Database not configured", { status: 503 });

  const rows = await allOrdersForExport();
  const cell = (v: unknown) => {
    const s = v instanceof Date ? v.toISOString() : v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = [
    "Order", "Date", "Status", "Package", `Price (${market.currency})`, "Payment", "Device",
    "Name", "Email", "WhatsApp", "Paid at", "Activated at", "Expires", "Crypto", "TXID", "Note",
  ];
  const lines = rows.map((o) =>
    [
      o.id, o.created_at, statusLabel(o.status), productLabel(o.product_id, o.product_name), (o.price_cents / 100).toFixed(2),
      paymentLabel(o.payment), deviceLabel(o.device), o.name, o.email, o.phone, o.paid_at, o.activated_at, o.expires_at,
      o.crypto_amount, o.txid, o.note,
    ].map(cell).join(",")
  );
  const csv = "\uFEFF" + [header.join(","), ...lines].join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
