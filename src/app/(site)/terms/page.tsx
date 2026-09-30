import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import PageLink from "@/components/PageLink";
import { site, routes } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

const path = routes.terms.href;

export const metadata: Metadata = pageMetadata({
  title: "Terms of Service",
  description: `Terms of Service for ${site.name}: plans, payments, device use, internet requirements and support.`,
  path,
  noindex: true,
});

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" path={path}>
      <p className="meta-line">Last updated: {site.legalUpdated}</p>

      <p>
        These terms apply to every purchase and free trial on {site.url.replace(/^https?:\/\//, "")} (&quot;we&quot;,
        &quot;us&quot;, &quot;{site.name}&quot;). By ordering a plan or a trial you agree to them.
      </p>

      <h2>1. The service</h2>
      <p>
        We provide access to an IPTV streaming service that you watch through a third-party player app on your own
        device. The channel lineup and on-demand library can change over time as channels are added, removed or
        renamed. We don&apos;t guarantee that any specific channel or event will always be available.
      </p>

      <h2>2. Plans and payment</h2>
      <ul>
        <li>All plans are one-time payments for a fixed period (1, 3, 6 or 12 months). Prices are in US dollars.</li>
        <li>Plans do not renew automatically. To continue after your plan ends, you buy a new one.</li>
        <li>Your plan starts on the day we send your login details.</li>
        <li>
          We accept crypto, card and PayPal. Card and PayPal payments are processed through a secure payment link we
          send you. We never ask for your card details on WhatsApp.
        </li>
      </ul>

      <h2>3. Free trial</h2>
      <p>
        The free trial gives you full access for a limited time, at no cost and without payment details. It is limited
        to one trial per person, device and phone number. We may refuse or end a trial that is being misused.
      </p>

      <h2>4. Devices and fair use</h2>
      <ul>
        <li>
          Each plan allows {site.connections} active stream at a time. You may install the app on several devices, but
          only one may play at once.
        </li>
        <li>Your login is for you and your household. Sharing, reselling or publishing it is not allowed.</li>
        <li>
          We may suspend an account without refund if it is shared, resold or used on more devices at once than the
          plan allows.
        </li>
      </ul>

      <h2>5. Internet requirements</h2>
      <p>
        The service needs a stable internet connection of at least {site.minSpeedMbps} Mbps. We are not responsible for
        buffering, drops or poor quality caused by a slower connection, your home network, your device, or your
        internet provider. We will always help you troubleshoot on WhatsApp.
      </p>

      <h2>6. Refunds</h2>
      <p>
        You can ask for a refund within {site.refundDays} days of your purchase, as described in our{" "}
        <PageLink to="refund">Refund Policy</PageLink>.
      </p>

      <h2>7. Your responsibilities</h2>
      <p>
        You are responsible for your own device, player app and internet connection, and for using the service in line
        with the laws that apply where you live. You may not record, rebroadcast, resell or publicly show content from
        the service.
      </p>

      <h2>7a. Copyright and trademarks</h2>
      <p>
        We respond to copyright notices under our <PageLink to="dmca">DMCA Policy</PageLink>. We may remove or disable
        access to any content that is the subject of a valid notice, and we terminate accounts of repeat infringers in
        appropriate circumstances. Amazon, Fire TV and Firestick are trademarks of Amazon.com, Inc. or its affiliates.
        App and product names mentioned on this site belong to their owners; we are not affiliated with them.
      </p>

      <h2>8. Availability and liability</h2>
      <p>
        We work to keep the service running around the clock but cannot promise it will be uninterrupted or error-free.
        Short outages for maintenance or technical issues can happen. To the extent the law allows, our total liability
        for any claim is limited to the amount you paid for your current plan.
      </p>

      <h2>9. Changes to these terms</h2>
      <p>
        We may update these terms. The date at the top shows the latest version. Changes don&apos;t affect a plan you
        already paid for.
      </p>

      <h2>10. Contact</h2>
      <p>
        {site.legalName} · <a href={`mailto:${site.email}`}>{site.email}</a> · WhatsApp support. See also our{" "}
        <PageLink to="privacy">Privacy Policy</PageLink>.
      </p>
    </LegalPage>
  );
}
