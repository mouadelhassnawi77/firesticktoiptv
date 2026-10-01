import type { Metadata } from "next";
import QRCode from "qrcode";
import {
  LOCK_ATTEMPTS,
  LOCK_MINUTES,
  SESSION_POLICY,
  adminUsername,
  getSession,
  getTotpSecret,
  listEvents,
  listSessions,
} from "@/lib/auth";
import { newTotpSecret, otpauthUri } from "@/lib/totp";
import { revokeOthersAction, revokeSessionAction } from "../../actions";
import { fmtDateTime } from "@/components/admin/ui";
import { DisableTwoFa, EnableTwoFa } from "@/components/admin/TwoFaForms";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Security" };

const EVENT_LABELS: Record<string, { label: string; tone: "ok" | "bad" | "info" }> = {
  login_ok: { label: "Signed in", tone: "ok" },
  login_fail: { label: "Failed sign-in", tone: "bad" },
  locked: { label: "IP locked", tone: "bad" },
  logout: { label: "Signed out", tone: "info" },
  session_revoked: { label: "Device signed out", tone: "info" },
  sessions_revoked: { label: "Other devices signed out", tone: "info" },
  "2fa_on": { label: "2FA turned on", tone: "ok" },
  "2fa_off": { label: "2FA turned off", tone: "bad" },
  "2fa_off_fail": { label: "2FA off refused", tone: "bad" },
  order_deleted: { label: "Order deleted", tone: "info" },
};

