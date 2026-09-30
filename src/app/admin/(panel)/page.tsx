import type { Metadata } from "next";
import Link from "next/link";
import {
  ORDER_GROUPS,
  PERIODS,
  getAnalytics,
  getExpiringSoon,
  getStatusCounts,
  listOrders,
} from "@/lib/orders";
import {
  deviceLabel,
  fmtDate,
  fmtDateCustomer,
  fmtMoney,
  fmtNum,
  paymentLabel,
  productLabel,
  templates,
  waToCustomer,
} from "@/components/admin/ui";
import OrdersTable from "@/components/admin/OrdersTable";
import RevenueChart from "@/components/admin/RevenueChart";
import BarList from "@/components/admin/BarList";
import WaIcon from "@/components/admin/WaIcon";

export const metadata: Metadata = { title: "Dashboard" };

type Search = { period?: string; list?: string };

const pct = (v: number) => `${v > 0 ? "+" : ""}${fmtNum(v)}%`;

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<Search> }) {
  const { period, list: listParam } = await searchParams;
  const group = ORDER_GROUPS.find((g) => g.id === listParam) ?? ORDER_GROUPS[0];

  const [a, counts, expiring, list] = await Promise.all([
    getAnalytics(period),
    getStatusCounts(),
    getExpiringSoon(7),
    listOrders({ statuses: [...group.statuses], page: 1, pageSize: 15 }),
  ]);
  const href = (p: Search) => {
    const sp = new URLSearchParams();
    const z = p.period ?? a.period.id;
    const l = p.list ?? group.id;
    if (z !== "30d") sp.set("period", z);
    if (l !== "pending") sp.set("list", l);
    const s = sp.toString();
    return `/admin${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <div className="admin-head">
        <h1>Dashboard</h1>
        <nav className="tabs is-period" aria-label="Period">
          {PERIODS.map((p) => (
            <Link key={p.id} href={href({ period: p.id })} aria-current={p.id === a.period.id ? "page" : undefined}>
              {p.label}
            </Link>
          ))}
        </nav>
      </div>

      <dl className="kpis">
        <div className="kpi is-main">
          <dt>Revenue, {a.period.label.toLowerCase()}</dt>
          <dd>{fmtMoney(a.revenue)}</dd>
          <p className="kpi-note">
            {a.revenueChange === null
              ? a.revenue > 0
                ? "Previous period: €0"
                : "No revenue yet"
              : `${pct(a.revenueChange)} vs previous period`}
          </p>
        </div>
        <div className="kpi">
          <dt>Paid orders</dt>
          <dd>{a.paid}</dd>
          <p className="kpi-note">
            {a.customers} {a.customers === 1 ? "customer" : "customers"}
          </p>
        </div>
        <div className="kpi">
          <dt>Orders</dt>
          <dd>{a.orders}</dd>
          <p className="kpi-note">Previous period: {a.prevOrders}</p>
        </div>
        <div className="kpi">
          <dt>Avg. order value</dt>
          <dd>{fmtMoney(a.avgOrder)}</dd>
          <p className="kpi-note">Conversion {fmtNum(a.conversion)}%</p>
        </div>
        <div className="kpi is-warn">
          <dt>Awaiting payment</dt>
          <dd>{counts.group(["neu", "wartend"])}</dd>
          <p className="kpi-note">{fmtMoney(counts.openRevenue)} outstanding</p>
        </div>
        <div className="kpi">
          <dt>Active subscriptions</dt>
          <dd>{counts.counts.aktiviert ?? 0}</dd>
          <p className="kpi-note">{expiring.length} expire within 7 days</p>
        </div>
      </dl>

      <section className="panel" aria-labelledby="revenue" style={{ marginBottom: "1rem" }}>
        <div className="admin-head" style={{ marginBottom: "0.5rem" }}>
          <h2 id="revenue" style={{ margin: 0 }}>
            Revenue and orders, {a.period.label.toLowerCase()}
          </h2>
          <span className="muted">{a.period.unit === "hour" ? "per hour" : a.period.unit === "day" ? "per day" : "per month"}</span>
        </div>
        <RevenueChart data={a.series} unit={a.period.unit} />
      </section>

      <div className="admin-grid is-three">
        <section className="panel" aria-labelledby="packages">
          <h2 id="packages">Revenue by package</h2>
          <BarList items={a.byPackage} label={(k) => productLabel(k)} empty="No paid orders in this period." />
        </section>
        <section className="panel" aria-labelledby="devices">
          <h2 id="devices">Top devices</h2>
          <BarList items={a.byDevice} label={deviceLabel} showRevenue={false} empty="No orders in this period." />
        </section>
        <section className="panel" aria-labelledby="payments">
          <h2 id="payments">Payment methods</h2>
          <BarList items={a.byPayment} label={paymentLabel} empty="No paid orders in this period." />
        </section>
      </div>

      <section aria-labelledby="orders" style={{ marginBottom: "1.75rem" }}>
        <div className="admin-head" style={{ marginBottom: "0.75rem" }}>
          <h2 id="orders" style={{ margin: 0 }}>
            Orders
          </h2>
          <Link href="/admin/orders">All orders with search and filters</Link>
        </div>
        <nav className="tabs" aria-label="Orders by status">
          {ORDER_GROUPS.map((g) => (
            <Link
              key={g.id}
              href={href({ list: g.id })}
              aria-current={g.id === group.id ? "page" : undefined}
              className={`tab-${g.id}`}
            >
              {g.label} <span className="count">{counts.group(g.statuses)}</span>
            </Link>
          ))}
        </nav>
        <OrdersTable
          rows={list.rows}
          emptyText={
            group.id === "pending"
              ? "No pending orders."
              : group.id === "on-hold"
                ? "Nothing on hold. Crypto payments with a reported TXID land here."
                : group.id === "paid"
                  ? "No paid orders yet."
                  : undefined
          }
        />
        {list.total > list.rows.length && (
          <p className="muted" style={{ marginTop: "0.6rem" }}>
            Showing {list.rows.length} of {list.total}.{" "}
            <Link href={`/admin/orders${group.statuses.length === 1 ? `?status=${group.statuses[0]}` : ""}`}>
              View all
            </Link>
          </p>
        )}
      </section>

      <section className="panel" aria-labelledby="expiring">
        <h2 id="expiring">Expiring in the next 7 days</h2>
        {expiring.length === 0 ? (
          <p className="empty">No subscriptions expire in the next 7 days.</p>
        ) : (
          <ul className="simple-list">
            {expiring.map((o) => {
              const wa = waToCustomer(o.phone, templates.renewal(o.name, fmtDateCustomer(o.expires_at)));
              return (
                <li key={o.id}>
                  <span>
                    <Link href={`/admin/orders/${o.id}`}>{o.name}</Link>
                    <span className="sub">
                      {productLabel(o.product_id, o.product_name)}, ends {fmtDate(o.expires_at)}
                    </span>
                  </span>
                  {wa ? (
                    <a href={wa} target="_blank" rel="noopener" className="wa-btn">
                      <WaIcon />
                      <span>Offer renewal</span>
                    </a>
                  ) : (
                    <a href={`mailto:${o.email}`} className="wa-btn is-mail">
                      Send email
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
