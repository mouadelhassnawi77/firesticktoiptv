import type { Metadata } from "next";
import Link from "next/link";
import OrdersTable from "@/components/admin/OrdersTable";
import { deviceLabel } from "@/components/admin/ui";
import { PAGE_SIZE, STATUSES, getStatusCounts, listOrders } from "@/lib/orders";
import { devices } from "@/lib/shop";

export const metadata: Metadata = { title: "Orders" };

type Search = { status?: string; q?: string; device?: string; page?: string };

function href(params: Search) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return `/admin/orders${s ? `?${s}` : ""}`;
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { status, q, device: deviceParam, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const device = devices.some((d) => d.id === deviceParam) ? deviceParam : undefined;
  const [{ rows, total }, counts] = await Promise.all([
    listOrders({ status, device, q: q?.trim() || undefined, page }),
    getStatusCounts(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="admin-head">
        <h1>Orders</h1>
        <span className="muted">
          {total} {total === 1 ? "result" : "results"}
        </span>
      </div>

      <nav className="tabs" aria-label="Filter by status">
        <Link href={href({ q, device })} aria-current={!status ? "page" : undefined}>
          All <span className="count">{counts.group([])}</span>
        </Link>
        {STATUSES.map((s) => (
          <Link key={s.id} href={href({ status: s.id, q, device })} aria-current={status === s.id ? "page" : undefined}>
            {s.label} <span className="count">{counts.counts[s.id] ?? 0}</span>
          </Link>
        ))}
      </nav>

      <form className="searchbar is-wide" action="/admin/orders" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Name, email, phone or order no."
          aria-label="Search orders"
        />
        <select name="device" defaultValue={device ?? ""} aria-label="Filter by device">
          <option value="">All devices</option>
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {deviceLabel(d.id)}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary">
          Filter
        </button>
      </form>

      <OrdersTable rows={rows} emptyText="No orders match this filter." />

      {pages > 1 && (
        <nav className="pager" aria-label="Pages">
          {page > 1 && <Link href={href({ status, q, device, page: String(page - 1) })}>Previous page</Link>}
          <span>
            Page {page} of {pages}
          </span>
          {page < pages && <Link href={href({ status, q, device, page: String(page + 1) })}>Next page</Link>}
        </nav>
      )}
    </>
  );
}
