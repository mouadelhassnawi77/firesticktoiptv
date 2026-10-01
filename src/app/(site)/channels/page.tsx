import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import CtaBand from "@/components/CtaBand";
import PageLink from "@/components/PageLink";
import OrderButton from "@/components/order/OrderButton";
import { channelGroups } from "@/lib/channels";
import { site, routes, whatsappLink } from "@/lib/site";
import { trial } from "@/lib/shop";
import { seoMetadata } from "@/lib/seo-meta";

/*
 * Keyword owner (P11): primary "iptv channels". Do not target "4k iptv" (→ /4k-iptv) or "iptv service" (→ /).
 */

const path = routes.channels.href;

// Title, description and focus keyword: lib/seo-pages.ts, editable in Admin → SEO
export const generateMetadata = seoMetadata("channels");

export default function ChannelsPage() {
  return (
    <>
      <div className="wrap">
        <div className="page-head">
          <Breadcrumbs items={[{ name: "Channel List", path }]} />
          <h1>IPTV Channels: What You Can Watch</h1>
          <p className="lead">
            {site.channelCount} IPTV channels built around what US households watch: every major sports league, local
            networks, 24/7 news, premium movies, kids and international channels. Here are the highlights by category.
          </p>
          <nav aria-label="Channel categories" className="hero-actions" style={{ marginBottom: 0 }}>
            {channelGroups.map((g) => (
              <a key={g.id} href={`#${g.id}`} className="btn btn-ghost btn-small">
                {g.title}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {channelGroups.map((g) => (
        <section key={g.id} className="section" aria-labelledby={g.id}>
          <div className="wrap split">
            <div>
              <h2 id={g.id}>{g.title}</h2>
              <p className="muted">{g.intro}</p>
            </div>
            <ul className="channel-grid">
              {g.channels.map((c) => (
                <li key={c}>
                  <p style={{ color: "var(--ink)", fontWeight: 600 }}>{c}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      <section className="section" aria-labelledby="more">
        <div className="wrap">
          <div className="prose">
            <h2 id="more">Looking for a specific channel?</h2>
            <p>
              This page shows highlights, not all {site.channelCount} channels. The fastest way to check your favorite
              channel is to see it with your own eyes: the{" "}
              <PageLink to="freeTrial">{`free ${trial.hours}-hour trial`}</PageLink> includes the full lineup. Or{" "}
              <a href={whatsappLink(`Hi ${site.supportName}, do you have this channel: `)} target="_blank" rel="noopener">
                ask us on WhatsApp
              </a>{" "}
              and we&apos;ll check it for you.
            </p>
            <p>
              Many sports and movie channels also stream in Ultra HD. See which ones on our{" "}
              <PageLink to="fourK">4K IPTV</PageLink> page, or compare <Link href={routes.pricing.href}>plans</Link>.
            </p>
            <p className="muted">
              Channel lineups change from time to time as channels are added, renamed or removed.
            </p>
          </div>
          <div className="hero-actions">
            <OrderButton productId={trial.id} className="btn btn-primary">
              Check the full lineup free
            </OrderButton>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
