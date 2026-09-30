"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  deviceLabel,
  devices,
  getProduct,
  isFree,
  newOrderId,
  ORDER_KEY,
  paymentLabel,
  paymentMethods,
  productLabel,
  type Order,
  type PaymentId,
  type Product,
} from "@/lib/shop";
import { formatPrice, market, site, whatsappLink } from "@/lib/site";
import PageLink from "@/components/PageLink";
import { track } from "@/lib/track";

type OpenArgs = { productId: string; device?: string };
const OrderContext = createContext<(args: OpenArgs) => void>(() => {});
export const useOrder = () => useContext(OrderContext);

/** Provides the order popup once for the whole page. */
export default function OrderProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<OpenArgs | null>(null);
  const open = useCallback((args: OpenArgs) => setRequest({ ...args }), []);
  return (
    <OrderContext.Provider value={open}>
      {children}
      <OrderDialog request={request} onClose={() => setRequest(null)} />
    </OrderContext.Provider>
  );
}

export function whatsappOrderText(order: Order, product: Product, extra: string[] = []) {
  const free = isFree(product);
  return [
    free
      ? `Hi ${site.supportName}, I'd like the free ${product.hours}-hour IPTV trial.`
      : `Hi ${site.supportName}, I'd like to buy an IPTV subscription.`,
    "",
    `Plan: ${product.name}${free ? "" : ` (${formatPrice(product.price)})`}`,
    `Device: ${deviceLabel(order.device)}`,
    ...(free ? [] : [`Payment: ${paymentLabel(order.payment)}`]),
    `Name: ${order.name}`,
    `Email: ${order.email}`,
    ...(order.phone ? [`WhatsApp: ${order.phone}`] : []),
    `Order no.: ${order.id}`,
    ...extra,
  ].join("\n");
}

/** Sends data to the server without waiting for the reply (survives a page change). */
export function beacon(url: string, payload: object) {
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon?.(url, new Blob([body], { type: "application/json" }))) return;
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
}

/** Opens WhatsApp in a new tab; if the browser blocks that, in the same tab. */
export function openWhatsapp(url: string) {
  const w = window.open(url, "_blank");
  if (w) w.opener = null;
  else window.location.href = url;
}

