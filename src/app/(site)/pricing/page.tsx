import Breadcrumbs from "@/components/Breadcrumbs";
import Pricing from "@/components/Pricing";
import FaqList from "@/components/FaqList";
import CtaBand from "@/components/CtaBand";
import JsonLd from "@/components/JsonLd";
import PageLink from "@/components/PageLink";
import type { Faq } from "@/lib/faqs";
import { site, formatPrice, routes } from "@/lib/site";
import { plans, trial, popularPlan, monthly, savingsPercent, lowestMonthly } from "@/lib/shop";
import { productSchema, faqSchema } from "@/lib/seo";
import { seoMetadata } from "@/lib/seo-meta";

/*
 * Keyword owner (silo plan, P03):
 *   primary:   "iptv every month subscribe" (monthly IPTV subscription)
 *   secondary: "subscribe iptv", "iptv smarters pro subscription", "iptv premium"
 * Do NOT target here: "iptv service" (→ /), "iptv free trial" (→ /iptv-free-trial), "best iptv" (→ /best-iptv-service).
 */

const path = routes.pricing.href;
const first = plans[0];
const last = plans[plans.length - 1];

// Title, description and focus keyword: lib/seo-pages.ts, editable in Admin → SEO
export const generateMetadata = seoMetadata("pricing");

const pricingFaqs: Faq[] = [
  {
    q: "Can I subscribe to IPTV every month?",
    a: `Yes. The 1-month plan costs ${formatPrice(first.price)} and ends after 30 days. It doesn't renew by itself, so you simply buy another month whenever you want to keep watching.`,
  },
  {
    q: "Which plan is the best value?",
    a: `The ${popularPlan.name} plan at ${formatPrice(popularPlan.price)}. That's ${formatPrice(monthly(popularPlan))} a month, ${savingsPercent(popularPlan)}% less than paying month to month. All plans include exactly the same channels and quality.`,
  },
  {
    q: "Does my subscription work with IPTV Smarters Pro?",
    a: "Yes. Your login works in IPTV Smarters Pro, TiviMate, IPTV Smarters Player Lite and most other popular players. We send you the details in the format your app needs.",
  },
  {
    q: "Can I switch to a longer plan later?",
    a: "Yes. When your plan is about to end, just pick a longer one. We extend the same login, so you don't have to set up your device again.",
  },
  {
    q: "What if it doesn't work for me?",
    a: `Ask for a refund within ${site.refundDays} days of your purchase, on WhatsApp. See the refund policy for the details.`,
  },
  {
    q: "Are there any extra fees?",
    a: "No. The price you see is the total. No setup fee, no hidden charges, no automatic renewal.",
  },
];

export default function PricingPage() {
  return (
    <>
      <div className="wrap">
        <div className="page-head">
          <Breadcrumbs items={[{ name: "Pricing", path }]} />
          <h1>IPTV Subscription Plans and Prices</h1>
          <p className="lead">
            Subscribe to IPTV every month for {formatPrice(first.price)}, or pay once for 3, 6 or 12 months and save up
            to {savingsPercent(last)}%. Every plan includes all {site.channelCount} channels. Nothing renews
            automatically.
          </p>
        </div>
      </div>

      <section className="section" aria-label="Plans" style={{ borderTop: 0, paddingTop: 0 }}>
        <div className="wrap">
          <Pricing headingLevel={2} />
        </div>
      </section>

      <section className="section" aria-labelledby="compare">
        <div className="wrap">
          <div className="section-intro">
            <h2 id="compare">Monthly or longer? Compare the plans</h2>
            <p>
              Same channels, same quality, same support on every plan. The only difference is how much you pay per
              month.
            </p>
          </div>
          <div className="table-wrap">
            <table className="compare">
              <thead>
                <tr>
                  <th scope="col">Plan</th>
                  <th scope="col">You pay</th>
                  <th scope="col">Per month</th>
                  <th scope="col">You save</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id} className={p.popular ? "is-current" : undefined}>
                    <th scope="row">{p.name}</th>
                    <td>{formatPrice(p.price)}</td>
                    <td>{formatPrice(monthly(p))}</td>
                    <td>{savingsPercent(p) > 0 ? `${savingsPercent(p)}%` : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted">
            Not sure yet? Start with the{" "}
            <PageLink to="freeTrial">{`free ${trial.hours}-hour IPTV trial`}</PageLink>, then choose.
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="premium">
        <div className="wrap">
          <div className="prose">
            <h2 id="premium">Premium IPTV without premium cable prices</h2>
            <p>
              A cable or satellite package with sports and premium movie channels easily runs over $100 a month. Our
              IPTV premium plans give you {site.channelCount} channels, including every major US sport, for{" "}
              {formatPrice(first.price)} a month, or {formatPrice(lowestMonthly)} a month on the yearly plan.
            </p>
            <ul>
              <li>HD, Full HD and 4K streams where the channel broadcasts in 4K</li>
              <li>TV guide (EPG) and catch-up on many channels</li>
              <li>Movies and series on demand</li>
              <li>Setup help and support on WhatsApp</li>
              <li>
                {site.connections} device at a time, with at least {site.minSpeedMbps} Mbps for smooth streaming
              </li>
            </ul>

            <h2 id="smarters">Need an IPTV Smarters Pro subscription?</h2>
            <p>
              IPTV Smarters Pro is only a player: it doesn&apos;t come with channels. You need a subscription from an
              IPTV provider to fill it. Any of our plans works in IPTV Smarters Pro, and we send your login in the
              exact format the app asks for. Setting it up on a Fire TV Stick? Follow our{" "}
              <PageLink to="smarters">IPTV Smarters Pro on Firestick</PageLink> guide.
            </p>

            <h2 id="subscribe">How to subscribe</h2>
            <ol>
              <li>Choose your plan above and tap the button.</li>
              <li>Enter your name, email, WhatsApp number and device.</li>
              <li>
                Pick how to pay: crypto (BTC or USDT), credit or debit card, or PayPal. Crypto is paid on the site; for
                card and PayPal we send you a secure payment link on WhatsApp.
              </li>
              <li>We send your login and setup steps, usually within minutes of payment.</li>
            </ol>

            <h2 id="guarantee">No auto-renewal, {site.refundDays}-day refund</h2>
            <p>
              You pay once for the period you choose, and the plan simply ends. We remind you before it runs out. If the
              service doesn&apos;t work for you, or you change your mind, ask for a refund within {site.refundDays}{" "}
              days. Details in our <PageLink to="refund">refund policy</PageLink>.
            </p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="faq">
        <div className="wrap split">
          <div>
            <h2 id="faq">Subscription questions</h2>
            <p className="muted">Anything else? Message us on WhatsApp.</p>
          </div>
          <FaqList items={pricingFaqs} />
        </div>
      </section>

      <CtaBand />

      <JsonLd data={[productSchema(), faqSchema(pricingFaqs)]} />
    </>
  );
}
