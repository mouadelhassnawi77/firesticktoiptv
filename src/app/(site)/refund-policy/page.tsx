import LegalPage from "@/components/LegalPage";
import PageLink from "@/components/PageLink";
import { site, routes, whatsappLink } from "@/lib/site";
import { seoMetadata } from "@/lib/seo-meta";

const path = routes.refund.href;

// Title, description and focus keyword: lib/seo-pages.ts, editable in Admin → SEO
export const generateMetadata = seoMetadata("refund");

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund Policy" path={path}>
      <p className="meta-line">Last updated: {site.legalUpdated}</p>

      <h2>{site.refundDays}-day refund</h2>
      <p>
        You can ask for a full refund within {site.refundDays} days of your purchase in either of these cases:
      </p>
      <ul>
        <li>the service doesn&apos;t work for you and we can&apos;t fix it together, or</li>
        <li>you changed your mind and no longer want the subscription.</li>
      </ul>
      <p>
        The {site.refundDays} days start on the day you receive your login details. After {site.refundDays} days the
        purchase is final.
      </p>

      <h2>What is not covered</h2>
      <ul>
        <li>
          Problems caused by an internet connection slower than {site.minSpeedMbps} Mbps, or by an unstable home
          network. We&apos;re happy to help you troubleshoot, but a slow connection is not a service failure.
        </li>
        <li>
          Accounts suspended for breaking our <PageLink to="terms">Terms of Service</PageLink>, for example by sharing a
          login or streaming on more devices than your plan allows.
        </li>
        <li>The free trial, which costs nothing.</li>
      </ul>

      <h2>How to ask for a refund</h2>
      <ol>
        <li>
          Send us a message on{" "}
          <a href={whatsappLink(`Hi ${site.supportName}, I'd like a refund for my order.`)} target="_blank" rel="noopener">
            WhatsApp
          </a>{" "}
          or email <a href={`mailto:${site.email}`}>{site.email}</a> with your order number.
        </li>
        <li>Tell us briefly why. If it&apos;s a technical problem, we&apos;ll first offer to fix it with you.</li>
        <li>Once approved, your login is deactivated and the refund is sent.</li>
      </ol>

      <h2>How you get your money back</h2>
      <ul>
        <li>
          <strong>Card and PayPal:</strong> refunded to the same card or PayPal account, usually within 5–10 business
          days depending on your bank.
        </li>
        <li>
          <strong>Crypto:</strong> refunded in the same coin to a wallet address you give us. We refund the dollar amount
          you paid, converted at the rate on the day of the refund, minus the network fee.
        </li>
      </ul>

      <h2>No automatic renewal</h2>
      <p>
        Our plans never renew on their own, so you will never be charged again without choosing to buy a new plan.
      </p>

      <h2>Contact</h2>
      <p>
        {site.legalName} · <a href={`mailto:${site.email}`}>{site.email}</a> · WhatsApp support
      </p>
    </LegalPage>
  );
}