function OrderDialog({ request, onClose }: { request: OpenArgs | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const product = request ? getProduct(request.productId) : undefined;
  const [payment, setPayment] = useState<PaymentId | "">("");
  const [sentUrl, setSentUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (product && !dialog.open) {
      setPayment("");
      setSentUrl(null);
      setBusy(false);
      dialog.showModal();
      track("begin_checkout", {
        currency: market.currency,
        value: product.price,
        items: [{ item_id: product.id, item_name: product.name, price: product.price, quantity: 1 }],
      });
    }
    if (!product && dialog.open) dialog.close();
  }, [product]);

  if (!product) return <dialog ref={ref} className="order-dialog" onClose={onClose} />;

  const free = isFree(product);
  const hint = paymentMethods.find((m) => m.id === payment)?.hint;
  const submitLabel = busy
    ? "Preparing …"
    : free
      ? "Get my free trial on WhatsApp"
      : payment === "crypto"
        ? `Continue to crypto payment (${formatPrice(product.price)})`
        : payment
          ? `Order on WhatsApp (${formatPrice(product.price)})`
          : `Continue (${formatPrice(product.price)})`;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!product || busy) return;
    const data = new FormData(e.currentTarget);
    const order: Order = {
      id: newOrderId(),
      productId: product.id,
      device: String(data.get("device")),
      payment: (free ? "none" : String(data.get("payment"))) as PaymentId,
      name: String(data.get("name")).trim(),
      email: String(data.get("email")).trim(),
      phone: String(data.get("phone") ?? "").trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    track("generate_lead", {
      currency: market.currency,
      value: product.price,
      lead_source: order.payment,
      items: [{ item_id: product.id, item_name: product.name, price: product.price, quantity: 1 }],
    });

    // Save for the admin dashboard. The price is set on the server from the plan.
    const payload = {
      id: order.id,
      productId: order.productId,
      device: order.device,
      payment: order.payment,
      name: order.name,
      email: order.email,
      phone: order.phone,
      website: String(data.get("website") ?? ""),
    };

    if (order.payment === "crypto") {
      setBusy(true);
      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const json = (await res.json()) as { token?: string };
          if (json.token) order.token = json.token;
        }
      } catch {
        /* Server unreachable: the order still continues via checkout and WhatsApp */
      }
      sessionStorage.setItem(ORDER_KEY, JSON.stringify(order));
      ref.current?.close();
      router.push("/checkout");
      return;
    }

    beacon("/api/orders", payload);
    const url = whatsappLink(whatsappOrderText(order, product));
    openWhatsapp(url);
    setSentUrl(url);
  }

  return (
    <dialog
      ref={ref}
      className="order-dialog"
      aria-labelledby="order-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close(); // click on the backdrop
      }}
    >
      <div className="order-inner">
        <button type="button" className="order-close" aria-label="Close" onClick={() => ref.current?.close()}>
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <p className="order-kicker">{free ? "Free trial" : product.popular ? "Best value" : "Your order"}</p>
        <h2 id="order-title">{productLabel(product)}</h2>
        <p className="order-sum">
          {free ? (
            <>
              {product.hours} hours of full access on {site.connections} device. <strong>Free</strong>, no card, ends on
              its own.
            </>
          ) : (
            <>
              {product.name} on {site.connections} device. Total <strong>{formatPrice(product.price)}</strong>, one-time,
              no automatic renewal.
            </>
          )}
        </p>

        {sentUrl ? (
          <div className="order-done" role="status">
            <h3>WhatsApp is open</h3>
            <p>
              {free
                ? "Send the prepared message. We reply with your trial login and setup steps for your device."
                : "Send the prepared message. We reply with your payment link, then send your login details."}
            </p>
            <p>
              Nothing happened?{" "}
              <a href={sentUrl} target="_blank" rel="noopener">
                Open WhatsApp again
              </a>
            </p>
            <button type="button" className="btn btn-ghost" onClick={() => ref.current?.close()}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} key={`${product.id}-${request?.device ?? ""}`}>
            <div className="field-row">
              <div className="field">
                <label htmlFor="order-name">Name</label>
                <input id="order-name" name="name" type="text" autoComplete="name" required placeholder="John Smith" />
              </div>
              <div className="field">
                <label htmlFor="order-email">Email for your login</label>
                <input id="order-email" name="email" type="email" autoComplete="email" required placeholder="john@example.com" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="order-phone">WhatsApp number</label>
              <input
                id="order-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                inputMode="tel"
                pattern="[+0-9 ()/-]{8,}"
                title={`Enter your WhatsApp number with country code, e.g. ${market.phoneExample}`}
                placeholder={market.phoneExample}
              />
            </div>

            <fieldset className="choices">
              <legend>Which device will you watch on?</legend>
              <div className="choice-grid">
                {devices.map((d) => (
                  <label key={d.id} className="choice">
                    <input type="radio" name="device" value={d.id} required defaultChecked={request?.device === d.id} />
                    <span>{d.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {!free && (
            <fieldset className="choices">
              <legend>How would you like to pay?</legend>
              <div className="choice-grid is-3">
                {paymentMethods.map((m) => (
                  <label key={m.id} className="choice">
                    <input
                      type="radio"
                      name="payment"
                      value={m.id}
                      required
                      onChange={() => setPayment(m.id)}
                    />
                    <span>{m.label}</span>
                  </label>
                ))}
              </div>
              <p className="choice-hint" aria-live="polite">
                {hint ?? "Choose a payment method."}
              </p>
            </fieldset>
            )}

            {/* Honeypot against spam bots: invisible to humans */}
            <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
              <label>
                Website
                <input name="website" type="text" tabIndex={-1} autoComplete="off" />
              </label>
            </div>

            <button type="submit" className="btn btn-primary order-submit" disabled={busy} aria-busy={busy}>
              {submitLabel}
            </button>
            <p className="order-foot">
              We only use your details for your order. See our <PageLink to="privacy">privacy policy</PageLink>.
            </p>
          </form>
        )}
      </div>
    </dialog>
  );
}
