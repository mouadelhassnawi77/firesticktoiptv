import type { Metadata } from "next";
import Link from "next/link";
import { CUSTOMER_FILTERS, PAGE_SIZE, getCustomerSummary, listCustomers } from "@/lib/orders";
import { deviceLabel, fmtCents, fmtDate, fmtMoney, templates, waChat, waToCustomer } from "@/components/admin/ui";
import WaIcon from "@/components/admin/WaIcon";

export const metadata: Metadata = { title: "Customers" };

type Search = { q?: string; filter?: string; page?: string };

function href(p: Search) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v && !(k === "filter" && v === "all")) sp.set(k, v);
  const s = sp.toString();
  return `/admin/customers${s ? `?${s}` : ""}`;
}

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { q: rawQ, filter: rawFilter, page: rawPage } = await searchParams;
  const q = rawQ?.trim() || undefined;
  const filter = CUSTOMER_FILTERS.find((f) => f.id === rawFilter)?.id ?? "all";
  const page = Math.max(1, Number(rawPage) || 1);
  const [{ rows, total }, sum] = await Promise.all([listCustomers({ q, filter, page }), getCustomerSummary()]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const now = Date.now();

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Customers</h1>
          <p className="page-sub">Everyone who ordered, grouped by email address.</p>
        </div>
      </div>

      <dl className="kpis">
        <div className="kpi">
          <dt>Customers</dt>
          <dd>{sum.customers}</dd>
          <p className="kpi-note">Unique email addresses</p>
        </div>
        <div className="kpi">
          <dt>Paying customers</dt>
          <dd>{sum.paying}</dd>
          <p className="kpi-note">{sum.customers ? Math.round((sum.paying / sum.customers) * 100) : 0}% of all customers</p>
        </div>
        <div className="kpi">
          <dt>Repeat buyers</dt>
          <dd>{sum.repeat}</dd>
          <p className="kpi-note">Paid 2 or more times</p>
        </div>
        <div className="kpi is-main">
          <dt>Average lifetime value</dt>
          <dd>{fmtMoney(sum.ltv)}</dd>
          <p className="kpi-note">Per paying customer</p>
        </div>
      </dl>

      <nav className="tabs" aria-label="Filter customers">
        {CUSTOMER_FILTERS.map((f) => (
          <Link key={f.id} href={href({ q, filter: f.id })} aria-current={f.id === filter ? "page" : undefined}>
            {f.label}
          </Link>
        ))}
      </nav>

      <form className="searchbar" action="/admin/customers" role="search">
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        <input type="search" name="q" defaultValue={q} placeholder="Name, email or phone" aria-label="Search customers" />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>

      {rows.length === 0 ? (
        <div className="panel">
          <p className="empty">
            {q || filter !== "all"
              ? "No customers match this filter. Clear the search or pick All."
              : "No customers yet. They appear here after their first order."}
          </p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="orders">
            <thead>
              <tr>
                <th scope="col">Customer</th>
                <th scope="col">Devices</th>
                <th scope="col" className="num">
                  Orders
                </th>
                <th scope="col" className="num">
                  Spent
                </th>
                <th scope="col">Subscription</th>
                <th scope="col">Last order</th>
                <th scope="col">Contact</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const active = Boolean(c.active_until && new Date(c.active_until).getTime() > now);
                const lapsed = !active && c.paid_orders > 0;
                const wa = lapsed
                  ? waToCustomer(c.phone, templates.winback(c.name))
                  : waChat({ phone: c.phone, name: c.name, id: c.last_order_id, product_name: "your order" });
                return (
                  <tr key={c.email}>
                    <td>
                      <strong>{c.name}</strong>
                      <span className="sub">{c.email}</span>
                      {c.phone && <span className="sub">{c.phone}</span>}
                    </td>
                    <td>
                      {c.devices.slice(0, 2).map((d) => (
                        <span key={d} className="chip">
                          {deviceLabel(d)}
                        </span>
                      ))}
                    </td>
                    <td className="num">
                      {c.orders}
                      <span className="sub">{c.paid_orders} paid</span>
                    </td>
                    <td className="num">{fmtCents(c.spent_cents)}</td>
                    <td>
                      {active ? (
                        <span className="badge badge-aktiviert">Active until {fmtDate(c.active_until)}</span>
                      ) : lapsed ? (
                        <span className="badge badge-abgelaufen">No active plan</span>
                      ) : (
                        <span className="badge badge-neu">Never paid</span>
                      )}
                    </td>
                    <td>
                      <Link href={`/admin/orders/${c.last_order_id}`}>{c.last_order_id}</Link>
                      <span className="sub">{fmtDate(c.last_order)}</span>
                    </td>
                    <td>
                      <div className="row-actions">
                        {wa ? (
                          <a className="wa-btn" href={wa} target="_blank" rel="noopener">
                            <WaIcon />
                            <span>{lapsed ? "Win back" : "WhatsApp"}</span>
                          </a>
                        ) : (
                          <a className="wa-btn is-mail" href={`mailto:${c.email}`}>
                            Email
                          </a>
                        )}
                        <Link className="btn btn-ghost btn-sm" href={`/admin/orders?q=${encodeURIComponent(c.email)}`}>
                          Orders
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className="pager" aria-label="Pages">
          {page > 1 && <Link href={href({ q, filter, page: String(page - 1) })}>Previous page</Link>}
          <span>
            Page {page} of {pages}
          </span>
          {page < pages && <Link href={href({ q, filter, page: String(page + 1) })}>Next page</Link>}
        </nav>
      )}
    </>
  );
}
