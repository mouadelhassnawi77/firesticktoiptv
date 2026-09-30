"use client";

import { OPEN_CONSENT } from "./Analytics";

/** Footer link to reopen the cookie choice (withdrawing must be as easy as consenting). */
export default function ConsentLink() {
  return (
    <button type="button" className="link-button" onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT))}>
      Cookie settings
    </button>
  );
}
