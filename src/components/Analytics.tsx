"use client";

import PageLink from "./PageLink";
import Script from "next/script";
import { useEffect, useState } from "react";

/**
 * Google Analytics 4 with a consent choice stored locally, changeable any time via "Cookie settings" in the footer.
 * MODE "opt-out" (US default): GA loads unless the visitor declines; no banner on first visit.
 * MODE "opt-in" (EU/UK): nothing loads and a banner asks first.
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const KEY = "consent-analytics";
export const OPEN_CONSENT = "open-consent-settings";
type Choice = "granted" | "denied" | null;
const MODE: "opt-in" | "opt-out" = "opt-out";

function removeGaCookies() {
  const host = location.hostname;
  const domains = ["", host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];
  for (const c of document.cookie.split(";")) {
    const name = c.split("=")[0].trim();
    if (!name.startsWith("_ga") && !name.startsWith("_gid")) continue;
    for (const d of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ""}`;
    }
  }
}

export default function Analytics() {
  const [choice, setChoice] = useState<Choice | "loading">("loading");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let saved: Choice = null;
    try {
      const v = localStorage.getItem(KEY);
      saved = v === "granted" || v === "denied" ? v : null;
    } catch {
      /* storage blocked: ask every visit */
    }
    setChoice(saved ?? (MODE === "opt-out" ? "granted" : null));
    setOpen(saved === null && MODE === "opt-in");
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_CONSENT, reopen);
    return () => window.removeEventListener(OPEN_CONSENT, reopen);
  }, []);

  if (!GA_ID) return null;

  function decide(value: "granted" | "denied") {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* ignore */
    }
    if (value === "denied" && choice === "granted") {
      // Withdrawal: stop GA and delete its cookies; reload so no script keeps running
      (window as unknown as Record<string, boolean>)[`ga-disable-${GA_ID}`] = true;
      removeGaCookies();
      location.reload();
      return;
    }
    setChoice(value);
    setOpen(false);
  }

  return (
    <>
      {choice === "granted" && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}');`}
          </Script>
        </>
      )}
      {open && choice !== "loading" && (
        <div className="consent" role="dialog" aria-labelledby="consent-title" aria-live="polite">
          <p id="consent-title" className="consent-title">
            Analytics cookies
          </p>
          <p>
            We use Google Analytics to understand how visitors use our site. It sets cookies and sends usage data to
            Google. You can change your choice any time via “Cookie settings” in the footer. More in our{" "}
            <PageLink to="privacy">privacy policy</PageLink>.
          </p>
          <div className="consent-actions">
            <button type="button" className="btn btn-ghost" onClick={() => decide("denied")}>
              Decline
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => decide("granted")}>
              Accept
            </button>
          </div>
        </div>
      )}
    </>
  );
}
