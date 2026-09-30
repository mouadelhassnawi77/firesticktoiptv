import "./consent.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import OrderProvider from "@/components/order/OrderProvider";
import Analytics from "@/components/Analytics";
import { organizationSchema, websiteSchema } from "@/lib/seo";

/** Public pages: header, footer, order popup and Organization schema. The admin has its own layout. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#content" className="skip-link">
        Skip to content
      </a>
      <OrderProvider>
        <Header />
        <main id="content">{children}</main>
        <Footer />
      </OrderProvider>
      <JsonLd data={[organizationSchema(), websiteSchema()]} />
      <Analytics />
    </>
  );
}
