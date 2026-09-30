import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import FaqList from "@/components/FaqList";
import JsonLd from "@/components/JsonLd";
import PageLink from "@/components/PageLink";
import Pricing from "@/components/Pricing";
import OrderButton from "@/components/order/OrderButton";
import type { Faq } from "@/lib/faqs";
import { site, formatPrice, routes } from "@/lib/site";
import { trial, plans, lowestMonthly } from "@/lib/shop";
import { pageMetadata, singleProductSchema, faqSchema } from "@/lib/seo";

/*
 * Keyword owner (silo plan, P02):
 *   primary:   "iptv free trial"
 *   secondary: "free iptv for firestick", "free iptv on firestick", "iptv firestick free",
 *              "iptv on firestick free", "iptv free for firestick"
 * Do NOT target here: "iptv service" (→ /), "iptv for firestick" (→ /iptv-for-firestick),
 * pricing/subscription terms (→ /pricing).
 */

const path = routes.freeTrial.href;
const title = `IPTV Free Trial (${trial.hours} Hours, No Card)`;
const description = `Get a free ${trial.hours}-hour IPTV trial with ${site.channelCount} channels incl. live sports. Works on Firestick & Smart TV. Login on WhatsApp in minutes.`;

export const metadata: Metadata = pageMetadata({ title, description, path });

const included = [
  { title: "The full channel list", text: `All ${site.channelCount} channels, the same lineup paying customers get. No cut-down trial package.` },
  { title: "Live sports", text: "Football, basketball, baseball, hockey and fight nights, so you can test the stream during a real game." },
  { title: "HD and 4K quality", text: "Every quality level your connection can handle, up to 4K where the channel broadcasts it." },
  { title: "TV guide and catch-up", text: "The same EPG and replay features you get with a plan." },
  { title: "Setup help", text: "We help you install the app and log in on WhatsApp if you get stuck." },
];

const trialFaqs: Faq[] = [
  {
    q: "Is the IPTV free trial really free?",
    a: `Yes. The ${trial.hours}-hour trial costs nothing and we don't ask for a card. When the ${trial.hours} hours are over, the login simply stops working. Nothing is charged and nothing renews.`,
  },
  {
    q: "How fast do I get my trial login?",
    a: "Usually within minutes during our support hours. Send the prepared WhatsApp message and we reply with your username, password and setup steps for your device.",
  },
  {
    q: "Can I get a free trial on my Firestick?",
    a: "Yes. Choose Amazon Firestick / Fire TV in the trial form and we send you the steps for the Fire TV Stick, Fire TV Stick 4K, 4K Max and Fire TV Cube.",
  },
  {
    q: "Can I get more than one free trial?",
    a: "One free trial per person, device and WhatsApp number. If something went wrong during your test, message us and we'll look into it.",
  },
  {
    q: "What happens after the trial ends?",
    a: `Nothing, unless you want to continue. If you liked it, pick a plan from ${formatPrice(plans[0].price)} for a month. Paid plans also come with a ${site.refundDays}-day refund.`,
  },
  {
    q: "Why is the picture buffering during my trial?",
    a: `Usually it's the connection. You need at least ${site.minSpeedMbps} Mbps. Restart your router and device, use a cable or 5 GHz Wi-Fi, and run a speed test on the TV itself. Still buffering? Tell us on WhatsApp and we'll check it with you.`,
  },
];

