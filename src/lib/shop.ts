/**
 * Shop config: plans, devices, payment methods, crypto wallets.
 * This file also runs in the browser (order popup, checkout) – never put secrets here.
 */

export type Product = {
  id: string;
  name: string; // display name
  months: number; // 0 = trial
  hours?: number;
  price: number; // total price in the market currency (see market in site.ts), one-time
  popular?: boolean;
  page?: string; // own SEO page
};

export const plans: Product[] = [
  { id: "1-month", name: "1 Month", months: 1, price: 15 },
  { id: "3-months", name: "3 Months", months: 3, price: 25 },
  { id: "6-months", name: "6 Months", months: 6, price: 35 },
  { id: "12-months", name: "12 Months", months: 12, price: 49, popular: true },
];

/** Free trial: price 0 = no payment step, the request goes straight to WhatsApp. */
export const trial: Product = { id: "free-trial", name: "Free Trial", months: 0, hours: 24, price: 0, page: "/iptv-free-trial" };
export const isFree = (p: Product) => p.price === 0;

export const products: Product[] = [trial, ...plans];
export const getProduct = (id: string) => products.find((p) => p.id === id);
export const popularPlan = plans.find((p) => p.popular) ?? plans[plans.length - 1];

export const planFeatures = [
  "All 40,000+ channels, incl. every major US sport",
  "HD, Full HD and 4K where available",
  "TV guide (EPG) and catch-up on many channels",
  "1 device at a time",
  "Setup help and support on WhatsApp",
];

/** Price per month and saving vs. the shortest plan */
export const monthly = (p: Product) => (p.months ? p.price / p.months : p.price);
export const savingsPercent = (p: Product) => {
  const base = monthly(plans[0]);
  return Math.round((1 - monthly(p) / base) * 100);
};
export const lowestMonthly = Math.min(...plans.map(monthly));

/** Device ids are stored with each order; keep them stable. */
export const devices = [
  { id: "fire-tv-stick", label: "Amazon Firestick / Fire TV" },
  { id: "smart-tv", label: "Smart TV (Samsung, LG)" },
  { id: "android", label: "Android TV / Google TV" },
  { id: "iphone-ipad", label: "iPhone, iPad, Apple TV" },
  { id: "mag-box", label: "MAG box" },
  { id: "windows-mac", label: "PC / Mac" },
  { id: "anderes", label: "Other device" },
] as const;
export const deviceLabel = (id: string) => devices.find((d) => d.id === id)?.label ?? id;

export const paymentMethods = [
  { id: "crypto", label: "Crypto (BTC, USDT)", hint: "You pay on the next page. Access is sent once the payment arrives." },
  { id: "card", label: "Credit or debit card", hint: "WhatsApp opens with your order. We send you the payment link there." },
  { id: "paypal", label: "PayPal", hint: "WhatsApp opens with your order. We send you the payment link there." },
] as const;
/** "none" is only valid for the free trial */
export type PaymentId = (typeof paymentMethods)[number]["id"] | "none";
export const paymentLabel = (id: string) =>
  id === "none" ? "Free trial" : (paymentMethods.find((p) => p.id === id)?.label ?? id);

/**
 * Crypto wallets for checkout. Empty address = the coin shows as "not available"
 * and the customer is sent to WhatsApp instead (no order is lost).
 */
export const cryptoWallets = [
  {
    id: "usdt-trc20",
    label: "USDT (TRC20)",
    network: "TRC20",
    coingeckoId: "tether",
    symbol: "USDT",
    decimals: 2,
    address: "", // TODO: your USDT-TRC20 address (starts with T…)
  },
  {
    id: "btc",
    label: "Bitcoin (BTC)",
    network: "Bitcoin",
    coingeckoId: "bitcoin",
    symbol: "BTC",
    decimals: 6,
    address: "", // TODO: your BTC address (bc1…)
  },
] as const;
export type WalletId = (typeof cryptoWallets)[number]["id"];

/** Order handed from the popup to checkout (sessionStorage, never in the URL) */
export type Order = {
  id: string;
  productId: string;
  device: string;
  payment: PaymentId;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  token?: string; // from the server, lets the customer submit the TXID later
};
export const ORDER_KEY = "iptv-order";
/** Keep in sync with market.orderPrefix in site.ts (not imported here to avoid a circular import) */
export const ORDER_PREFIX = "US";

export function newOrderId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return `${ORDER_PREFIX}-` + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function productLabel(p: Product) {
  return p.months ? `IPTV Subscription – ${p.name}` : `IPTV ${p.name} (${p.hours} hours)`;
}
