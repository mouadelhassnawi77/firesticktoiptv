import Link from "next/link";
import Epg from "@/components/Epg";
import Pricing from "@/components/Pricing";
import FaqList from "@/components/FaqList";
import CtaBand from "@/components/CtaBand";
import JsonLd from "@/components/JsonLd";
import PageLink from "@/components/PageLink";
import OrderButton from "@/components/order/OrderButton";
import { faqs } from "@/lib/faqs";
import { site, formatPrice } from "@/lib/site";
import { lowestMonthly, trial, plans } from "@/lib/shop";
import { productSchema, faqSchema } from "@/lib/seo";
import { seoMetadata } from "@/lib/seo-meta";

/*
 * Homepage – keyword owner (see the silo plan):
 *   primary:   "iptv service"
 *   secondary: "iptv services", "iptv providers", "iptv usa", "iptv service provider(s)", "iptv streaming services"
 * Do NOT target here: "best iptv…" (→ /best-iptv-service), "…firestick" (→ /iptv-for-firestick),
 * "free iptv / free trial" (→ /iptv-free-trial), "4k iptv" (→ /4k-iptv), "iptv channels" (→ /channels).
 */

const homeFaqs = faqs.slice(0, 6);

// Title, description and focus keyword: lib/seo-pages.ts, editable in Admin → SEO
export const generateMetadata = seoMetadata("home");

const features = [
  {
    title: `${site.channelCount} live channels`,
    text: "US network and cable channels, local stations, premium movie channels and international packages, all in one app.",
  },
  {
    title: "Every game, every fight",
    text: "Pro and college football, basketball, baseball and hockey, plus fight nights. Sports channels are the first ones we keep stable.",
  },
  {
    title: "HD, Full HD and 4K",
    text: "Picture quality adapts to your connection, with 4K streams on the channels that broadcast in 4K.",
  },
  {
    title: "Servers built for game night",
    text: "Load-balanced servers with headroom for Sunday football and big fight nights, so the stream doesn't freeze when everyone tunes in.",
  },
  {
    title: "TV guide and catch-up",
    text: "See what's on now and next, and replay shows you missed on many channels.",
  },
  {
    title: "Real help on WhatsApp",
    text: "A person, not a bot, helps you install the app and log in. Most setups take about 10 minutes.",
  },
];

const channelGroups = [
  {
    title: "Sports",
    text: "Pro and college football, basketball, baseball, hockey, soccer, golf, tennis, racing and combat sports.",
  },
  {
    title: "Local & network TV",
    text: "Local stations and the big US networks, so you keep your local news, weather and primetime shows.",
  },
  {
    title: "News",
    text: "24/7 national, business and international news channels, live around the clock.",
  },
  {
    title: "Movies & entertainment",
    text: "Premium movie channels, entertainment and reality networks, and a library of movies and series on demand.",
  },
  {
    title: "Kids & family",
    text: "Cartoons, family movies, learning and nature channels for the whole household.",
  },
  {
    title: "International & Latino",
    text: "Spanish-language channels and packages from Latin America, Canada, the UK, Europe, Africa and Asia.",
  },
];

