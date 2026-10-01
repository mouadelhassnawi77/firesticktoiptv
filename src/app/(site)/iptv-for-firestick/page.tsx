import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import FaqList from "@/components/FaqList";
import CtaBand from "@/components/CtaBand";
import JsonLd from "@/components/JsonLd";
import PageLink from "@/components/PageLink";
import OrderButton from "@/components/order/OrderButton";
import type { Faq } from "@/lib/faqs";
import { site, formatPrice, routes } from "@/lib/site";
import { trial, lowestMonthly, plans } from "@/lib/shop";
import { faqSchema, productSchema } from "@/lib/seo";
import { seoMetadata } from "@/lib/seo-meta";

/*
 * Silo pillar (P04) – Firestick silo. Links DOWN to every Firestick guide, UP to home, ACROSS to trial/pricing.
 *   primary:   "iptv for firestick"
 *   secondary: "best iptv service for firestick", "best iptv service firestick", "best iptv on firestick",
 *              "iptv service providers for firestick", "iptv services for firestick", "iptv providers for firestick",
 *              "iptv streaming service(s) for firestick", "best iptv streaming service for firestick",
 *              "best iptv services for firestick"
 * Summaries only for install / apps / troubleshooting: the full answers live in the child guides.
 */

const path = routes.firestick.href;
const FIRESTICK = "fire-tv-stick";

// Title, description and focus keyword: lib/seo-pages.ts, editable in Admin → SEO
export const generateMetadata = seoMetadata("firestick");

const models = [
  { name: "Fire TV Stick 4K Max", note: "Best choice. Fastest processor and Wi-Fi 6E, smooth in 4K." },
  { name: "Fire TV Stick 4K", note: "Great for 4K channels on a 4K TV." },
  { name: "Fire TV Cube", note: "The most powerful Fire TV device, ideal with a wired connection." },
  { name: "Fire TV Stick (3rd gen) & Lite", note: "Works well in HD. No 4K." },
  { name: "Fire TV Smart TVs", note: "TVs with Fire TV built in (Insignia, Toshiba, Amazon Omni) work the same way." },
];

const checks = [
  {
    title: "Stable at peak time",
    text: "The best IPTV service for Firestick is the one that doesn't freeze when the game kicks off. Test during prime time, never just in the afternoon.",
  },
  {
    title: "US channels you watch",
    text: "Local stations, the big networks and every major sports league. Not 40,000 channels you'll never open.",
  },
  {
    title: "Works with the popular Firestick apps",
    text: "Your login should work in IPTV Smarters Pro, TiviMate and other common players, so you're not locked into one app.",
  },
  {
    title: "Setup help",
    text: "Sideloading an app on a Fire TV Stick is new for most people. A good provider walks you through it.",
  },
  {
    title: "Honest terms",
    text: "A free trial, a refund window and no automatic renewal. If a provider has none of these, keep looking.",
  },
];

const fireFaqs: Faq[] = [
  {
    q: "Does IPTV work on every Firestick?",
    a: "Yes. It works on every current Fire TV Stick, the Fire TV Stick 4K and 4K Max, the Fire TV Cube and TVs with Fire TV built in. For 4K channels you need a 4K model and a 4K TV.",
  },
  {
    q: "Which app should I use for IPTV on Firestick?",
    a: "IPTV Smarters Pro is the easiest to start with. TiviMate is a favorite for its TV guide. Your login works in both, and we tell you which one fits your needs when we send it.",
  },
  {
    q: "Is it hard to set up IPTV on a Fire TV Stick?",
    a: "No. It takes about 10 minutes: allow apps from unknown sources, install the Downloader app, install the player, then sign in. We help you on WhatsApp if you get stuck.",
  },
  {
    q: "Why does IPTV buffer on my Firestick?",
    a: `Usually it's the connection or the device memory. You need at least ${site.minSpeedMbps} Mbps. Use 5 GHz Wi-Fi or an Ethernet adapter, clear the app cache and restart the stick. Older Lite models can also struggle with heavy channels.`,
  },
  {
    q: "Can I use one subscription on two Firesticks?",
    a: `You can install it on both, but only ${site.connections} can play at the same time on one plan.`,
  },
  {
    q: "Can I try IPTV on my Firestick for free?",
    a: `Yes. Request the free ${trial.hours}-hour trial, choose Amazon Firestick / Fire TV as your device, and we send your login with setup steps.`,
  },
];

