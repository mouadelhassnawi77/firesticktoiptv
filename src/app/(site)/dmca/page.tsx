import LegalPage from "@/components/LegalPage";
import PageLink from "@/components/PageLink";
import { site, routes } from "@/lib/site";
import { seoMetadata } from "@/lib/seo-meta";

const path = routes.dmca.href;
const mailto = `mailto:${site.dmcaEmail}?subject=${encodeURIComponent("DMCA Notice")}`;

// Title, description and focus keyword: lib/seo-pages.ts, editable in Admin → SEO
export const generateMetadata = seoMetadata("dmca");

const sections = [
  { id: "policy", label: "Copyright policy" },
  { id: "notice", label: "How to file a DMCA notice" },
  { id: "review", label: "What happens next" },
  { id: "repeat", label: "Repeat infringers" },
  { id: "false", label: "False claims" },
  { id: "counter", label: "Counter-notification" },
  { id: "submit", label: "Submit a notice" },
];

export default function DmcaPage() {
  return (
    <LegalPage title="DMCA Copyright Policy" path={path}>
      <p className="meta-line">Last updated: {site.legalUpdated}</p>

      <nav aria-label="On this page" className="needs-box">
        <h2 style={{ marginTop: 0, fontSize: "var(--step-1)" }}>On this page</h2>
        <ul style={{ margin: 0 }}>
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>{s.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <h2 id="policy">Copyright policy</h2>
      <p>
        {site.name} respects the intellectual property rights of others and responds to notices of alleged copyright
        infringement that comply with the Digital Millennium Copyright Act (17 U.S.C. § 512). If you believe that content
        available through our website or service infringes a copyright you own or are authorized to represent, send us a
        notice as described below.
      </p>
      <p>
        When we receive a valid notice, we remove or disable access to the material identified in it. We take these
        notices seriously and review every one.
      </p>

      <h2 id="notice">How to file a DMCA notice</h2>
      <p>Your notice must be in writing and include all of the following:</p>
      <ol>
        <li>
          <strong>Your contact details:</strong> full legal name, postal address, phone number and email address.
        </li>
        <li>
          <strong>The copyrighted work:</strong> a description of the work you claim is infringed. If several works are
          covered by one notice, a representative list of them.
        </li>
        <li>
          <strong>The infringing material and where it is:</strong> enough information for us to find it, such as the URL
          on our website, the channel name, the title of the content, and the date and time it was available.
        </li>
        <li>
          <strong>Good-faith statement:</strong> a statement that you have a good-faith belief that the use of the
          material is not authorized by the copyright owner, its agent or the law.
        </li>
        <li>
          <strong>Accuracy statement:</strong> a statement that the information in your notice is accurate and, under
          penalty of perjury, that you are the copyright owner or authorized to act on the owner&apos;s behalf.
        </li>
        <li>
          <strong>Signature:</strong> your physical or electronic signature.
        </li>
      </ol>
      <p>Notices that are missing any of these elements may not be valid, and we may ask you to complete them.</p>

      <h2 id="review">What happens next</h2>
      <ol>
        <li>
          <strong>We confirm receipt</strong> of your notice by email.
        </li>
        <li>
          <strong>We review it</strong> for completeness and to identify the material.
        </li>
        <li>
          <strong>We act on valid notices</strong> within {site.dmcaResponse} by removing or disabling access to the
          identified material, and we let you know when it&apos;s done.
        </li>
        <li>
          <strong>We inform the affected party</strong> where applicable, so they can send a counter-notification if
          they believe the removal was a mistake.
        </li>
      </ol>

      <h2 id="repeat">Repeat infringers</h2>
      <p>
        In appropriate circumstances we terminate the accounts of customers who are repeat infringers, as described in
        our <PageLink to="terms">Terms of Service</PageLink>.
      </p>

      <h2 id="false">False claims</h2>
      <p>
        Under 17 U.S.C. § 512(f), anyone who knowingly and materially misrepresents that material is infringing, or that
        it was removed by mistake, may be liable for damages, including costs and attorneys&apos; fees. If you are not
        sure whether material infringes your copyright, consider speaking to a lawyer before sending a notice.
      </p>

      <h2 id="counter">Counter-notification</h2>
      <p>
        If material you provided was removed and you believe that was a mistake or misidentification, you can send a
        counter-notification to the same address. It must include:
      </p>
      <ol>
        <li>your name, address, phone number and email address;</li>
        <li>identification of the material that was removed and where it appeared before removal;</li>
        <li>
          a statement under penalty of perjury that you have a good-faith belief the material was removed as a result of
          mistake or misidentification;
        </li>
        <li>
          a statement that you consent to the jurisdiction of the federal district court for your address (or, if you
          are outside the United States, any judicial district in which {site.name} may be found), and that you will
          accept service of process from the person who sent the original notice;
        </li>
        <li>your physical or electronic signature.</li>
      </ol>
      <p>
        We forward valid counter-notifications to the original complainant. Unless they tell us within 10 to 14 business
        days that they have filed a court action, the material may be restored.
      </p>

      <div id="submit" className="needs-box">
        <h2 style={{ marginTop: 0 }}>Submit a notice</h2>
        <p>
          Send your DMCA notice or counter-notification by email to{" "}
          <a href={mailto}>
            <strong>{site.dmcaEmail}</strong>
          </a>
          . Please put <strong>DMCA Notice</strong> in the subject line so it reaches the right person fastest.
        </p>
        <a href={mailto} className="btn btn-primary">
          Email a DMCA notice
        </a>
        <p className="meta-line" style={{ marginTop: "1rem" }}>
          This address is only for copyright notices. For orders and support, see{" "}
          <PageLink to="contact">Contact</PageLink>.
        </p>
      </div>
    </LegalPage>
  );
}
