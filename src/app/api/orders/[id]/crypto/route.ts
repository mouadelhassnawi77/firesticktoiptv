import { NextResponse } from "next/server";
import { dbConfigured } from "@/lib/db";
import { checkOrderToken } from "@/lib/auth";
import { isOrderId, saveCryptoPayment } from "@/lib/orders";

/** Kunde meldet seine Krypto-Zahlung (Coin, Betrag, TXID). Nur mit dem Token aus der eigenen Bestellung. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!dbConfigured) return NextResponse.json({ error: "Datenbank nicht eingerichtet" }, { status: 503 });
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token : "";
  if (!isOrderId(id) || !(await checkOrderToken(id, token))) {
    return NextResponse.json({ error: "Nicht erlaubt" }, { status: 403 });
  }
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  await saveCryptoPayment(id, str(body.coin), str(body.amount), str(body.txid));
  return NextResponse.json({ ok: true });
}