export default function FirestickPage() {
  return (
    <>
      <div className="wrap">
        <div className="page-head">
          <Breadcrumbs items={[{ name: "IPTV for Firestick", path }]} />
          <h1>IPTV for Firestick: Live TV on Your Fire TV Stick</h1>
          <p className="lead">
            Turn your Fire TV Stick into a full cable replacement. Our IPTV for Firestick gives you {site.channelCount}{" "}
            live channels, from football to fight nights, in HD and 4K, set up in about 10 minutes.
          </p>
          <div className="hero-actions">
            <OrderButton productId={trial.id} device={FIRESTICK} className="btn btn-primary btn-large">
              Try it free on your Firestick
            </OrderButton>
            <Link href={routes.pricing.href} className="btn btn-ghost">
              See plans from {formatPrice(lowestMonthly)}/mo
            </Link>
          </div>
          <p className="hero-note">
            Free {trial.hours}-hour trial · No auto-renewal · {site.refundDays}-day refund
          </p>
        </div>
      </div>

      <section className="section" aria-labelledby="why">
        <div className="wrap split">
          <div>
            <h2 id="why">Why the Firestick is the best device for IPTV</h2>
          </div>
          <div className="prose">
            <p>
              Most of our customers watch on an Amazon Fire TV Stick, and for good reason. It costs less than one month
              of cable, plugs into any TV with an HDMI port, and runs every popular IPTV player. You can move it from
              the living room to the bedroom or take it on a trip, and your channels come with you.
            </p>
            <p>
              Unlike a Smart TV app store, the Firestick lets you install the IPTV player you prefer. That&apos;s why
              the best IPTV services for Firestick all support it first. The remote with voice search and the simple
              home screen make it easy for the whole family, not just the person who set it up.
            </p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="models">
        <div className="wrap">
          <div className="section-intro">
            <h2 id="models">Which Fire TV devices work</h2>
            <p>Every current Fire TV device works. For 4K channels, pick a 4K model.</p>
          </div>
          <ul className="channel-grid">
            {models.map((m) => (
              <li key={m.name}>
                <h3>{m.name}</h3>
                <p>{m.note}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="start">
        <div className="wrap">
          <div className="section-intro">
            <h2 id="start">Getting started on your Fire TV Stick</h2>
            <p>
              The whole setup takes about 10 minutes. Here&apos;s the short version. Our{" "}
              <PageLink to="install">step-by-step install guide</PageLink> has every screen explained.
            </p>
          </div>
          <ol className="steps is-row">
            <li>
              <h3>Allow unknown apps</h3>
              <p>Turn on developer options in Settings, then allow apps from unknown sources for the Downloader app.</p>
            </li>
            <li>
              <h3>Install a player</h3>
              <p>
                Use Downloader to install an IPTV player. Most people start with{" "}
                <PageLink to="smarters">IPTV Smarters Pro</PageLink>.
              </p>
            </li>
            <li>
              <h3>Sign in and watch</h3>
              <p>Enter the login we send you on WhatsApp. Your channels, TV guide and movies load automatically.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="section" aria-labelledby="apps">
        <div className="wrap split">
          <div>
            <h2 id="apps">The best IPTV apps for Firestick</h2>
            <p className="muted">
              Your subscription isn&apos;t tied to one app. Compare them all in our guide to the{" "}
              <PageLink to="apps">best IPTV apps for Firestick</PageLink>.
            </p>
          </div>
          <ul className="feature-list">
            <li>
              <h3>IPTV Smarters Pro</h3>
              <p>Free, simple and the most popular choice. Live TV, movies and series in one clean menu.</p>
            </li>
            <li>
              <h3>TiviMate</h3>
              <p>A cable-style TV guide, favorites and recording. The favorite of heavy live-TV watchers.</p>
            </li>
            <li>
              <h3>Other players</h3>
              <p>Most apps that accept an Xtream Codes login or M3U playlist work with your subscription.</p>
            </li>
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="choose">
        <div className="wrap split">
          <div>
            <h2 id="choose">How to pick the best IPTV service for Firestick</h2>
            <p className="muted">
              There are hundreds of IPTV providers for Firestick. Five things separate the good ones from the rest.
            </p>
          </div>
          <ul className="feature-list">
            {checks.map((c) => (
              <li key={c.title}>
                <h3>{c.title}</h3>
                <p>{c.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="smooth">
        <div className="wrap">
          <div className="prose">
            <h2 id="smooth">Smooth streaming on a Firestick</h2>
            <p>A few settings make a big difference, especially on older sticks:</p>
            <ul>
              <li>
                Keep at least <strong>{site.minSpeedMbps} Mbps</strong>. Run the speed test on the Firestick itself,
                not on your phone.
              </li>
              <li>Use 5 GHz Wi-Fi, or an Amazon Ethernet adapter for the most stable picture.</li>
              <li>Clear the player&apos;s cache now and then, and uninstall apps you don&apos;t use.</li>
              <li>Restart the stick once a week: hold Select and Play for five seconds.</li>
            </ul>
            <p>
              Still buffering or getting a login error? See our fixes for{" "}
              <PageLink to="notWorking">IPTV not working on Firestick</PageLink>.
            </p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="price">
        <div className="wrap">
          <div className="section-intro">
            <h2 id="price">What IPTV for Firestick costs</h2>
            <p>
              One login works on your Firestick and every other device you own, {site.connections} stream at a time.
              Plans start at {formatPrice(plans[0].price)} for a month. The yearly plan is{" "}
              {formatPrice(plans[plans.length - 1].price)}, just {formatPrice(lowestMonthly)} a month. See all{" "}
              <Link href={routes.pricing.href}>subscription plans</Link>.
            </p>
          </div>
          <div className="hero-actions">
            <OrderButton productId={trial.id} device={FIRESTICK} className="btn btn-primary">
              Start {trial.hours}-hour free trial
            </OrderButton>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="faq">
        <div className="wrap split">
          <div>
            <h2 id="faq">IPTV on Firestick: questions</h2>
          </div>
          <FaqList items={fireFaqs} />
        </div>
      </section>

      <CtaBand device={FIRESTICK} title="Test it on your Fire TV Stick tonight" />

      <JsonLd data={[productSchema(), faqSchema(fireFaqs)]} />
    </>
  );
}
