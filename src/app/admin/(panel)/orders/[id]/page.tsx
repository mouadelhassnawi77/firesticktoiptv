import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { removeOrder, saveExpiry, saveNote, updateStatus } from "../../../actions";
import { STATUSES, getCustomerOrders, getOrder } from "@/lib/orders";
import {
  StatusBadge,
  deviceLabel,
  fmtCents,
  fmtDate,
  fmtDateCustomer,
  fmtDateTime,
  paymentLabel,
  productLabel,
  templates,
  waChat,
  waToCustomer,
} from "@/components/admin/ui";
import WaIcon from "@/components/admin/WaIcon";
import { market } from "@/lib/site";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Order ${(await params).id}` };
}

const isoDay = (v: Date | null) =>
  v ? new Intl.DateTimeFormat("sv-SE", { timeZone: market.timeZone }).format(new Date(v)) : "";

export default async function OrderDetail({ params }: Props) {
  const { id } = await params;
  const o = await getOrder(id);
  if (!o) notFound();
  const others = await getCustomerOrders(o.email, o.id);
  const price = fmtCents(o.price_cents);
  // Customer messages stay German: German price format and the German package name stored with the order
  const priceText = fmtCents(o.price_cents);

  const wa = {
    chat: waChat(o),
    payment: waToCustomer(o.phone, templates.payment(o.name, o.id, o.product_name, priceText)),
    access: waToCustomer(o.phone, templates.access(o.name, o.id)),
    renewal: o.expires_at ? waToCustomer(o.phone, templates.renewal(o.name, fmtDateCustomer(o.expires_at))) : null,
  };

  return (
    <>
      <p style={{ margin: "0 0 0.5rem" }}>
        <Link href="/admin/orders">All orders</Link>
      </p>
      <div className="admin-head">
        <h1>
          {o.id} <StatusBadge status={o.status} />
        </h1>
        <span className="muted">Received {fmtDateTime(o.created_at)}</span>
      </div>

      <div className="admin-grid is-detail">
        <section className="panel" aria-labelledby="customer">
          <h2 id="customer">Customer</h2>
          <dl className="facts">
            <dt>Name</dt>
            <dd>{o.name}</dd>
            <dt>Email</dt>
            <dd>
              <a href={`mailto:${o.email}`}>{o.email}</a>
            </dd>
            <dt>WhatsApp</dt>
            <dd>{o.phone ?? "–"}</dd>
            <dt>Device</dt>
            <dd>{deviceLabel(o.device)}</dd>
          </dl>
          <div className="link-row">
            {wa.chat && (
              <a className="wa-btn" href={wa.chat} target="_blank" rel="noopener">
                <WaIcon />
                <span>Open chat</span>
              </a>
            )}
            {wa.payment && (o.status === "neu" || o.status === "wartend") && o.payment !== "crypto" && (
              <a className="btn btn-primary" href={wa.payment} target="_blank" rel="noopener">
                Send payment link
              </a>
            )}
            {wa.access && (
              <a className="btn btn-ghost" href={wa.access} target="_blank" rel="noopener">
                Send login details
              </a>
            )}
            {wa.renewal && (
              <a className="btn btn-ghost" href={wa.renewal} target="_blank" rel="noopener">
                Offer renewal
              </a>
            )}
            {!o.phone && <span className="muted">No WhatsApp number given. Reply in the customer&apos;s WhatsApp chat.</span>}
          </div>
          <p className="muted" style={{ margin: "0.6rem 0 0", fontSize: "0.8125rem" }}>
            WhatsApp templates are written in German for the customer.
          </p>
        </section>

        <section className="panel" aria-labelledby="order">
          <h2 id="order">Order</h2>
          <dl className="facts">
            <dt>Package</dt>
            <dd>{productLabel(o.product_id, o.product_name)}</dd>
            <dt>Price</dt>
            <dd>{price}</dd>
            <dt>Payment</dt>
            <dd>{paymentLabel(o.payment)}</dd>
            {o.payment === "crypto" && (
              <>
                <dt>Crypto</dt>
                <dd>{o.crypto_amount ? `${o.crypto_amount} (${o.crypto_coin})` : "Not reported yet"}</dd>
                <dt>TXID</dt>
                <dd>{o.txid ?? "–"}</dd>
              </>
            )}
            <dt>Paid at</dt>
            <dd>{fmtDateTime(o.paid_at)}</dd>
            <dt>Activated at</dt>
            <dd>{fmtDateTime(o.activated_at)}</dd>
            <dt>Expires</dt>
            <dd>{fmtDate(o.expires_at)}</dd>
          </dl>
        </section>

        <section className="panel" aria-labelledby="status">
          <h2 id="status">Change status</h2>
          <form action={updateStatus} className="admin-form">
            <input type="hidden" name="id" value={o.id} />
            <select name="status" defaultValue={o.status} aria-label="Status">
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-primary">
              Save
            </button>
          </form>
          <p className="muted" style={{ margin: "0.6rem 0 0" }}>
            &ldquo;On hold&rdquo; means payment reported, please check it. &ldquo;Paid&rdquo; counts as revenue.
            &ldquo;Active&rdquo; starts the subscription ({o.months ? `${o.months} months` : `${o.hours ?? 24} hours`}) now.
          </p>

          <h2 style={{ marginTop: "1.25rem" }}>Change expiry date</h2>
          <form action={saveExpiry} className="admin-form">
            <input type="hidden" name="id" value={o.id} />
            <input type="date" name="expires" defaultValue={isoDay(o.expires_at)} aria-label="Expiry date" required />
            <button type="submit" className="btn btn-ghost">
              Save date
            </button>
          </form>
        </section>

        <section className="panel" aria-labelledby="note">
          <h2 id="note">Internal note</h2>
          <form action={saveNote} className="admin-form">
            <input type="hidden" name="id" value={o.id} />
            <textarea name="note" defaultValue={o.note ?? ""} placeholder="E.g. username, server, special requests" />
            <button type="submit" className="btn btn-ghost">
              Save note
            </button>
          </form>
        </section>
      </div>

      {others.length > 0 && (
        <section className="panel" aria-labelledby="other-orders" style={{ marginBottom: "1rem" }}>
          <h2 id="other-orders">Other orders from this customer</h2>
          <ul className="simple-list">
            {others.map((x) => (
              <li key={x.id}>
                <span>
                  <Link href={`/admin/orders/${x.id}`}>{x.id}</Link> {productLabel(x.product_id, x.product_name)},{" "}
                  {fmtDate(x.created_at)}
                </span>
                <StatusBadge status={x.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel danger" aria-labelledby="delete">
        <h2 id="delete">Delete order</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          For example when the customer asks for their data to be deleted. This cannot be undone.
        </p>
        <form action={removeOrder} className="admin-form">
          <input type="hidden" name="id" value={o.id} />
          <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexBasis: "100%" }}>
            <input type="checkbox" name="confirm" value="ja" required style={{ flex: "none", minHeight: 0 }} />
            Yes, permanently delete {o.id}
          </label>
          <button type="submit" className="btn btn-ghost">
            Delete
          </button>
        </form>
      </section>
    </>
  );
}
