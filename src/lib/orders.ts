import "server-only";
import { query } from "./db";
import { devices, getProduct, isFree, paymentMethods, trial } from "./shop";
import { market } from "./site";

/**
 * Flow: Pending (ordered, not paid) → On hold (payment reported, e.g. crypto TXID, needs checking)
 * → Paid → Active (subscription running) → Expired. Cancelled at any time.
 * DB values stay short and stable ("neu", "wartend", …); the admin shows the English label.
 */
export const STATUSES = [
  { id: "neu", label: "Pending" },
  { id: "wartend", label: "On hold" },
  { id: "bezahlt", label: "Paid" },
  { id: "aktiviert", label: "Active" },
  { id: "abgelaufen", label: "Expired" },
  { id: "storniert", label: "Cancelled" },
] as const;
export type StatusId = (typeof STATUSES)[number]["id"];
export const statusLabel = (id: string) => STATUSES.find((s) => s.id === id)?.label ?? id;
export const PAID: StatusId[] = ["bezahlt", "aktiviert", "abgelaufen"];

/** Groups for the dashboard tabs */
export const ORDER_GROUPS = [
  { id: "pending", label: "Pending", statuses: ["neu"] as StatusId[] },
  { id: "on-hold", label: "On hold", statuses: ["wartend"] as StatusId[] },
  { id: "paid", label: "Paid", statuses: ["bezahlt", "aktiviert"] as StatusId[] },
  { id: "all", label: "All", statuses: [] as StatusId[] },
] as const;

export type OrderRow = {
  id: string;
  created_at: Date;
  updated_at: Date;
  product_id: string;
  product_name: string;
  months: number;
  hours: number | null;
  price_cents: number;
  device: string;
  payment: string;
  name: string;
  email: string;
  phone: string | null;
  status: StatusId;
  paid_at: Date | null;
  activated_at: Date | null;
  expires_at: Date | null;
  crypto_coin: string | null;
  crypto_amount: string | null;
  txid: string | null;
  note: string | null;
};

const ID_RE = /^[A-Z]{2}-[A-HJ-NP-Z2-9]{6}$/; // market prefix, e.g. US-7K2QX9
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export const isOrderId = (id: string) => ID_RE.test(id);

/** Validates input from the order popup. Price and plan data always come from the server, never the browser. */
export function parseNewOrder(body: Record<string, unknown>) {
  const id = clean(body.id, 20);
  const product = getProduct(clean(body.productId, 40));
  const device = clean(body.device, 40);
  const payment = clean(body.payment, 20);
  const name = clean(body.name, 120);
  const email = clean(body.email, 200).toLowerCase();
  const phone = clean(body.phone, 40);

  if (!ID_RE.test(id)) return { error: "Invalid order number" } as const;
  if (!product) return { error: "Unknown plan" } as const;
  if (!devices.some((d) => d.id === device)) return { error: "Unknown device" } as const;
  // Free trial: no payment. Paid plans: one of the listed methods. Never trust the browser on which is which.
  const paymentOk = isFree(product) ? payment === "none" : paymentMethods.some((p) => p.id === payment);
  if (!paymentOk) return { error: "Unknown payment method" } as const;
  if (name.length < 2) return { error: "Name missing" } as const;
  if (!EMAIL_RE.test(email)) return { error: "Invalid email" } as const;
  if (phone.replace(/\D/g, "").length < 8) return { error: "WhatsApp number missing" } as const;

  return { order: { id, product, device, payment, name, email, phone } } as const;
}

export async function insertOrder(o: NonNullable<ReturnType<typeof parseNewOrder>["order"]>) {
  await query(
    `INSERT INTO orders (id, product_id, product_name, months, hours, price_cents, device, payment, name, email, phone)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (id) DO NOTHING`,
    [
      o.id,
      o.product.id,
      o.product.name,
      o.product.months,
      o.product.hours ?? null,
      Math.round(o.product.price * 100),
      o.device,
      o.payment,
      o.name,
      o.email,
      o.phone,
    ]
  );
}

export async function saveCryptoPayment(id: string, coin: string, amount: string, txid: string) {
  await query(
    `UPDATE orders SET crypto_coin = $2, crypto_amount = $3, txid = NULLIF($4, ''),
       status = CASE WHEN status = 'neu' THEN 'wartend' ELSE status END, updated_at = now()
     WHERE id = $1 AND payment = 'crypto'`,
    [id, coin.slice(0, 40), amount.slice(0, 60), txid.slice(0, 200)]
  );
}

