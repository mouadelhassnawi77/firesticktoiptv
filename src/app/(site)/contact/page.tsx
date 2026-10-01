import Breadcrumbs from "@/components/Breadcrumbs";
import PageLink from "@/components/PageLink";
import { site, routes, whatsappLink } from "@/lib/site";
import { seoMetadata } from "@/lib/seo-meta";

const path = routes.contact.href;

// Title, description and focus keyword: lib/seo-pages.ts, editable in Admin → SEO
export const generateMetadata = seoMetadata("contact");

export default function ContactPage() {
  return (
    <div className="wrap" style={{ paddingBottom: "clamp(3rem, 7vw, 5rem)" }}>
      <div className="page-head" style={{ paddingInline: 0 }}>
        <Breadcrumbs items={[{ name: "Contact", path }]} />
        <h1>Contact Us</h1>
        <p className="lead">
          The fastest way to reach us is WhatsApp. A real person answers, helps you set up your device and sorts out any
          problem with your subscription.
        </p>
      </div>

      <div className="split">
        <div className="needs-box" style={{ marginTop: 0 }}>
          <h2 style={{ fontSize: "var(--step-2)" }}>WhatsApp</h2>
          <p>Orders, free trials, setup help and support.{site.supportHours ? ` ${site.supportHours}.` : ""}</p>
          <a
            href={whatsappLink(`Hi ${site.supportName}, `)}
            target="_blank"
            rel="noopener"
            className="btn btn-primary"
          >
            Chat on WhatsApp
          </a>
        </div>
        <div className="prose">
          <h2 style={{ marginTop: 0 }}>Email</h2>
          <p>
            For privacy requests, refunds in writing or anything that isn&apos;t urgent:{" "}
            <a href={`mailto:${site.email}`}>{site.email}</a>
          </p>
          <h2>Before you write</h2>
          <ul>
            <li>Have your order number ready. It starts with US-.</li>
            <li>Tell us your device, for example Fire TV Stick 4K or Samsung TV.</li>
            <li>
              Buffering? Run a speed test on the device first. You need at least {site.minSpeedMbps} Mbps.
            </li>
          </ul>
          <p>
            Many answers are already on our <PageLink to="faq">FAQ page</PageLink>. Refund questions are covered in the{" "}
            <PageLink to="refund">refund policy</PageLink>.
          </p>
        </div>
      </div>
    </div>
  );
}
