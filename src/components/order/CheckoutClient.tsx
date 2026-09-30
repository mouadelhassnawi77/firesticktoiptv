"use client";

import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import {
  cryptoWallets,
  deviceLabel,
  getProduct,
  ORDER_KEY,
  productLabel,
  type Order,
  type WalletId,
} from "@/lib/shop";
import { formatPrice, market, routes, whatsappLink } from "@/lib/site";
import PageLink from "@/components/PageLink";
import { beacon, openWhatsapp, whatsappOrderText } from "./OrderProvider";

type Status = "loading" | "missing" | "review" | "pay" | "sent";
type Rates = Partial<Record<string, number>>; // coingeckoId -> price in the market currency

const ceilTo = (value: number, decimals: number) => {
  const f = 10 ** decimals;
  return Math.ceil(value * f) / f;
};

export default function CheckoutClient() {
  const [status, setStatus] = useState<Status>("loading");
  const [order, setOrder] = useState<Order | null>(null);
  const [walletId, setWalletId] = useState<WalletId>(
    (cryptoWallets.find((w) => w.address) ?? cryptoWallets[0]).id
  );
  const [rates, setRates] = useState<Rates | null>(null);
  const [rateError, setRateError] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [txid, setTxid] = useState("");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  // Load the order from the popup (lives only in this tab's sessionStorage)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(ORDER_KEY);
      const parsed = raw ? (JSON.parse(raw) as Order) : null;
      if (parsed && getProduct(parsed.productId)) {
        setOrder(parsed);
        setStatus("review");
      } else setStatus("missing");
    } catch {
      setStatus("missing");
    }
  }, []);

  // Live rate in the market currency (CoinGecko, no API key)
  useEffect(() => {
    const ids = [...new Set(cryptoWallets.map((w) => w.coingeckoId))].join(",");
    const ctrl = new AbortController();
    const cur = market.currency.toLowerCase();
    fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${cur}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: Record<string, Record<string, number>>) => {
        const next: Rates = {};
        for (const [id, v] of Object.entries(data)) next[id] = v[cur];
        setRates(next);
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setRateError(true);
      });
    return () => ctrl.abort();
  }, []);

  const product = order ? getProduct(order.productId) : undefined;
  const wallet = cryptoWallets.find((w) => w.id === walletId)!;
  const rate = rates?.[wallet.coingeckoId];
  const amount = product && rate ? ceilTo(product.price / rate, wallet.decimals) : null;
  const amountText = amount !== null ? `${amount.toFixed(wallet.decimals)} ${wallet.symbol}` : null;

  useEffect(() => {
    if (!wallet.address) return setQr("");
    QRCode.toString(wallet.address, {
      type: "svg",
      margin: 0,
      errorCorrectionLevel: "M",
      color: { dark: "#13233a", light: "#ffffff" },
    }).then(setQr, () => setQr(""));
  }, [wallet.address]);

  const confirmUrl = useMemo(() => {
    if (!order || !product) return "";
    const extra = wallet.address
      ? [
          "",
          `Crypto: ${amountText ?? `worth ${formatPrice(product.price)}`} via ${wallet.network}`,
          `Sent to: ${wallet.address}`,
          `TXID: ${txid.trim() || "to follow"}`,
        ]
      : ["", `I'd like to pay with ${wallet.label}. Please send me the payment details.`];
    return whatsappLink(whatsappOrderText(order, product, extra));
  }, [order, product, wallet, amountText, txid]);

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* Clipboard unavailable: the text is selectable */
    }
  }

  if (status === "loading") return <p className="muted">Loading your order …</p>;

  if (status === "missing" || !order || !product) {
    return (
      <div className="box" style={{ maxWidth: "36rem" }}>
        <h2 style={{ fontSize: "var(--step-2)" }}>No open order</h2>
        <p>Pick a plan first and choose “Crypto” as the payment method. You'll land back here after that.</p>
        <Link href={routes.pricing.live ? routes.pricing.href : "/#pricing"} className="btn btn-primary">
          See plans
        </Link>
      </div>
    );
  }

  return (
    <div className="checkout-grid">
      <div>
        {status === "review" && (
          <section aria-labelledby="coin">
            <fieldset className="choices">
              <legend id="coin">Which coin would you like to pay with?</legend>
              <div className="choice-grid">
                {cryptoWallets.map((w) => (
                  <label key={w.id} className="choice">
                    <input
                      type="radio"
                      name="coin"
                      value={w.id}
                      checked={walletId === w.id}
                      onChange={() => setWalletId(w.id)}
                    />
                    <span>{w.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="check-row">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
              <span>
                I agree to the <PageLink to="terms">Terms of Service</PageLink> and have read the{" "}
                <PageLink to="refund">Refund Policy</PageLink> and <PageLink to="privacy">Privacy Policy</PageLink>.
              </span>
            </label>

            <button
              type="button"
              className="btn btn-primary order-submit"
              disabled={!accepted}
              aria-disabled={!accepted}
              style={!accepted ? { opacity: 0.55, cursor: "not-allowed" } : undefined}
              onClick={() => {
                setStatus("pay");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Place order ({formatPrice(product.price)})
            </button>
            <p className="order-foot" style={{ textAlign: "left" }}>
              Next you'll see the wallet address and the exact amount.
            </p>
          </section>
        )}

        {status === "pay" && (
          <section className="pay-box" aria-labelledby="pay-title">
            <h2 id="pay-title" style={{ fontSize: "var(--step-2)" }}>
              Send {wallet.symbol}
            </h2>

            {!wallet.address ? (
              <>
                <p className="warn">
                  Paying with {wallet.label} isn't available right now. Send us your order on WhatsApp and we'll
                  send you the payment details directly.
                </p>
                <button type="button" className="btn btn-primary" onClick={() => { openWhatsapp(confirmUrl); setStatus("sent"); }}>
                  Send order on WhatsApp
                </button>
              </>
            ) : (
              <>
                <div className="pay-grid">
                  <div className="qr" aria-label={`QR code of the ${wallet.label} address`} role="img" dangerouslySetInnerHTML={{ __html: qr }} />
                  <div>
                    <p className="pay-label">Amount</p>
                    <div className="copy-field">
                      <code>{amountText ?? (rateError ? `worth ${formatPrice(product.price)}` : "Loading rate …")}</code>
                      {amountText && (
                        <button type="button" className="btn btn-ghost btn-small" onClick={() => copy(String(amount!.toFixed(wallet.decimals)), "amount")}>
                          {copied === "amount" ? "Copied" : "Copy"}
                        </button>
                      )}
                    </div>
                    <p className="pay-label">Address on the {wallet.network} network</p>
                    <div className="copy-field">
                      <code>{wallet.address}</code>
                      <button type="button" className="btn btn-ghost btn-small" onClick={() => copy(wallet.address, "address")}>
                        {copied === "address" ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>

                <p className="warn">
                  Only send {wallet.symbol} on the <strong>{wallet.network}</strong> network. Payments on any other
                  network will be lost. {rate && <>Rate: 1 {wallet.symbol} = {formatPrice(rate)}.</>}
                </p>

                <div className="field" style={{ marginTop: "1.25rem" }}>
                  <label htmlFor="txid">
                    Transaction ID (TXID) <span className="muted">(optional, speeds up activation)</span>
                  </label>
                  <input id="txid" type="text" value={txid} onChange={(e) => setTxid(e.target.value)} autoComplete="off" spellCheck={false} />
                </div>
                <button
                  type="button"
                  className="btn btn-primary order-submit"
                  onClick={() => {
                    if (order.token) {
                      beacon(`/api/orders/${order.id}/crypto`, {
                        token: order.token,
                        coin: wallet.label,
                        amount: amountText ?? `worth ${formatPrice(product.price)}`,
                        txid,
                      });
                    }
                    openWhatsapp(confirmUrl);
                    setStatus("sent");
                  }}
                >
                  I've paid: confirm on WhatsApp
                </button>
              </>
            )}
          </section>
        )}

        {status === "sent" && (
          <section className="pay-box" role="status">
            <h2 style={{ fontSize: "var(--step-2)" }}>Thanks for your order</h2>
            <p>
              WhatsApp is open. Send the message. Once the payment is confirmed, you get your login details at{" "}
              <strong>{order.email}</strong> and on WhatsApp.
            </p>
            <p>
              Nothing happened?{" "}
              <a href={confirmUrl} target="_blank" rel="noopener">
                Open WhatsApp again
              </a>
            </p>
            {order.device === "fire-tv-stick" && (
              <PageLink to="install">See how to set up IPTV on your Firestick</PageLink>
            )}
          </section>
        )}
      </div>

      <aside className="box summary" aria-label="Order summary">
        <h2 style={{ fontSize: "var(--step-1)" }}>Your order</h2>
        <dl>
          <dt>Plan</dt>
          <dd>{productLabel(product)}</dd>
          <dt>Device</dt>
          <dd>{deviceLabel(order.device)}</dd>
          <dt>Email</dt>
          <dd>{order.email}</dd>
          <dt>Order no.</dt>
          <dd>{order.id}</dd>
        </dl>
        <p className="total">
          <span>Total</span>
          <span className="tabular">{formatPrice(product.price)}</span>
        </p>
        <p className="meta-line">One-time payment, no automatic renewal.</p>
        {status === "review" && (
          <p className="meta-line" style={{ marginTop: "0.5rem" }}>
            <Link href={routes.pricing.live ? routes.pricing.href : "/#pricing"}>Change plan</Link>
          </p>
        )}
      </aside>
    </div>
  );
}