/** Aktivierte Abos, deren Laufzeit vorbei ist, automatisch auf "abgelaufen" setzen. */
async function expireOldOrders() {
  await query(`UPDATE orders SET status = 'abgelaufen', updated_at = now()
               WHERE status = 'aktiviert' AND expires_at IS NOT NULL AND expires_at < now()`);
}

const TZ = market.timeZone;

export async function getStats() {
  await expireOldOrders();
  const [row] = await query<{
    revenue_today: string;
    revenue_month: string;
    revenue_total: string;
    orders_today: string;
    open_orders: string;
    active_subs: string;
    customers: string;
  }>(
    `SELECT
       COALESCE(SUM(price_cents) FILTER (WHERE status = ANY($1) AND (paid_at AT TIME ZONE '${TZ}')::date = (now() AT TIME ZONE '${TZ}')::date), 0) AS revenue_today,
       COALESCE(SUM(price_cents) FILTER (WHERE status = ANY($1) AND date_trunc('month', paid_at AT TIME ZONE '${TZ}') = date_trunc('month', now() AT TIME ZONE '${TZ}')), 0) AS revenue_month,
       COALESCE(SUM(price_cents) FILTER (WHERE status = ANY($1)), 0) AS revenue_total,
       COUNT(*) FILTER (WHERE (created_at AT TIME ZONE '${TZ}')::date = (now() AT TIME ZONE '${TZ}')::date) AS orders_today,
       COUNT(*) FILTER (WHERE status = 'neu') AS open_orders,
       COUNT(*) FILTER (WHERE status = 'aktiviert') AS active_subs,
       COUNT(DISTINCT lower(email)) FILTER (WHERE status = ANY($1)) AS customers
     FROM orders`,
    [PAID]
  );
  return {
    revenueToday: Number(row.revenue_today) / 100,
    revenueMonth: Number(row.revenue_month) / 100,
    revenueTotal: Number(row.revenue_total) / 100,
    ordersToday: Number(row.orders_today),
    openOrders: Number(row.open_orders),
    activeSubs: Number(row.active_subs),
    customers: Number(row.customers),
  };
}

export async function getMonthByProduct() {
  const rows = await query<{ product_name: string; count: string; revenue: string }>(
    `SELECT product_name, COUNT(*) AS count, SUM(price_cents) AS revenue
     FROM orders
     WHERE status = ANY($1) AND date_trunc('month', paid_at AT TIME ZONE '${TZ}') = date_trunc('month', now() AT TIME ZONE '${TZ}')
     GROUP BY product_name ORDER BY SUM(price_cents) DESC`,
    [PAID]
  );
  return rows.map((r) => ({ name: r.product_name, count: Number(r.count), revenue: Number(r.revenue) / 100 }));
}

export async function getExpiringSoon(days = 7) {
  return query<OrderRow>(
    `SELECT * FROM orders WHERE status = 'aktiviert' AND expires_at BETWEEN now() AND now() + ($1 || ' days')::interval
     ORDER BY expires_at ASC LIMIT 50`,
    [String(days)]
  );
}

export const PAGE_SIZE = 50;

