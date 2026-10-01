import Breadcrumbs from "@/components/Breadcrumbs";
import FaqList from "@/components/FaqList";
import CtaBand from "@/components/CtaBand";
import JsonLd from "@/components/JsonLd";
import { faqs } from "@/lib/faqs";
import { site, routes, whatsappLink } from "@/lib/site";
import { faqSchema } from "@/lib/seo";
import { seoMetadata } from "@/lib/seo-meta";

const path = routes.faq.href;

// Title, description and focus keyword: lib/seo-pages.ts, editable in Admin → SEO
export const generateMetadata = seoMetadata("faq");

export default function FaqPage() {
  return (
    <>
      <div className="wrap" style={{ paddingBottom: "clamp(3rem, 7vw, 5rem)" }}>
        <div className="page-head" style={{ paddingInline: 0 }}>
          <Breadcrumbs items={[{ name: "FAQ", path }]} />
          <h1>Frequently Asked Questions</h1>
          <p className="lead">
            Everything about our IPTV plans, the free trial, devices and setup. Can&apos;t find your answer?{" "}
            <a href={whatsappLink(`Hi ${site.supportName}, I have a question: `)} target="_blank" rel="noopener">
              Ask us on WhatsApp
            </a>
            .
          </p>
        </div>
        <FaqList items={faqs} />
      </div>
      <CtaBand />
      <JsonLd data={faqSchema(faqs)} />
    </>
  );
}