const devices = [
  "Samsung & LG Smart TV",
  "Android TV & Google TV",
  "iPhone, iPad & Apple TV",
  "Android phones & tablets",
  "MAG box",
  "Windows PC & Mac",
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div>
            <h1>IPTV Service for the USA</h1>
            <p className="hero-lead">
              Watch {site.channelCount} live channels, from football to fight nights, on your Firestick, Smart TV or phone.
              One IPTV service instead of your cable bill.
            </p>
            <div className="hero-actions">
              <OrderButton productId={trial.id} className="btn btn-primary">
                Start {trial.hours}-hour free trial
              </OrderButton>
              <Link href="#pricing" className="btn btn-ghost">
                See plans
              </Link>
            </div>
            <p className="hero-note">
              From {formatPrice(lowestMonthly)}/month · No contract, no auto-renewal · {site.refundDays}-day refund
            </p>
          </div>
          <Epg />
        </div>
      </section>

      <section className="section" aria-labelledby="why">
        <div className="wrap split">
          <div>
            <h2 id="why">Why people switch to our IPTV service</h2>
            <p className="muted">
              Most IPTV streaming services look the same on paper. The difference shows on a Sunday afternoon, when
              millions of viewers hit the servers at once. That&apos;s what we built for.
            </p>
            <p className="muted">
              Want the full picture in 4K? See what <PageLink to="fourK">4K IPTV</PageLink> looks like on our servers.
            </p>
          </div>
          <ul className="feature-list">
            {features.map((f) => (
              <li key={f.title}>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="pricing-title" id="pricing">
        <div className="wrap">
          <div className="section-intro">
            <h2 id="pricing-title">Simple plans, one payment</h2>
            <p>
              Every plan includes the same channels, quality and support. You pay once, from{" "}
              {formatPrice(plans[0].price)} for a month to {formatPrice(plans[plans.length - 1].price)} for a full
              year, which is just {formatPrice(lowestMonthly)} a month. Nothing renews on its own. Compare all options
              on our <PageLink to="pricing">pricing page</PageLink>.
            </p>
          </div>
          <Pricing headingLevel={3} />
        </div>
      </section>

      <section className="section" aria-labelledby="channels">
        <div className="wrap">
          <div className="section-intro">
            <h2 id="channels">IPTV in the USA: every channel you actually watch</h2>
            <p>
              We built the lineup around what US households watch: live sports, local stations, news and movies,
              plus international channels for every family. Browse the full{" "}
              <PageLink to="channels">IPTV channel list</PageLink>.
            </p>
          </div>
          <ul className="channel-grid">
            {channelGroups.map((g) => (
              <li key={g.title}>
                <h3>{g.title}</h3>
                <p>{g.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="devices">
        <div className="wrap split">
          <div>
            <h2 id="devices">Made for Firestick, works on everything</h2>
            <p className="muted">
              Most of our customers watch on an Amazon Fire TV Stick. It&apos;s cheap, plugs into any TV and runs
              every popular IPTV player. Here&apos;s how to set up <PageLink to="firestick">IPTV for Firestick</PageLink>{" "}
              in about 10 minutes.
            </p>
          </div>
          <div>
            <p>Your subscription also runs on:</p>
            <ul className="feature-list">
              {devices.map((d) => (
                <li key={d}>
                  <p>{d}</p>
                </li>
              ))}
            </ul>
            <div className="needs-box">
              <h3>What you need for smooth streaming</h3>
              <p>
                An internet connection of at least <strong>{site.minSpeedMbps} Mbps</strong>, ideally wired or on 5 GHz
                Wi-Fi. Each plan streams on {site.connections} device at a time. Below {site.minSpeedMbps} Mbps the
                picture can buffer, and we can&apos;t take responsibility for drops caused by a slower connection.
                Not sure about your speed? Use the free trial to test it on your own network.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="start">
        <div className="wrap">
          <div className="section-intro">
            <h2 id="start">Up and running in three steps</h2>
          </div>
          <ol className="steps is-row">
            <li>
              <h3>Pick a plan or the free trial</h3>
              <p>Choose your plan and your device. Pay with crypto on the site, or with card or PayPal on WhatsApp.</p>
            </li>
            <li>
              <h3>Get your login</h3>
              <p>We send your username, password and setup steps on WhatsApp, usually within minutes.</p>
            </li>
            <li>
              <h3>Install and watch</h3>
              <p>Install the player app, sign in and your channels load. Stuck? We walk you through it on WhatsApp.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="section" aria-labelledby="choose">
        <div className="wrap">
          <div className="prose">
            <h2 id="choose">How to choose between IPTV providers</h2>
            <p>
              There are hundreds of IPTV providers selling to US viewers, and the channel count on the sales page tells
              you very little. Before you pay any IPTV service provider, check these five things:
            </p>
            <ul>
              <li>
                <strong>A real trial.</strong> You should be able to test the service on your own device and your own
                internet before paying. Our <PageLink to="freeTrial">IPTV free trial</PageLink> gives you{" "}
                {trial.hours} hours of full access.
              </li>
              <li>
                <strong>Stability at peak time.</strong> Test it during a big game, not on a Tuesday morning. That&apos;s
                when weak servers freeze.
              </li>
              <li>
                <strong>Support you can reach.</strong> An email address that never answers is a red flag. Our support
                works on WhatsApp, where you can actually talk to someone.
              </li>
              <li>
                <strong>A refund promise.</strong> Serious IPTV service providers stand behind their product. Ours is a{" "}
                {site.refundDays}-day refund if the service doesn&apos;t work for you.
              </li>
              <li>
                <strong>No auto-renewal traps.</strong> You should decide when to renew. Our plans simply end.
              </li>
            </ul>
            <p>
              Comparing several IPTV services right now? Our guide to the{" "}
              <PageLink to="bestIptv">best IPTV service</PageLink> walks you through what to test, step by step.
            </p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="faq">
        <div className="wrap split">
          <div>
            <h2 id="faq">IPTV service FAQ</h2>
            <p className="muted">
              Something else on your mind? Send us a message on WhatsApp{site.supportHours ? `, ${site.supportHours}` : ""}.
              {" "}More answers on the <PageLink to="faq">FAQ page</PageLink>.
            </p>
          </div>
          <FaqList items={homeFaqs} />
        </div>
      </section>

      <CtaBand />

      <JsonLd data={[productSchema(), faqSchema(homeFaqs)]} />
    </>
  );
}
