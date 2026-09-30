import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { site, routes } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

const path = routes.privacy.href;
const hasAnalytics = !!process.env.NEXT_PUBLIC_GA_ID;

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description: `How ${site.name} collects, uses and protects your personal information.`,
  path,
  noindex: true,
});

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" path={path}>
      <p className="meta-line">Last updated: {site.legalUpdated}</p>

      <p>
        This policy explains what personal information {site.name} collects when you use this website, order a plan or
        request a free trial, and what we do with it. We only collect what we need to run your subscription, and we
        never sell your personal information.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Order details:</strong> your name, email address, WhatsApp number, the device you watch on, the plan
          you chose and your payment method.
        </li>
        <li>
          <strong>Crypto payments:</strong> the coin, amount and transaction ID (TXID) you send us.
        </li>
        <li>
          <strong>Messages:</strong> what you write to us on WhatsApp or by email.
        </li>
        {hasAnalytics && (
          <li>
            <strong>Usage data:</strong> pages visited, device and browser type and approximate location, collected by
            Google Analytics through cookies.
          </li>
        )}
      </ul>
      <p>
        We do not receive or store your card or PayPal details. Those payments are handled entirely by the payment
        provider.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>to create and deliver your subscription or free trial and send your login details,</li>
        <li>to provide setup help and customer support,</li>
        <li>to remind you before your plan ends,</li>
        <li>to prevent fraud and misuse, such as repeated free trials or shared logins,</li>
        {hasAnalytics && <li>to understand how visitors use the site and improve it.</li>}
      </ul>

      <h2>Who we share it with</h2>
      <p>We share personal information only with the services we need to run the business:</p>
      <ul>
        <li>WhatsApp (Meta), which carries our messages with you,</li>
        <li>our website host and database provider, which store order data securely,</li>
        <li>payment providers for card and PayPal payments,</li>
        {hasAnalytics && <li>Google, for website analytics,</li>}
        <li>authorities, if the law requires it.</li>
      </ul>
      <p>We do not sell or rent your personal information to anyone.</p>

      {hasAnalytics && (
        <>
          <h2>Cookies</h2>
          <p>
            We use Google Analytics cookies to measure site traffic. You can turn them off any time with &quot;Cookie
            settings&quot; in the footer of every page.
          </p>
        </>
      )}

      <h2>How long we keep it</h2>
      <p>
        We keep order information while your subscription is active and for up to 24 months after, so we can handle
        renewals, refunds and support questions. After that it is deleted, unless the law requires us to keep it longer.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask us at any time to see the personal information we hold about you, to correct it, or to delete it.
        Depending on where you live, for example in California, you may have additional rights under state law. We will
        not treat you differently for using them. Send your request to{" "}
        <a href={`mailto:${site.email}`}>{site.email}</a> and we will reply within 30 days.
      </p>

      <h2>Security</h2>
      <p>
        Order data is stored in an access-controlled database and sent over encrypted connections. No system is
        completely secure, but we limit access to the people who need it to serve you.
      </p>

      <h2>Children</h2>
      <p>This service is not directed at children under 13, and we do not knowingly collect their information.</p>

      <h2>Changes</h2>
      <p>If we change this policy, we update the date at the top of this page.</p>

      <h2>Contact</h2>
      <p>
        {site.legalName} · <a href={`mailto:${site.email}`}>{site.email}</a>
      </p>
    </LegalPage>
  );
}
