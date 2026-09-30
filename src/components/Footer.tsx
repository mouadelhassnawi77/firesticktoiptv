import Link from "next/link";
import { LogoMark } from "./Logo";
import { site, liveRoutes, type RouteKey } from "@/lib/site";
import ConsentLink from "./ConsentLink";

/** Footer columns list only pages that are live (see routes in lib/site.ts). Empty columns are hidden. */
const columns: { title: string; keys: RouteKey[] }[] = [
  { title: "Service", keys: ["pricing", "freeTrial", "channels", "fourK", "bestIptv", "faq", "about", "contact"] },
  { title: "Firestick", keys: ["firestick", "smarters", "apps", "install", "notWorking"] },
  { title: "Help", keys: ["failedAuth"] },
  { title: "Legal", keys: ["terms", "privacy", "refund", "dmca"] },
];

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <Link href="/" className="brand" style={{ marginBottom: "0.75rem" }}>
              <LogoMark size={22} />
              {site.name}
            </Link>
            <p className="muted" style={{ fontSize: "0.9375rem" }}>
              IPTV service for the USA. Support on WhatsApp{site.supportHours ? `, ${site.supportHours}` : ""}.
            </p>
          </div>
          {columns.map((col) => {
            const links = liveRoutes(col.keys);
            const showConsent = col.title === "Legal" && !!process.env.NEXT_PUBLIC_GA_ID;
            if (!links.length && !showConsent) return null;
            return (
              <div key={col.title}>
                <h2>{col.title}</h2>
                <ul>
                  {links.map((r) => (
                    <li key={r.href}>
                      <Link href={r.href}>{r.label}</Link>
                    </li>
                  ))}
                  {showConsent && (
                    <li>
                      <ConsentLink />
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="footer-bottom">
          © {year} {site.legalName}. All prices in US dollars.
        </p>
        <p className="footer-bottom" style={{ marginTop: "0.5rem" }}>
          Amazon, Fire TV and Firestick are trademarks of Amazon.com, Inc. or its affiliates. Other product names are
          trademarks of their owners. {site.name} is not affiliated with or endorsed by any of them.
        </p>
      </div>
    </footer>
  );
}
