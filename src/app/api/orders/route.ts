import { NextResponse } from "next/server";
import { dbConfigured } from "@/lib/db";
import { orderToken } from "@/lib/auth";
import { insertOrder, parseNewOrder } from "@/lib/orders";

/**
 * Speichert eine Bestellung aus dem Popup. Wird per sendBeacon (Karte/PayPal) oder fetch (Krypto) aufgerufen.
 * Ohne Datenbank antwortet die Route mit 503; das Popup läuft dann trotzdem weiter (WhatsApp bleibt der Kanal).
 */
export async function POST(req: Request) {
  if (!dbConfigured) return NextResponse.json({ error: "Datenbank nicht eingerichtet" }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }
  // Honeypot: Menschen sehen dieses Feld nicht, Bots füllen es aus
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const parsed = parseNewOrder(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 422 });

  try {
    await insertOrder(parsed.order);
  } catch (e) {
    console.error("Bestellung speichern fehlgeschlagen", e);
    return NextResponse.json({ error: "Speichern fehlgeschlagen" }, { status: 500 });
  }
  return NextResponse.json({ id: parsed.order.id, token: await orderToken(parsed.order.id) }, { status: 201 });
}
