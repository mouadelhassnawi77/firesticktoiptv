import Breadcrumbs from "@/components/Breadcrumbs";
import CtaBand from "@/components/CtaBand";
import PageLink from "@/components/PageLink";
import { site, routes } from "@/lib/site";
import { trial } from "@/lib/shop";
import { seoMetadata } from "@/lib/seo-meta";

const path = routes.about.href;

// Title, description and focus keyword: lib/seo-pages.ts, editable in Admin → SEO
export const generateMetadata = seoMetadata("about");

const promises = [
  { title: "Try before you pay", text: `A free ${trial.hours}-hour trial with the full lineup, no card needed.` },
  { title: "No subscription traps", text: "One payment per plan. Nothing renews on its own, ever." },
  { title: "Money back if it doesn't work", text: `A ${site.refundDays}-day refund, no long argument.` },
  { title: "People, not tickets", text: "Support on WhatsApp from someone who helps you until it works." },
  { title: "Honest about limits", text: `We tell you upfront: you need ${site.minSpeedMbps} Mbps and one plan plays on ${site.connections} device at a time.` },
];

export default function AboutPage() {
  return (
    <>
      <div className="wrap">
        <div className="page-head">
          <Breadcrumbs items={[{ name: "About Us", path }]} />
          <h1>About {site.name}</h1>
          <p className="lead">
            We started {site.name} for one reason: watching TV in the US had become too expensive and too complicated.
            Cable bills kept climbing, and sports were split across a dozen apps.
          </p>
        </div>
      </div>

      <section className="section" aria-labelledby="what" style={{ borderTop: 0, paddingTop: 0 }}>
        <div className="wrap">
          <div className="prose">
            <h2 id="what">What we do</h2>
            <p>
              We run an IPTV service built for US viewers: live sports, local and network TV, news, movies and
              international channels in one app, on the devices people already own. Most of our customers watch on an
              Amazon Fire TV Stick, so that&apos;s where we focus our setup guides and support. Read more about{" "}
              <PageLink to="firestick">IPTV for Firestick</PageLink>.
            </p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="promise">
        <div className="wrap split">
          <div>
            <h2 id="promise">What you can count on</h2>
          </div>
          <ul className="feature-list">
            {promises.map((p) => (
              <li key={p.title}>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
