import { statusLabel } from "@/lib/orders";
import { market, routes, site } from "@/lib/site";
import { devices, paymentLabel as shopPaymentLabel, products } from "@/lib/shop";

/** Admin UI is English; dates, times and money use the market settings in lib/site.ts. */
const dt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: market.timeZone });
const d = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: market.timeZone });
const money = new Intl.NumberFormat(market.numberLocale, { style: "currency", currency: market.currency });
const moneyShort = new Intl.NumberFormat(market.numberLocale, {
  style: "currency",
  currency: market.currency,
  maximumFractionDigits: 0,
});

export const fmtDateTime = (v: Date | null) => (v ? dt.format(new Date(v)) : "–");
export const fmtDate = (v: Date | null) => (v ? d.format(new Date(v)) : "–");
export const fmtCents = (cents: number) => money.format(cents / 100);
export const fmtMoney = (value: number) => money.format(value);
export const fmtMoneyShort = (value: number) => moneyShort.format(value);
export const fmtNum = (value: number, digits = 0) => value.toLocaleString("en-US", { maximumFractionDigits: digits });

/** Labels come from the shop config; ids from the first version of the shop still resolve. */
const LEGACY_PRODUCTS: Record<string, string> = {
  "test-24h": "24h trial (old)",
  "3-monate": "3 months (old)",
  "6-monate": "6 months (old)",
  "12-monate": "12 months (old)",
};

export const deviceLabel = (id: string) => devices.find((x) => x.id === id)?.label ?? id;
export const paymentLabel = (id: string) => shopPaymentLabel(id);
export const paymentShort = (id: string) =>
  id === "crypto" ? "Crypto" : id === "paypal" ? "PayPal" : id === "none" ? "Free" : "Card";
export const productLabel = (id: string, fallback?: string) =>
  products.find((p) => p.id === id)?.name ?? LEGACY_PRODUCTS[id] ?? fallback ?? id;

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{statusLabel(status)}</span>;
}

/** Phone number for wa.me: digits only. A number without + or 00 is read as national (market.phoneCountryCode). */
export function waNumber(phone: string | null) {
  if (!phone) return null;
  let digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `${market.phoneCountryCode}${digits.slice(1)}`;
  else if (market.phoneCountryCode === "1" && digits.length === 10) digits = `1${digits}`; // US: 10-digit national number
  return digits.length >= 8 ? digits : null;
}

export function waToCustomer(phone: string | null, text: string) {
  const n = waNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}

/*
 * Customer-facing WhatsApp texts in English, always sent as the brand (site.supportName), never a personal name.
 */
const SIGNATURE = `\n\nBest regards,\n${site.supportName}`;

/** Direct WhatsApp chat with the customer, with a short greeting about the order */
export function waChat(o: { phone: string | null; name: string; id: string; product_name: string }) {
  return waToCustomer(
    o.phone,
    `Hi ${o.name},\n\nthis is ${site.supportName} about your order ${o.id} (${o.product_name}).${SIGNATURE}`
  );
}

const renewUrl = routes.pricing.live ? `${site.url}${routes.pricing.href}` : `${site.url}/#pricing`;
const setupUrl = routes.install.live ? `${site.url}${routes.install.href}` : site.url;

export const templates = {
  payment: (name: string, id: string, product: string, price: string) =>
    `Hi ${name},\n\nthis is ${site.supportName}. Thanks for your order ${id} (${product}, ${price}). Here is your payment link:\n\n[insert link]${SIGNATURE}`,
  access: (name: string, id: string) =>
    `Hi ${name},\n\nthis is ${site.supportName}. Your order ${id} is active. Here are your login details:\n\nServer: \nUsername: \nPassword: \n\nSetup guide: ${setupUrl}\nFor smooth streaming use at least ${site.minSpeedMbps} Mbps.${SIGNATURE}`,
  winback: (name: string) =>
    `Hi ${name},\n\nthis is ${site.supportName}. Your IPTV subscription has ended. Want all your channels back? Reply here and we'll reactivate you today, or pick a plan: ${renewUrl}${SIGNATURE}`,
  renewal: (name: string, expires: string) =>
    `Hi ${name},\n\nthis is ${site.supportName}. Your IPTV subscription ends on ${expires}. Want to renew? The 12-month plan is the best value: ${renewUrl}${SIGNATURE}`,
};

/** Date for customer messages, in the market time zone */
export const fmtDateCustomer = (v: Date | null) =>
  v ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: market.timeZone }).format(new Date(v)) : "";