export default function FreeTrialPage() {
  return (
    <>
      <div className="wrap">
        <div className="page-head">
          <Breadcrumbs items={[{ name: "IPTV Free Trial", path }]} />
          <h1>IPTV Free Trial: {trial.hours} Hours, No Credit Card</h1>
          <p className="lead">
            Test our IPTV service on your own TV before you pay a cent. Get a free {trial.hours}-hour IPTV trial with
            all {site.channelCount} channels, including live sports, on your Firestick, Smart TV or phone.
          </p>
          <div className="hero-actions">
            <OrderButton productId={trial.id} className="btn btn-primary btn-large">
              Get my free trial on WhatsApp
            </OrderButton>
            <Link href="/#pricing" className="btn btn-ghost">
              See plans
            </Link>
          </div>
          <p className="hero-note">
            No card · No signup fee · Ends on its own after {trial.hours} hours · {site.connections} device
          </p>
        </div>
      </div>

      <section className="section" aria-labelledby="how">
        <div className="wrap">
          <div className="section-intro">
            <h2 id="how">How the free trial works</h2>
            <p>Three steps, usually done in less than 15 minutes.</p>
          </div>
          <ol className="steps is-row">
            <li>
              <h3>Request your trial</h3>
              <p>
                Tap the free trial button, enter your name, email and WhatsApp number, and choose your device. WhatsApp
                opens with your request ready to send.
              </p>
            </li>
            <li>
              <h3>Get your login</h3>
              <p>We reply on WhatsApp with your username, password and the setup steps for your device.</p>
            </li>
            <li>
              <h3>Watch for {trial.hours} hours</h3>
              <p>Install the player app, sign in and test everything. The trial stops by itself, nothing to cancel.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="section" aria-labelledby="included">
        <div className="wrap split">
          <div>
            <h2 id="included">What&apos;s included in your trial</h2>
            <p className="muted">
              A trial only helps you decide if it shows you the real thing. That&apos;s why you get the complete
              service, not a demo.
            </p>
          </div>
          <ul className="feature-list">
            {included.map((f) => (
              <li key={f.title}>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="firestick">
        <div className="wrap">
          <div className="prose">
            <h2 id="firestick">Looking for free IPTV on Firestick?</h2>
            <p>
              Search for free IPTV for Firestick and you&apos;ll find public playlists and unknown apps. Most of them
              stop working within days, freeze during live games, and some come bundled with ads or malware you
              don&apos;t want on the device connected to your home network.
            </p>
            <p>
              The safer way to get IPTV on Firestick free is a real trial from a real provider. You install a
              trusted player app, test the full service for {trial.hours} hours, and only pay if it works for you.
              Choose <strong>Amazon Firestick / Fire TV</strong> in the trial form and we send the setup steps for
              your exact model.
            </p>
            <p>
              New to the Fire TV Stick? Our guide to <PageLink to="firestick">IPTV for Firestick</PageLink> covers the
              whole setup, and the <PageLink to="smarters">IPTV Smarters Pro on Firestick</PageLink> guide walks you
              through the most popular player app.
            </p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="test">
        <div className="wrap">
          <div className="prose">
            <h2 id="test">How to get the most out of your {trial.hours} hours</h2>
            <p>A trial is only useful if you test the things that matter. We recommend this:</p>
            <ol>
              <li>
                <strong>Check your speed first.</strong> Run a speed test on the TV or Firestick itself. You need at
                least {site.minSpeedMbps} Mbps. Below that, buffering comes from the connection, not the service.
              </li>
              <li>
                <strong>Watch during prime time.</strong> Open a big game or a busy channel in the evening. That&apos;s
                when weak services fall apart.
              </li>
              <li>
                <strong>Try the channels you actually watch.</strong> Your local stations, your team, your news.
              </li>
              <li>
                <strong>Switch channels fast.</strong> Good IPTV changes channels in a second or two.
              </li>
              <li>
                <strong>Ask us something.</strong> Send a question on WhatsApp and see how fast support answers.
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="after">
        <div className="wrap">
          <div className="section-intro">
            <h2 id="after">Liked it? Keep watching</h2>
            <p>
              When your trial ends, pick the plan that fits. Every plan has the same channels and quality. The yearly
              plan is the best value at just {formatPrice(lowestMonthly)} a month.
            </p>
          </div>
          <Pricing headingLevel={3} />
          <p className="muted" style={{ marginTop: "1.5rem" }}>
            One-time payment, no auto-renewal, {site.refundDays}-day refund. Full details on the{" "}
            <PageLink to="pricing">pricing page</PageLink>.
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="faq">
        <div className="wrap split">
          <div>
            <h2 id="faq">Free trial questions</h2>
            <p className="muted">Anything else? Message us on WhatsApp.</p>
          </div>
          <FaqList items={trialFaqs} />
        </div>
      </section>

      <section className="cta-band">
        <div className="wrap">
          <h2>Test it tonight, decide tomorrow</h2>
          <p>Your free {trial.hours}-hour login is one WhatsApp message away.</p>
          <div className="hero-actions">
            <OrderButton productId={trial.id} className="btn btn-primary">
              Start my free trial
            </OrderButton>
          </div>
        </div>
      </section>

      <JsonLd data={[singleProductSchema(trial, `${site.name} IPTV Free Trial`, description), faqSchema(trialFaqs)]} />
    </>
  );
}
