import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import FaqList from "@/components/FaqList";
import CtaBand from "@/components/CtaBand";
import JsonLd from "@/components/JsonLd";
import { faqs } from "@/lib/faqs";
import { site, routes, whatsappLink } from "@/lib/site";
import { pageMetadata, faqSchema } from "@/lib/seo";

const path = routes.faq.href;

export const metadata: Metadata = pageMetadata({
  title: "IPTV FAQ: Plans, Devices, Setup & Refunds",
  description: `Answers about ${site.name}: how IPTV works, the free trial, prices, Firestick setup, internet speed, devices and refunds.`,
  path,
});

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