/** "Chrome on macOS" from a user-agent string */
function device(ua: string | null) {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : /curl|python|bot|wget/i.test(ua)
              ? "Script or bot"
              : "Browser";
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} on ${os}` : browser;
}

export default async function SecurityPage() {
  const [current, secret, sessions, events] = await Promise.all([getSession(), getTotpSecret(), listSessions(), listEvents(60)]);
  const twoFa = Boolean(secret);
  const setupSecret = twoFa ? null : newTotpSecret();
  const uri = setupSecret ? otpauthUri(setupSecret, adminUsername || "admin", `${site.name} Admin`) : null;
  const qr = uri ? await QRCode.toString(uri, { type: "svg", margin: 1, width: 180, errorCorrectionLevel: "M" }) : null;
  const fails24 = events.filter((e) => e.event === "login_fail" && Date.now() - new Date(e.at).getTime() < 86_400_000).length;

  const checks = [
    {
      ok: true,
      title: "Username and password",
      text: "Stored only in Vercel environment variables. Not in the code, not in the database.",
    },
    {
      ok: twoFa,
      title: "Two-factor authentication",
      text: twoFa
        ? "Every sign-in needs a code from your authenticator app."
        : "Off. Turn it on below, then a stolen password alone is useless.",
    },
    { ok: true, title: "Brute-force lock", text: `${LOCK_ATTEMPTS} failed attempts lock that IP for ${LOCK_MINUTES} minutes.` },
    {
      ok: true,
      title: "Secure sessions",
      text: `Signed out after ${SESSION_POLICY.idleHours} hours without activity, ${SESSION_POLICY.maxDays} days at most. Changing the password in Vercel signs out every device.`,
    },
    {
      ok: true,
      title: "Hidden from Google",
      text: "The admin sends noindex headers, is blocked in robots.txt and cannot be embedded by other sites.",
    },
  ];

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Security</h1>
          <p className="page-sub">Who can get in, from where, and what happened.</p>
        </div>
        <span className={`score ${twoFa ? "is-ok" : "is-warn"}`}>{twoFa ? "Fully protected" : "2FA recommended"}</span>
      </div>

      <section className="panel sec-block" aria-labelledby="protections">
        <h2 id="protections">Protection</h2>
        <ul className="checklist">
          {checks.map((c) => (
            <li key={c.title} className={c.ok ? "is-ok" : "is-warn"}>
              <span className="check-ico" aria-hidden="true">
                {c.ok ? "✓" : "!"}
              </span>
              <span>
                <strong>{c.title}</strong>
                <span className="sub">{c.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="admin-grid is-detail">
        <section className="panel" aria-labelledby="twofa">
          <h2 id="twofa">Two-factor authentication (2FA)</h2>
          {twoFa ? (
            <>
              <p>
                <span className="badge badge-aktiviert">On</span> Sign-in asks for a 6-digit code from your authenticator
                app.
              </p>
              <p className="muted">
                Lost your phone? In Vercel change <code>ADMIN_PASSWORD</code> and redeploy. That resets 2FA and signs out
                every device.
              </p>
              <DisableTwoFa />
            </>
          ) : (
            <>
              <ol className="setup-steps">
                <li>
                  Install <strong>Google Authenticator</strong>, Microsoft Authenticator or Authy on your phone.
                </li>
                <li>In the app tap +, then scan this QR code.</li>
                <li>Type the 6-digit code the app shows and press Turn on 2FA.</li>
              </ol>
              <div className="twofa-setup">
                {/* QR generated on the server from a fresh random key; the key is saved only after a correct code */}
                <div className="qr" dangerouslySetInnerHTML={{ __html: qr ?? "" }} />
                <div>
                  <p className="muted" style={{ marginTop: 0 }}>
                    Can&apos;t scan? Enter this key in the app by hand:
                  </p>
                  <code className="secret">{setupSecret?.match(/.{1,4}/g)?.join(" ")}</code>
                  <p className="muted small">Reloading this page creates a new key. Keep it open until 2FA is on.</p>
                </div>
              </div>
              {setupSecret && <EnableTwoFa secret={setupSecret} />}
            </>
          )}
        </section>

        <section className="panel" aria-labelledby="sessions">
          <div className="panel-head">
            <h2 id="sessions">Signed-in devices</h2>
            {sessions.length > 1 && (
              <form action={revokeOthersAction}>
                <button type="submit" className="btn btn-ghost btn-sm btn-danger">
                  Sign out all others
                </button>
              </form>
            )}
          </div>
          <ul className="simple-list">
            {sessions.map((s) => {
              const isCurrent = s.token_hash === current?.token_hash;
              return (
                <li key={s.token_hash}>
                  <span>
                    <strong>{device(s.user_agent)}</strong>{" "}
                    {isCurrent && <span className="badge badge-aktiviert">This device</span>}
                    <span className="sub">IP {s.ip ?? "unknown"}</span>
                    <span className="sub">
                      Signed in {fmtDateTime(s.created_at)}, last active {fmtDateTime(s.last_seen)}
                    </span>
                  </span>
                  {!isCurrent && (
                    <form action={revokeSessionAction}>
                      <input type="hidden" name="hash" value={s.token_hash} />
                      <button type="submit" className="btn btn-ghost btn-sm btn-danger">
                        Sign out
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="panel" aria-labelledby="log">
        <div className="panel-head">
          <h2 id="log">Activity log</h2>
          <span className={fails24 ? "badge badge-storniert" : "muted"}>
            {fails24} failed sign-in{fails24 === 1 ? "" : "s"} in the last 24 hours
          </span>
        </div>
        {events.length === 0 ? (
          <p className="empty">Nothing logged yet. Sign-ins and failed attempts show up here.</p>
        ) : (
          <div className="table-scroll">
            <table className="orders mini">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Event</th>
                  <th scope="col">IP and place</th>
                  <th scope="col">Device</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => {
                  const meta = EVENT_LABELS[e.event] ?? { label: e.event, tone: "info" as const };
                  return (
                    <tr key={e.id}>
                      <td className="tabular">{fmtDateTime(e.at)}</td>
                      <td>
                        <span className={`ev ev-${meta.tone}`}>{meta.label}</span>
                      </td>
                      <td>
                        {e.ip ?? "–"}
                        {e.detail && <span className="sub">{e.detail}</span>}
                      </td>
                      <td>{device(e.user_agent)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
