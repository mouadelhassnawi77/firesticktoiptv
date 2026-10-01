import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import FaqList from "@/components/FaqList";
import CtaBand from "@/components/CtaBand";
import JsonLd from "@/components/JsonLd";
import PageLink from "@/components/PageLink";
import OrderButton from "@/components/order/OrderButton";
import type { Faq } from "@/lib/faqs";
import { site, formatPrice, routes } from "@/lib/site";
import { trial, lowestMonthly } from "@/lib/shop";
import { faqSchema } from "@/lib/seo";
import { seoMetadata } from "@/lib/seo-meta";

/*
 * Keyword owner (P12): primary "4k iptv", secondary "4k live iptv".
 * Do not target "iptv service" (→ /) or "iptv channels" (→ /channels).
 */

const path = routes.fourK.href;
const fourKSpeed = Math.max(site.minSpeedMbps, 25);

// Title, description and focus keyword: lib/seo-pages.ts, editable in Admin → SEO
export const generateMetadata = seoMetadata("fourK");

const needs = [
  { title: "A 4K TV", text: "Any 4K (UHD) TV. On an HD TV the picture is shown in HD." },
  {
    title: "A 4K streaming device",
    text: "Fire TV Stick 4K or 4K Max, Fire TV Cube, Apple TV 4K, a 4K Android / Google TV box, or a 4K Smart TV app.",
  },
  {
    title: `At least ${fourKSpeed} Mbps`,
    text: `4K needs more bandwidth than HD. For 4K we recommend ${fourKSpeed} Mbps or more, ideally over a cable or 5 GHz Wi-Fi.`,
  },
  { title: "A 4K channel", text: "4K is shown on channels and events that broadcast in 4K, marked in the channel list inside the app." },
];

const fourKFaqs: Faq[] = [
  {
    q: "Is every channel in 4K?",
    a: "No. 4K is available on the channels and events broadcast in 4K, mostly big sports and premium movies. All other channels stream in HD or Full HD.",
  },
  {
    q: "What internet speed do I need for 4K IPTV?",
    a: `We recommend at least ${fourKSpeed} Mbps for 4K. Our minimum for smooth HD is ${site.minSpeedMbps} Mbps.`,
  },
  {
    q: "Does 4K IPTV cost extra?",
    a: `No. 4K is included in every plan, from ${formatPrice(lowestMonthly)} a month on the yearly plan.`,
  },
  {
    q: "Which Firestick do I need for 4K?",
    a: "The Fire TV Stick 4K, the Fire TV Stick 4K Max or the Fire TV Cube. The basic Fire TV Stick and Lite only play HD.",
  },
];

export default function FourKPage() {
  return (
    <>
      <div className="wrap">
        <div className="page-head">
          <Breadcrumbs items={[{ name: "4K IPTV", path }]} />
          <h1>4K IPTV: Live Sports and Movies in Ultra HD</h1>
          <p className="lead">
            Watch the big game in four times the detail of Full HD. 4K IPTV is included in every plan, on the channels
            and events that broadcast in 4K, at no extra cost.
          </p>
          <div className="hero-actions">
            <OrderButton productId={trial.id} className="btn btn-primary btn-large">
              Test 4K free for {trial.hours} hours
            </OrderButton>
            <Link href={routes.pricing.href} className="btn btn-ghost">
              See plans
            </Link>
          </div>
        </div>
      </div>

      <section className="section" aria-labelledby="live">
        <div className="wrap">
          <div className="prose">
            <h2 id="live">What you can watch in 4K live</h2>
            <p>
              4K live IPTV makes the biggest difference where there&apos;s movement and detail: football, basketball,
              hockey, fight nights and nature documentaries. Our 4K lineup focuses on:
            </p>
            <ul>
              <li>live sports broadcasts and big events produced in 4K,</li>
              <li>premium movie channels and 4K titles in the on-demand library,</li>
              <li>documentary and nature channels.</li>
            </ul>
            <p>
              Every other channel streams in HD or Full HD, and the picture adapts to your connection so it keeps
              playing instead of freezing. Browse the full <PageLink to="channels">IPTV channel list</PageLink>.
            </p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="needs">
        <div className="wrap split">
          <div>
            <h2 id="needs">What you need for 4K IPTV</h2>
            <p className="muted">All four together. If one is missing, you&apos;ll see HD instead.</p>
          </div>
          <ul className="feature-list">
            {needs.map((n) => (
              <li key={n.title}>
                <h3>{n.title}</h3>
                <p>{n.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="fire">
        <div className="wrap">
          <div className="prose">
            <h2 id="fire">4K IPTV on Firestick</h2>
            <p>
              The Fire TV Stick 4K Max is the best-value 4K IPTV device: fast, with Wi-Fi 6E and full HDR support. Set
              your Firestick display to 4K in Settings → Display &amp; Sounds, and use a player that supports 4K
              playback. Full setup in our <PageLink to="firestick">IPTV for Firestick</PageLink> guide.
            </p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="faq">
        <div className="wrap split">
          <div>
            <h2 id="faq">4K IPTV questions</h2>
          </div>
          <FaqList items={fourKFaqs} />
        </div>
      </section>

      <CtaBand title="See the difference on your own TV" />

      <JsonLd data={faqSchema(fourKFaqs)} />
    </>
  );
}