export async function listOrders({
  status,
  statuses,
  device,
  q,
  page,
  pageSize = PAGE_SIZE,
}: {
  status?: string;
  statuses?: string[];
  device?: string;
  q?: string;
  page: number;
  pageSize?: number;
}) {
  await expireOldOrders();
  const where: string[] = [];
  const params: unknown[] = [];
  const wanted = (statuses ?? (status ? [status] : [])).filter((s) => STATUSES.some((x) => x.id === s));
  if (wanted.length) {
    params.push(wanted);
    where.push(`status = ANY($${params.length})`);
  }
  if (device) {
    params.push(device);
    where.push(`device = $${params.length}`);
  }
  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    const i = params.length;
    where.push(`(lower(name) LIKE $${i} OR lower(email) LIKE $${i} OR lower(id) LIKE $${i} OR COALESCE(phone,'') LIKE $${i})`);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [{ total }] = await query<{ total: string }>(`SELECT COUNT(*) AS total FROM orders ${clause}`, params);
  params.push(pageSize, (page - 1) * pageSize);
  const rows = await query<OrderRow>(
    `SELECT * FROM orders ${clause} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return { rows, total: Number(total) };
}

/** Anzahl pro Status (für Tabs) und offene Summe (Ausstehend + Wartestellung) */
export async function getStatusCounts() {
  await expireOldOrders();
  const rows = await query<{ status: string; n: string; cents: string }>(
    `SELECT status, COUNT(*) AS n, COALESCE(SUM(price_cents), 0) AS cents FROM orders GROUP BY status`
  );
  const counts: Record<string, number> = {};
  let openCents = 0;
  for (const r of rows) {
    counts[r.status] = Number(r.n);
    if (r.status === "neu" || r.status === "wartend") openCents += Number(r.cents);
  }
  const group = (ids: readonly string[]) =>
    ids.length ? ids.reduce((sum, id) => sum + (counts[id] ?? 0), 0) : Object.values(counts).reduce((a, b) => a + b, 0);
  return { counts, group, openRevenue: openCents / 100 };
}

/* ---------- Analytics: Umsatz und Bestellungen je Zeitraum ---------- */

export const PERIODS = [
  { id: "today", label: "Today", anchor: "day", back: "0 days", span: "1 day", step: "1 hour", unit: "hour" },
  { id: "7d", label: "7 days", anchor: "day", back: "6 days", span: "7 days", step: "1 day", unit: "day" },
  { id: "30d", label: "30 days", anchor: "day", back: "29 days", span: "30 days", step: "1 day", unit: "day" },
  { id: "12m", label: "12 months", anchor: "month", back: "11 months", span: "12 months", step: "1 month", unit: "month" },
  { id: "2y", label: "2 years", anchor: "month", back: "23 months", span: "24 months", step: "1 month", unit: "month" },
] as const;
export type PeriodId = (typeof PERIODS)[number]["id"];
export const getPeriod = (id?: string) => PERIODS.find((p) => p.id === id) ?? PERIODS[2];

/**
 * Period in the market time zone: [from, to). The previous period has the same length right before it.
 * Umsatz zählt nach Zahlungsdatum, Bestellungen nach Eingangsdatum.
 */
const PERIOD_CTE = `
  WITH b AS (SELECT date_trunc($1, now() AT TIME ZONE '${TZ}') - $2::interval AS from_ts),
       p AS (SELECT from_ts, from_ts + $3::interval AS to_ts, from_ts - $3::interval AS prev_ts FROM b)`;

const localPaid = `(o.paid_at AT TIME ZONE '${TZ}')`;
const localCreated = `(o.created_at AT TIME ZONE '${TZ}')`;

export async function getAnalytics(periodId?: string) {
  const per = getPeriod(periodId);
  const base = [per.anchor, per.back, per.span];

  const [totals] = await query<Record<string, string>>(
    `${PERIOD_CTE}
     SELECT
       COALESCE(SUM(o.price_cents) FILTER (WHERE o.status = ANY($4) AND ${localPaid} >= p.from_ts AND ${localPaid} < p.to_ts), 0) AS revenue,
       COUNT(*) FILTER (WHERE o.status = ANY($4) AND ${localPaid} >= p.from_ts AND ${localPaid} < p.to_ts) AS paid,
       COUNT(*) FILTER (WHERE ${localCreated} >= p.from_ts AND ${localCreated} < p.to_ts) AS orders,
       COUNT(DISTINCT lower(o.email)) FILTER (WHERE o.status = ANY($4) AND ${localPaid} >= p.from_ts AND ${localPaid} < p.to_ts) AS customers,
       COALESCE(SUM(o.price_cents) FILTER (WHERE o.status = ANY($4) AND ${localPaid} >= p.prev_ts AND ${localPaid} < p.from_ts), 0) AS prev_revenue,
       COUNT(*) FILTER (WHERE ${localCreated} >= p.prev_ts AND ${localCreated} < p.from_ts) AS prev_orders
     FROM p LEFT JOIN orders o ON true
     GROUP BY p.from_ts`,
    [...base, PAID]
  );

  const series = await query<{ bucket: string; revenue: string; paid: string; orders: string }>(
    `${PERIOD_CTE},
     s AS (SELECT generate_series(p.from_ts, p.to_ts - $4::interval, $4::interval) AS bucket FROM p),
     r AS (SELECT date_trunc($5, ${localPaid}) AS bucket, SUM(o.price_cents) AS revenue, COUNT(*) AS paid
           FROM orders o, p WHERE o.status = ANY($6) AND ${localPaid} >= p.from_ts AND ${localPaid} < p.to_ts GROUP BY 1),
     c AS (SELECT date_trunc($5, ${localCreated}) AS bucket, COUNT(*) AS orders
           FROM orders o, p WHERE ${localCreated} >= p.from_ts AND ${localCreated} < p.to_ts GROUP BY 1)
     SELECT to_char(s.bucket, 'YYYY-MM-DD HH24') AS bucket,
            COALESCE(r.revenue, 0) AS revenue, COALESCE(r.paid, 0) AS paid, COALESCE(c.orders, 0) AS orders
     FROM s LEFT JOIN r USING (bucket) LEFT JOIN c USING (bucket) ORDER BY s.bucket`,
    [...base, per.step, per.unit, PAID]
  );

  // Aufschlüsselung: Umsatz nach Paket und Zahlungsart (bezahlt), Geräte nach allen Bestellungen (ohne storniert)
  const breakdown = await query<{ dim: string; key: string; n: string; cents: string }>(
    `${PERIOD_CTE}
     SELECT 'paket' AS dim, o.product_id AS key, COUNT(*) AS n, SUM(o.price_cents) AS cents
       FROM orders o, p WHERE o.status = ANY($4) AND ${localPaid} >= p.from_ts AND ${localPaid} < p.to_ts GROUP BY o.product_id
     UNION ALL
     SELECT 'zahlung', o.payment, COUNT(*), SUM(o.price_cents)
       FROM orders o, p WHERE o.status = ANY($4) AND ${localPaid} >= p.from_ts AND ${localPaid} < p.to_ts GROUP BY o.payment
     UNION ALL
     SELECT 'geraet', o.device, COUNT(*), SUM(o.price_cents)
       FROM orders o, p WHERE o.status <> 'storniert' AND ${localCreated} >= p.from_ts AND ${localCreated} < p.to_ts GROUP BY o.device`,
    [...base, PAID]
  );
  const pick = (dim: string) =>
    breakdown
      .filter((r) => r.dim === dim)
      .map((r) => ({ key: r.key, count: Number(r.n), revenue: Number(r.cents) / 100 }))
      .sort((a, b) => b.count - a.count || b.revenue - a.revenue);

  const revenue = Number(totals.revenue) / 100;
  const prevRevenue = Number(totals.prev_revenue) / 100;
  const orders = Number(totals.orders);
  const paid = Number(totals.paid);

  return {
    period: per,
    revenue,
    prevRevenue,
    revenueChange: prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null,
    orders,
    prevOrders: Number(totals.prev_orders),
    paid,
    customers: Number(totals.customers),
    avgOrder: paid ? revenue / paid : 0,
    conversion: orders ? (paid / orders) * 100 : 0,
    series: series.map((r) => ({
      bucket: r.bucket,
      revenue: Number(r.revenue) / 100,
      paid: Number(r.paid),
      orders: Number(r.orders),
    })),
    byPackage: pick("paket"),
    byPayment: pick("zahlung"),
    byDevice: pick("geraet"),
  };
}

export async function getOrder(id: string) {
  if (!ID_RE.test(id)) return null;
  const [row] = await query<OrderRow>(`SELECT * FROM orders WHERE id = $1`, [id]);
  return row ?? null;
}

export async function getCustomerOrders(email: string, excludeId: string) {
  return query<OrderRow>(
    `SELECT * FROM orders WHERE lower(email) = lower($1) AND id <> $2 ORDER BY created_at DESC LIMIT 20`,
    [email, excludeId]
  );
}

/**
 * Status ändern. "bezahlt" setzt das Zahlungsdatum, "aktiviert" startet die Laufzeit
 * (Monate bzw. Stunden des Pakets) ab jetzt, sofern noch nicht gesetzt.
 */
export async function setStatus(id: string, status: StatusId) {
  await query(
    `UPDATE orders SET
       status = $2,
       paid_at = CASE WHEN $2 IN ('bezahlt','aktiviert','abgelaufen') THEN COALESCE(paid_at, now()) ELSE paid_at END,
       activated_at = CASE WHEN $2 = 'aktiviert' THEN COALESCE(activated_at, now()) ELSE activated_at END,
       expires_at = CASE WHEN $2 = 'aktiviert' THEN COALESCE(expires_at,
                      CASE WHEN months > 0 THEN now() + (months || ' months')::interval
                           ELSE now() + (COALESCE(hours, 24) || ' hours')::interval END)
                    ELSE expires_at END,
       updated_at = now()
     WHERE id = $1`,
    [id, status]
  );
}

export async function setNote(id: string, note: string) {
  await query(`UPDATE orders SET note = NULLIF($2, ''), updated_at = now() WHERE id = $1`, [id, note.slice(0, 2000)]);
}

export async function setExpiry(id: string, isoDate: string) {
  await query(`UPDATE orders SET expires_at = ($2::date + time '23:59') AT TIME ZONE '${TZ}', updated_at = now() WHERE id = $1`, [id, isoDate]);
}

export async function deleteOrder(id: string) {
  await query(`DELETE FROM orders WHERE id = $1`, [id]);
}

export async function allOrdersForExport() {
  return query<OrderRow>(`SELECT * FROM orders ORDER BY created_at DESC`);
}

/* ---------- Customers: one row per email address ---------- */

export type CustomerRow = {
  email: string;
  name: string;
  phone: string | null;
  orders: number;
  paid_orders: number;
  spent_cents: number;
  first_order: Date;
  last_order: Date;
  last_order_id: string;
  active_until: Date | null;
  devices: string[];
};

export const CUSTOMER_FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active subscription" },
  { id: "expired", label: "Expired, win back" },
  { id: "leads", label: "Never paid" },
] as const;

export async function listCustomers({
  q,
  filter,
  page,
  pageSize = PAGE_SIZE,
}: {
  q?: string;
  filter?: string;
  page: number;
  pageSize?: number;
}) {
  await expireOldOrders();
  const params: unknown[] = [PAID];
  const having: string[] = [];
  let where = "";
  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    where = `WHERE lower(name) LIKE $2 OR lower(email) LIKE $2 OR COALESCE(phone, '') LIKE $2`;
  }
  if (filter === "active") having.push(`MAX(expires_at) FILTER (WHERE status = 'aktiviert') > now()`);
  if (filter === "expired")
    having.push(
      `COUNT(*) FILTER (WHERE status = 'aktiviert') = 0 AND COUNT(*) FILTER (WHERE status = 'abgelaufen') > 0`
    );
  if (filter === "leads") having.push(`COUNT(*) FILTER (WHERE status = ANY($1)) = 0`);
  const havingSql = having.length ? `HAVING ${having.join(" AND ")}` : "";
  const base = `
    SELECT lower(email) AS email,
           (array_agg(name ORDER BY created_at DESC))[1] AS name,
           (array_agg(phone ORDER BY created_at DESC) FILTER (WHERE phone IS NOT NULL))[1] AS phone,
           COUNT(*)::int AS orders,
           (COUNT(*) FILTER (WHERE status = ANY($1)))::int AS paid_orders,
           COALESCE(SUM(price_cents) FILTER (WHERE status = ANY($1)), 0)::int AS spent_cents,
           MIN(created_at) AS first_order,
           MAX(created_at) AS last_order,
           (array_agg(id ORDER BY created_at DESC))[1] AS last_order_id,
           MAX(expires_at) FILTER (WHERE status = 'aktiviert') AS active_until,
           array_agg(DISTINCT device) AS devices
    FROM orders ${where}
    GROUP BY lower(email) ${havingSql}`;
  const [{ total }] = await query<{ total: string }>(`SELECT COUNT(*) AS total FROM (${base}) t`, params);
  params.push(pageSize, (page - 1) * pageSize);
  const rows = await query<CustomerRow>(
    `${base} ORDER BY spent_cents DESC, last_order DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return { rows, total: Number(total) };
}

export async function getCustomerSummary() {
  const [row] = await query<{ customers: string; paying: string; repeat: string; ltv: string }>(
    `SELECT COUNT(*) AS customers,
            COUNT(*) FILTER (WHERE paid > 0) AS paying,
            COUNT(*) FILTER (WHERE paid > 1) AS repeat,
            COALESCE(AVG(spent) FILTER (WHERE paid > 0), 0) AS ltv
     FROM (SELECT lower(email) AS e,
                  COUNT(*) FILTER (WHERE status = ANY($1)) AS paid,
                  SUM(price_cents) FILTER (WHERE status = ANY($1)) AS spent
           FROM orders GROUP BY lower(email)) c`,
    [PAID]
  );
  return {
    customers: Number(row.customers),
    paying: Number(row.paying),
    repeat: Number(row.repeat),
    ltv: Number(row.ltv) / 100,
  };
}

/* ---------- Sales for the Analytics page ---------- */

const TRIAL_ID = trial.id;

/**
 * Orders and revenue for the last `days` days ending today (market time zone), plus the same length before it.
 * Matches the Google Analytics periods (today, 7, 30, 90, 365 days), so visitors and sales line up.
 */
export async function getSalesWindow(days: number) {
  await expireOldOrders();
  const [r] = await query<Record<string, string>>(
    `WITH b AS (SELECT date_trunc('day', now() AT TIME ZONE '${TZ}') - make_interval(days => $1::int - 1) AS from_ts),
          p AS (SELECT from_ts, from_ts + make_interval(days => $1::int) AS to_ts, from_ts - make_interval(days => $1::int) AS prev_ts FROM b)
     SELECT
       COUNT(*) FILTER (WHERE ${localCreated} >= p.from_ts AND ${localCreated} < p.to_ts) AS orders,
       COUNT(*) FILTER (WHERE ${localCreated} >= p.from_ts AND ${localCreated} < p.to_ts AND o.product_id = $3) AS trials,
       COUNT(*) FILTER (WHERE o.status = ANY($2) AND ${localPaid} >= p.from_ts AND ${localPaid} < p.to_ts) AS paid,
       COALESCE(SUM(o.price_cents) FILTER (WHERE o.status = ANY($2) AND ${localPaid} >= p.from_ts AND ${localPaid} < p.to_ts), 0) AS revenue,
       COUNT(*) FILTER (WHERE ${localCreated} >= p.prev_ts AND ${localCreated} < p.from_ts) AS prev_orders,
       COUNT(*) FILTER (WHERE o.status = ANY($2) AND ${localPaid} >= p.prev_ts AND ${localPaid} < p.from_ts) AS prev_paid,
       COALESCE(SUM(o.price_cents) FILTER (WHERE o.status = ANY($2) AND ${localPaid} >= p.prev_ts AND ${localPaid} < p.from_ts), 0) AS prev_revenue
     FROM p LEFT JOIN orders o ON true
     GROUP BY p.from_ts`,
    [days, PAID, TRIAL_ID]
  );
  return {
    orders: Number(r.orders),
    trials: Number(r.trials),
    paid: Number(r.paid),
    revenue: Number(r.revenue) / 100,
    prevOrders: Number(r.prev_orders),
    prevPaid: Number(r.prev_paid),
    prevRevenue: Number(r.prev_revenue) / 100,
  };
}

export type LiveSales = {
  last30: number;
  todayOrders: number;
  todayRevenue: number;
  latest: { id: string; at: string; plan: string; device: string; status: string; statusLabel: string; price: number }[];
};

/** Orders right now: last 30 minutes, today, and the newest five */
export async function getLiveSales(): Promise<LiveSales> {
  const [r] = await query<{ last30: string; today_orders: string; today_revenue: string }>(
    `WITH t AS (SELECT date_trunc('day', now() AT TIME ZONE '${TZ}') AS from_ts)
     SELECT COUNT(*) FILTER (WHERE o.created_at > now() - interval '30 minutes') AS last30,
            COUNT(*) FILTER (WHERE ${localCreated} >= t.from_ts) AS today_orders,
            COALESCE(SUM(o.price_cents) FILTER (WHERE o.status = ANY($1) AND ${localPaid} >= t.from_ts), 0) AS today_revenue
     FROM t LEFT JOIN orders o ON true
     GROUP BY t.from_ts`,
    [PAID]
  );
  const latest = await query<{ id: string; created_at: Date; product_name: string; device: string; status: string; price_cents: number }>(
    `SELECT id, created_at, product_name, device, status, price_cents FROM orders ORDER BY created_at DESC LIMIT 5`
  );
  return {
    last30: Number(r.last30),
    todayOrders: Number(r.today_orders),
    todayRevenue: Number(r.today_revenue) / 100,
    latest: latest.map((o) => ({
      id: o.id,
      at: new Date(o.created_at).toISOString(),
      plan: o.product_name,
      device: o.device,
      status: o.status,
      statusLabel: statusLabel(o.status),
      price: o.price_cents / 100,
    })),
  };
}
