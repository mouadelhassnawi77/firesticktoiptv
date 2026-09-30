import Link from "next/link";
import { STATUSES, type OrderRow } from "@/lib/orders";
import { updateStatus } from "@/app/admin/actions";
import StatusSelect from "./StatusSelect";
import WaIcon from "./WaIcon";
import { StatusBadge, deviceLabel, fmtCents, fmtDate, fmtDateTime, paymentShort, productLabel, waChat } from "./ui";

const statusOptions = STATUSES.map((s) => ({ id: s.id, label: s.label }));

/**
 * Orders table with row actions: WhatsApp chat with the customer, one-click "Paid"
 * for pending/on-hold orders, status dropdown that saves on change.
 */
export default function OrdersTable({ rows, emptyText }: { rows: OrderRow[]; emptyText?: string }) {
  if (rows.length === 0) {
    return (
      <div className="panel">
        <p className="empty">{emptyText ?? "No orders yet. They appear here as soon as someone orders in the popup."}</p>
      </div>
    );
  }
  return (
    <div className="table-scroll">
      <table className="orders">
        <thead>
          <tr>
            <th scope="col">Order</th>
            <th scope="col">Customer</th>
            <th scope="col">Device</th>
            <th scope="col">Package</th>
            <th scope="col" className="num">Price</th>
            <th scope="col">Status</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => {
            const wa = waChat(o);
            const open = o.status === "neu" || o.status === "wartend";
            return (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin/orders/${o.id}`}>{o.id}</Link>
                  <span className="sub">{fmtDateTime(o.created_at)}</span>
                </td>
                <td>
                  {o.name}
                  <span className="sub">{o.email}</span>
                  {o.phone && <span className="sub">{o.phone}</span>}
                </td>
                <td>
                  <span className="chip">{deviceLabel(o.device)}</span>
                </td>
                <td>
                  {productLabel(o.product_id, o.product_name)}
                  <span className="sub">
                    {paymentShort(o.payment)}
                    {o.txid ? ", TXID reported" : ""}
                    {o.expires_at ? `, until ${fmtDate(o.expires_at)}` : ""}
                  </span>
                </td>
                <td className="num">{fmtCents(o.price_cents)}</td>
                <td>
                  <StatusBadge status={o.status} />
                </td>
                <td>
                  <div className="row-actions">
                    {wa ? (
                      <a className="wa-btn" href={wa} target="_blank" rel="noopener" title={`WhatsApp chat with ${o.name}`}>
                        <WaIcon />
                        <span>WhatsApp</span>
                      </a>
                    ) : (
                      <a className="wa-btn is-mail" href={`mailto:${o.email}`} title="No phone number, send an email">
                        Email
                      </a>
                    )}
                    {open && (
                      <form action={updateStatus}>
                        <input type="hidden" name="id" value={o.id} />
                        <input type="hidden" name="status" value="bezahlt" />
                        <button type="submit" className="paid-btn" title="Mark as paid">
                          Paid
                        </button>
                      </form>
                    )}
                    <StatusSelect id={o.id} status={o.status} options={statusOptions} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
