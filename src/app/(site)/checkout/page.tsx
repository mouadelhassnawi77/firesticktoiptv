import type { Metadata } from "next";
import CheckoutClient from "@/components/order/CheckoutClient";

// Checkout stays out of the index and the sitemap
export const metadata: Metadata = {
  title: "Pay with crypto",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <div className="wrap" style={{ paddingBottom: "clamp(3rem, 7vw, 5rem)" }}>
      <div className="page-head" style={{ paddingInline: 0 }}>
        <h1>Pay with crypto</h1>
        <p className="lead">Check your order, place it and send the amount shown.</p>
      </div>
      <CheckoutClient />
    </div>
  );
}
