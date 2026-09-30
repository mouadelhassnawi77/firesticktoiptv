import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OrderProvider from "@/components/order/OrderProvider";
import { liveRoutes } from "@/lib/site";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

// Lives outside the (site) group, so header, footer and the order popup are added here directly
export default function NotFound() {
  const links = liveRoutes(["home", "pricing", "freeTrial", "firestick", "faq"]);
  return (
    <OrderProvider>
      <Header />
      <main id="content" className="wrap page-head" style={{ paddingBottom: "clamp(3rem, 7vw, 5rem)" }}>
        <h1>This page doesn’t exist</h1>
        <p className="lead">The link is outdated or mistyped. Try one of these:</p>
        <ul className="link-list" style={{ maxWidth: "28rem" }}>
          {links.map((r) => (
            <li key={r.href}>
              <Link href={r.href}>{r.label}</Link>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </OrderProvider>
  );
}
